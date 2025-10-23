import { NextRequest, NextResponse } from 'next/server';
import { dictionaryScraper, validateWordDataCompleteness } from '@/lib/dictionary';
import { db } from '@/lib/db';
import { WordDefinitionData } from '@/types/learning';
import type { WordDataToSave } from '@/lib/dictionary';

/**
 * 将复杂对象转换为 Prisma 可接受的 JsonValue 类型
 * 修复：优化数据转换逻辑，确保复杂数据结构在转换过程中不丢失信息
 */
function convertToPrismaJson(data: unknown) {
  if (data === null || data === undefined) {
    return null;
  }

  try {
    // 修复：添加更安全的数据转换逻辑
    // 1. 处理特殊值（NaN, Infinity, -Infinity）
    const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        return null; // 将 NaN 和 Infinity 转换为 null
      }
      // 2. 处理函数类型（不应该存在，但以防万一）
      if (typeof value === 'function') {
        return undefined; // 移除函数类型
      }
      // 3. 处理循环引用
      if (typeof value === 'object' && value !== null) {
        if (value.constructor === Object || Array.isArray(value)) {
          return value; // 普通对象或数组，继续处理
        }
        // 其他类型的对象（如 Date, RegExp 等）转换为字符串
        return value.toString();
      }
      return value;
    }));
    
    // 4. 验证转换后的数据
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] 数据转换完成，验证结果:', {
        originalType: typeof data,
        resultType: typeof sanitizedData,
        isArray: Array.isArray(sanitizedData),
        keys: sanitizedData && typeof sanitizedData === 'object' ? Object.keys(sanitizedData) : []
      });
    }
    
    return sanitizedData;
  } catch (error) {
    console.error('[ERROR] 转换对象为 Prisma JSON 时出错:', error);
    console.error('[ERROR] 转换失败的数据类型:', typeof data);
    console.error('[ERROR] 转换失败的数据:', data);
    
    // 修复：提供更好的错误恢复机制
    try {
      // 尝试简单的字符串转换作为后备方案
      return {
        _error: '数据转换失败',
        _originalType: typeof data,
        _originalString: String(data),
        _timestamp: new Date().toISOString()
      };
    } catch (fallbackError) {
      console.error('[ERROR] 后备转换方案也失败:', fallbackError);
      return null;
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const word = searchParams.get('word');
  const type = searchParams.get('type') as 'all' | 'authoritative' | 'bilingual' | 'english' || 'all';
  const test = searchParams.get('test') === 'true'; // 测试模式，分析网站结构

  if (!word && !test) {
    return NextResponse.json(
      { error: '请提供要查询的单词' },
      { status: 400 }
    );
  }

  // 验证type参数
  const validTypes = ['all', 'authoritative', 'bilingual', 'english'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: '无效的释义类型，支持的类型: all, authoritative, bilingual, english' },
      { status: 400 }
    );
  }

  try {
    if (test) {
      // 测试模式：分析网站结构
      const structure = await dictionaryScraper.testWebsiteStructure(word || undefined);
      return NextResponse.json({
        success: true,
        mode: 'test',
        word: word || 'hello',
        data: structure
      });
    } else {
      // 正常模式：爬取单词数据
      // 首先检查数据库缓存（优先从新表结构查询）
      try {
        const wordData = await getWordFromTables(word!.toLowerCase());
        
        if (wordData) {
          // 验证数据完整性
          const validation = validateWordDataCompleteness(wordData);
          console.log(`单词 ${word} 数据验证结果:`, validation);
          
          // 修复：如果数据完整或部分有效，则直接返回
          if (validation.isComplete || validation.isPartiallyValid) {
            // 如果数据完整或部分有效，直接返回
            console.log(`从新表结构中获取${validation.isComplete ? '完整' : '部分有效'}单词数据: ${word}`);
            const response = {
              success: true,
              word: word!,
              requestedType: type,
              data: wordData
            };
            
            // 如果不是完整数据，添加警告信息
            if (!validation.isComplete) {
              (response as {
                success: boolean;
                word: string;
                requestedType: string;
                data: unknown;
                _incompleteDataWarning?: {
                  missingFields: string[];
                  issues: string[];
                };
              })._incompleteDataWarning = {
                missingFields: validation.missingFields,
                issues: validation.issues
              };
            }
            
            return NextResponse.json(response);
          } else {
            // 如果数据无效，记录日志并继续执行爬虫逻辑
            console.log(`单词 ${word} 数据无效，缺失字段: ${validation.missingFields.join(', ')}`);
            console.log(`单词 ${word} 数据问题: ${validation.issues.join(', ')}`);
          }
        }
        
        // 检查单词是否存在但没有有效数据（空记录）
        const existingWord = await db.word.findUnique({
          where: { wordText: word!.toLowerCase() }
        });
        
        if (existingWord) {
          // 如果新表结构中没有数据，尝试从JSON字段获取
          if (existingWord.definitionData) {
            // 验证JSON缓存数据的完整性
            const validation = validateWordDataCompleteness(existingWord.definitionData as WordDataToSave);
            console.log(`单词 ${word} JSON缓存数据验证结果:`, validation);
            
            // 修复：如果数据完整或部分有效，则返回缓存数据
            if (validation.isComplete || validation.isPartiallyValid) {
              // 如果JSON缓存数据完整或部分有效，返回缓存数据
              console.log(`从JSON缓存中获取${validation.isComplete ? '完整' : '部分有效'}单词数据: ${word}`);
              const response = {
                success: true,
                word: word!,
                requestedType: type,
                data: existingWord.definitionData
              };
              
              // 如果不是完整数据，添加警告信息
              if (!validation.isComplete) {
                (response as {
                  success: boolean;
                  word: string;
                  requestedType: string;
                  data: unknown;
                  _incompleteDataWarning?: {
                    missingFields: string[];
                    issues: string[];
                  };
                })._incompleteDataWarning = {
                  missingFields: validation.missingFields,
                  issues: validation.issues
                };
              }
              
              return NextResponse.json(response);
            } else {
              // 如果JSON缓存数据无效，记录日志并继续执行爬虫逻辑
              console.log(`单词 ${word} JSON缓存数据无效，缺失字段: ${validation.missingFields.join(', ')}`);
              console.log(`单词 ${word} JSON缓存数据问题: ${validation.issues.join(', ')}`);
            }
          } else {
            console.log(`单词 ${word} 存在但无有效数据，将重新爬取`);
          }
        }
      } catch (dbError) {
        console.error('查询数据库缓存时出错:', dbError);
        // 继续执行爬虫逻辑，不中断请求
      }

      // 如果缓存不存在或数据不完整，执行爬虫
      console.log(`[DEBUG] 开始爬取单词: ${word}, 类型: ${type}`);
      const result = await dictionaryScraper.scrapeWord(word!, type);
      
      if (result.success && result.data) {
        // 验证新爬取的数据完整性
        const validation = validateWordDataCompleteness(result.data);
        console.log(`[DEBUG] 新爬取的单词 ${word} 数据验证结果:`, validation);
        
        // 修复：只有当数据部分有效或完整时才保存到数据库
        if (validation.isPartiallyValid || validation.isComplete) {
          // 将爬取结果存储到数据库（同时保存到JSON和新表结构）
          try {
            console.log(`[DEBUG] 开始保存爬取结果到数据库`);
            
            // 保存到JSON字段（兼容性）
            console.log(`[DEBUG] 步骤1: 保存到JSON字段`);
            await db.word.upsert({
              where: { wordText: word!.toLowerCase() },
              update: {
                definitionData: convertToPrismaJson(result.data),
                updatedAt: new Date()
              },
              create: {
                wordText: word!.toLowerCase(),
                definitionData: convertToPrismaJson(result.data)
              }
            });
            console.log(`[DEBUG] JSON字段保存完成`);
            
            // 保存到新表结构
            console.log(`[DEBUG] 步骤2: 保存到新表结构`);
            await dictionaryScraper.saveWordDataToTables(word!, result.data);
            console.log(`[DEBUG] 新表结构保存完成`);
            
            console.log(`[DEBUG] 单词 ${word} 已成功缓存到数据库（JSON和新表结构）`);
          } catch (cacheError) {
            console.error(`[ERROR] 缓存单词数据时出错:`, cacheError);
            console.error(`[ERROR] 缓存错误详情:`, {
              name: cacheError instanceof Error ? cacheError.name : 'Unknown',
              message: cacheError instanceof Error ? cacheError.message : 'Unknown error',
              stack: cacheError instanceof Error ? cacheError.stack : undefined
            });
            // 不影响返回结果，只记录错误
          }
        } else {
          console.log(`[WARNING] 单词 ${word} 数据无效，不保存到数据库`);
        }
        
        // 如果新爬取的数据不完整，添加警告信息
        if (!validation.isComplete) {
          (result.data as WordDefinitionData & { _incompleteDataWarning?: { missingFields: string[]; issues: string[] } })._incompleteDataWarning = {
            missingFields: validation.missingFields,
            issues: validation.issues
          };
          console.log(`警告: 新爬取的单词 ${word} 数据${validation.isPartiallyValid ? '部分有效' : '无效'}`);
        }
        
        return NextResponse.json(result);
      } else {
        return NextResponse.json(
          result,
          { status: 500 }
        );
      }
    }
  } catch (error) {
    // 修复：改进错误处理机制，提供更详细的错误信息
    console.error('API路由处理错误:', error);
    
    // 记录详细错误信息
    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      word,
      type,
      timestamp: new Date().toISOString()
    };
    
    console.error('[ERROR] API错误详情:', errorDetails);
    
    // 根据错误类型返回不同的状态码和消息
    let statusCode = 500;
    let errorMessage = '服务器内部错误';
    
    if (error instanceof Error) {
      // 网络相关错误
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        statusCode = 503;
        errorMessage = '词典服务暂时不可用，请稍后重试';
      }
      // 超时错误
      else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        statusCode = 408;
        errorMessage = '请求超时，请稍后重试';
      }
      // 数据库错误
      else if (error.message.includes('database') || error.message.includes('Prisma')) {
        statusCode = 503;
        errorMessage = '数据库服务暂时不可用，请稍后重试';
      }
      // 解析错误
      else if (error.message.includes('parse') || error.message.includes('JSON')) {
        statusCode = 500;
        errorMessage = '数据解析错误，请联系管理员';
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        word,
        type,
        // 开发环境下提供详细错误信息
        ...(process.env.NODE_ENV === 'development' && {
          errorDetails: errorDetails
        })
      },
      { status: statusCode }
    );
  }
}

// 从新表结构中获取单词数据
async function getWordFromTables(wordText: string): Promise<WordDefinitionData | null> {
  try {
    console.log(`查询单词: ${wordText}`);
    // 先获取单词基本信息
    const word = await db.word.findUnique({
      where: { wordText: wordText.toLowerCase() }
    });

    console.log(`查询结果:`, word);
    
    if (!word) {
      console.log(`单词 ${wordText} 在数据库中不存在，返回 null`);
      return null;
    }

    // 分别获取关联数据
    const pronunciations = await db.$queryRaw`
      SELECT * FROM WordPronunciations WHERE word_id = ${word.id}
    `;

    const definitions = await db.$queryRaw`
      SELECT * FROM WordDefinitions WHERE word_id = ${word.id} ORDER BY type, \`order\`
    `;

    const sentences = await db.$queryRaw`
      SELECT * FROM WordSentences WHERE word_id = ${word.id} ORDER BY \`order\`
    `;

    const wordForms = await db.$queryRaw`
      SELECT * FROM WordForms WHERE word_id = ${word.id}
    `;

    // 获取释义例句和习语
    const definitionExamples = await db.$queryRaw`
      SELECT * FROM DefinitionExamples WHERE definition_id IN (
        SELECT id FROM WordDefinitions WHERE word_id = ${word.id}
      ) ORDER BY definition_id, \`order\`
    `;

    const definitionIdioms = await db.$queryRaw`
      SELECT * FROM DefinitionIdioms WHERE definition_id IN (
        SELECT id FROM WordDefinitions WHERE word_id = ${word.id}
      ) ORDER BY definition_id, \`order\`
    `;

    const idiomExamples = await db.$queryRaw`
      SELECT * FROM IdiomExamples WHERE idiom_id IN (
        SELECT id FROM DefinitionIdioms WHERE definition_id IN (
          SELECT id FROM WordDefinitions WHERE word_id = ${word.id}
        )
      ) ORDER BY idiom_id, \`order\`
    `;

    // 组装数据
    const wordData = {
      ...word,
      pronunciations,
      definitions,
      sentences,
      wordForms,
      definitionExamples,
      definitionIdioms,
      idiomExamples
    };

    // 将表结构数据转换为原有JSON格式
    return convertTablesToJson(wordData as Parameters<typeof convertTablesToJson>[0]);
  } catch (error) {
    console.error('从新表结构获取单词数据时出错:', error);
    return null;
  }
}

// 将表结构数据转换为JSON格式
function convertTablesToJson(word: {
  pronunciation?: string | null;
  pronunciations?: unknown[];
  definitions?: unknown[];
  sentences?: unknown[];
  wordForms?: unknown[];
  definitionExamples?: unknown[];
  definitionIdioms?: unknown[];
  idiomExamples?: unknown[];
}): WordDefinitionData | null {
  // 检查是否有任何有效数据
  const hasValidData =
    (word.pronunciations && word.pronunciations.length > 0) ||
    (word.definitions && word.definitions.length > 0) ||
    (word.sentences && word.sentences.length > 0) ||
    (word.wordForms && word.wordForms.length > 0) ||
    (word.definitionExamples && word.definitionExamples.length > 0) ||
    (word.definitionIdioms && word.definitionIdioms.length > 0) ||
    (word.idiomExamples && word.idiomExamples.length > 0);

  if (!hasValidData) {
    console.log('没有找到有效数据，返回 null');
    return null;
  }

  const result: WordDefinitionData = {
    pronunciation: word.pronunciation || undefined,
    definitions: {
      basic: [],
      web: []
    },
    pronunciationData: {},
    sentences: [],
    authoritativeDefinitions: [],
    bilingualDefinitions: [],
    englishDefinitions: [],
    wordForms: []
  };

  // 处理发音数据
  if (word.pronunciations && word.pronunciations.length > 0) {
    word.pronunciations.forEach((pron) => {
      const typedPron = pron as { type: string; phonetic: string; audioUrl: string };
      if (typedPron.type === 'american') {
        result.pronunciationData!.american = {
          phonetic: typedPron.phonetic,
          audioUrl: typedPron.audioUrl
        };
      } else if (typedPron.type === 'british') {
        result.pronunciationData!.british = {
          phonetic: typedPron.phonetic,
          audioUrl: typedPron.audioUrl
        };
      }
    });
  }

  // 处理释义数据
  if (word.definitions && word.definitions.length > 0) {
    word.definitions.forEach((def) => {
      const typedDef = def as {
        type: string;
        partOfSpeech?: string;
        meaning?: string;
        id?: number;
        order?: number;
        linkedWords?: string;
      };
      if (typedDef.type === 'basic') {
        result.definitions!.basic!.push({
          partOfSpeech: typedDef.partOfSpeech || '',
          meaning: typedDef.meaning || ''
        });
      } else if (typedDef.type === 'web') {
        result.definitions!.web!.push({
          meaning: typedDef.meaning || ''
        });
      } else if (typedDef.type === 'authoritative') {
        const authDef: {
          partOfSpeech: string;
          definitions: Array<{
            number: number;
            chineseMeaning: string;
            englishMeaning: string;
          }>;
          idioms?: Array<{
            number: number;
            title: string;
            meaning: string;
            examples?: Array<{
              english: string;
              chinese: string;
            }>;
          }>;
        } = {
          partOfSpeech: typedDef.partOfSpeech || '',
          definitions: []
        };

        // 处理释义条目
        const examples = word.definitionExamples?.filter((ex) => {
          const typedEx = ex as { definitionId: number; order: number; chinese: string; english: string };
          return typedEx.definitionId === typedDef.id;
        });
        if (examples && examples.length > 0) {
          examples.forEach((example) => {
            const typedExample = example as { definitionId: number; order: number; chinese: string; english: string };
            authDef.definitions.push({
              number: typedExample.order,
              chineseMeaning: typedExample.chinese,
              englishMeaning: typedExample.english
            });
          });
        }

        // 处理习语
        const idioms = word.definitionIdioms?.filter((id) => {
          const typedId = id as { definitionId: number; id: number; title: string; meaning: string };
          return typedId.definitionId === typedDef.id;
        });
        if (idioms && idioms.length > 0) {
          authDef.idioms = [];
          idioms.forEach((idiom) => {
            const typedIdiom = idiom as { definitionId: number; id: number; title: string; meaning: string; order: number };
            const idiomItem: {
              number: number;
              title: string;
              meaning: string;
              examples?: Array<{
                english: string;
                chinese: string;
              }>;
            } = {
              number: typedIdiom.order,
              title: typedIdiom.title,
              meaning: typedIdiom.meaning
            };

            // 处理习语例句
            const idiomExamples = word.idiomExamples?.filter((ex) => {
              const typedEx = ex as { idiomId: number; english: string; chinese: string };
              return typedEx.idiomId === typedIdiom.id;
            });
            if (idiomExamples && idiomExamples.length > 0) {
              idiomItem.examples = idiomExamples.map((ex) => {
                const typedEx = ex as { idiomId: number; english: string; chinese: string };
                return {
                  english: typedEx.english,
                  chinese: typedEx.chinese
                };
              });
            }

            authDef.idioms!.push(idiomItem);
          });
        }

        result.authoritativeDefinitions!.push(authDef);
      } else if (typedDef.type === 'bilingual') {
        const bilDef: {
          partOfSpeech: string;
          definitions: Array<{
            number: number;
            meaning: string;
          }>;
        } = {
          partOfSpeech: typedDef.partOfSpeech || '',
          definitions: []
        };

        const examples = word.definitionExamples?.filter((ex) => {
          const typedEx = ex as { definitionId: number; order: number; chinese: string; english: string };
          return typedEx.definitionId === typedDef.id;
        });
        if (examples && examples.length > 0) {
          examples.forEach((example) => {
            const typedExample = example as { definitionId: number; order: number; chinese: string; english: string };
            bilDef.definitions.push({
              number: typedExample.order,
              meaning: typedExample.chinese
            });
          });
        }

        result.bilingualDefinitions!.push(bilDef);
      } else if (typedDef.type === 'english') {
        const engDef: {
          partOfSpeech: string;
          definitions: Array<{
            number: number;
            meaning: string;
            linkedWords?: string[];
          }>;
        } = {
          partOfSpeech: typedDef.partOfSpeech || '',
          definitions: []
        };

        if (typedDef.meaning) {
          engDef.definitions.push({
            number: typedDef.order || 0,
            meaning: typedDef.meaning,
            linkedWords: typedDef.linkedWords ? JSON.parse(typedDef.linkedWords) : undefined
          });
        }

        result.englishDefinitions!.push(engDef);
      }
    });
  }

  // 处理例句数据
  if (word.sentences && word.sentences.length > 0) {
    result.sentences = word.sentences.map((sentence) => {
      const typedSentence = sentence as { order: number; english: string; chinese: string; audioUrl?: string; source?: string };
      return {
        number: typedSentence.order,
        english: typedSentence.english,
        chinese: typedSentence.chinese,
        audioUrl: typedSentence.audioUrl,
        source: typedSentence.source
      };
    });
  }

  // 处理词形变化
  if (word.wordForms && word.wordForms.length > 0) {
    result.wordForms = word.wordForms.map((form) => {
      const typedForm = form as { formType: string; formWord: string };
      return {
        form: typedForm.formType,
        word: typedForm.formWord
      };
    });
  }

  return result;
}