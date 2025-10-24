import { NextRequest, NextResponse } from 'next/server';
import { dictionaryScraper, validateWordDataCompleteness } from '@/lib/dictionary';
import { db } from '@/lib/db';
import { WordDefinitionData } from '@/types/learning';
import type { WordDataAssembled } from './types';

/**
 * 轮询等待函数：等待单词数据处理完成
 * @param wordText 单词文本
 * @param maxWaitTime 最大等待时间（毫秒）
 * @param interval 轮询间隔（毫秒）
 * @returns 处理结果或null
 */
async function waitForWordCompletion(
  wordText: string,
  maxWaitTime: number = 10000,
  interval: number = 500
): Promise<WordDefinitionData | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // 查询当前状态
      const word = await db.word.findUnique({
        where: { wordText: wordText.toLowerCase() }
      });

      if (!word) {
        console.log(`[WAIT] 单词 ${wordText} 不存在，退出等待`);
        return null;
      }

      // 如果状态为 COMPLETED，返回数据
      if (word.status === 'COMPLETED') {
        console.log(`[WAIT] 单词 ${wordText} 处理完成`);
        const wordData = await getWordFromTables(wordText);
        return wordData;
      }

      // 如果状态为 FAILED，返回错误
      if (word.status === 'FAILED') {
        console.log(`[WAIT] 单词 ${wordText} 处理失败`);
        throw new Error(`单词 ${wordText} 处理失败`);
      }

      // 继续等待
      console.log(`[WAIT] 单词 ${wordText} 仍在处理中，状态: ${word.status}，继续等待 ${interval}ms`);
      await new Promise(resolve => setTimeout(resolve, interval));

    } catch (error) {
      console.error(`[WAIT] 等待单词 ${wordText} 时出错:`, error);
      return null;
    }
  }

  // 超时
  console.log(`[WAIT] 单词 ${wordText} 等待超时`);
  return null;
}

/**
 * 原子性更新单词状态为 PROCESSING
 * @param wordText 单词文本
 * @returns 是否成功获取处理权
 */
async function acquireProcessingLock(wordText: string): Promise<boolean> {
  try {
    // 使用原子性操作更新状态
    const result = await db.word.updateMany({
      where: {
        wordText: wordText.toLowerCase(),
        status: 'PENDING'  // 只有 PENDING 状态才能被更新
      },
      data: {
        status: 'PROCESSING'
      }
    });

    // 如果更新了1条记录，说明成功获取锁
    const acquired = result.count === 1;
    console.log(`[LOCK] ${wordText}: ${acquired ? '成功获取处理锁' : '未能获取处理锁（已被其他进程处理）'}`);
    return acquired;
  } catch (error) {
    console.error(`[LOCK] ${wordText}: 获取处理锁时出错:`, error);
    return false;
  }
}

/**
 * 将复杂对象转换为 Prisma 可接受的 JsonValue 类型
 */
function convertToPrismaJson(data: unknown) {
  if (data === null || data === undefined) {
    return null;
  }

  try {
    const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        return null;
      }
      if (typeof value === 'function') {
        return undefined;
      }
      if (typeof value === 'object' && value !== null) {
        if (value.constructor === Object || Array.isArray(value)) {
          return value;
        }
        return value.toString();
      }
      return value;
    }));

    return sanitizedData;
  } catch (error) {
    console.error('[ERROR] 转换对象为 Prisma JSON 时出错:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const word = searchParams.get('word');
  const type = searchParams.get('type') as 'all' | 'authoritative' | 'bilingual' | 'english' || 'all';
  const test = searchParams.get('test') === 'true';
  const waitForResult = searchParams.get('wait') === 'true'; // 是否等待结果

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
    }

    const wordText = word!.toLowerCase();

    // 1. 检查数据库中是否已有完整数据
    try {
      const existingWord = await db.word.findUnique({
        where: { wordText }
      });

      if (existingWord) {
        // 如果状态为 PROCESSING，根据 wait 参数决定是否等待
        if (existingWord.status === 'PROCESSING') {
          console.log(`[API] 单词 ${word} 正在处理中`);

          if (waitForResult) {
            // 等待处理完成
            const result = await waitForWordCompletion(wordText);
            if (result) {
              return NextResponse.json({
                success: true,
                word,
                requestedType: type,
                data: result,
                _status: 'completed_after_wait'
              });
            } else {
              return NextResponse.json({
                success: false,
                error: '处理超时或失败',
                word,
                _status: 'timeout_or_failed'
              }, { status: 408 });
            }
          } else {
            // 立即返回 202，表示正在处理
            return NextResponse.json({
              success: true,
              status: 'processing',
              word,
              message: '单词正在处理中，请稍后重试',
              estimatedTime: '2000ms'
            }, { status: 202 });
          }
        }

        // 如果状态为 FAILED，尝试重新处理
        if (existingWord.status === 'FAILED') {
          console.log(`[API] 单词 ${word} 之前处理失败，尝试重新处理`);
          // 重置状态为 PENDING
          await db.word.update({
            where: { wordText },
            data: { status: 'PENDING' }
          });
        }

        // 获取单词数据（从新表结构或JSON缓存）
        const wordData = await getWordFromTables(wordText);

        if (wordData) {
          // 验证数据完整性
          const validation = validateWordDataCompleteness(wordData);

          if (validation.isComplete || validation.isPartiallyValid) {
            console.log(`[API] 从数据库获取${validation.isComplete ? '完整' : '部分有效'}单词数据: ${word}`);
            const response = {
              success: true,
              word,
              requestedType: type,
              data: wordData,
              _source: 'database',
              _status: existingWord.status
            };

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
          }
        }
      }
    } catch (dbError) {
      console.error('[API] 查询数据库时出错:', dbError);
    }

    // 2. 数据不存在或无效，尝试获取处理锁
    console.log(`[API] 单词 ${word} 需要爬取，尝试获取处理锁`);

    // 确保单词记录存在
    await db.word.upsert({
      where: { wordText },
      update: {}, // 不更新任何字段
      create: {
        wordText,
        status: 'PENDING'
      }
    });

    // 尝试获取处理锁
    const lockAcquired = await acquireProcessingLock(wordText);

    if (!lockAcquired) {
      // 未能获取锁，说明其他进程正在处理
      console.log(`[API] 单词 ${word} 正在被其他进程处理`);

      if (waitForResult) {
        // 等待其他进程完成
        const result = await waitForWordCompletion(wordText);
        if (result) {
          return NextResponse.json({
            success: true,
            word,
            requestedType: type,
            data: result,
            _status: 'completed_after_wait'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: '等待超时或失败',
            word,
            _status: 'timeout_or_failed'
          }, { status: 408 });
        }
      } else {
        // 返回 202，建议客户端稍后重试
        return NextResponse.json({
          success: true,
          status: 'processing',
          word,
          message: '单词正在被其他请求处理，请稍后重试',
          estimatedTime: '2000ms'
        }, { status: 202 });
      }
    }

    // 3. 获取到锁，执行爬虫任务
    console.log(`[API] 单词 ${word} 获取处理锁成功，开始爬取`);

    try {
      const result = await dictionaryScraper.scrapeWord(word!, type);

      if (result.success && result.data) {
        // 验证新爬取的数据完整性
        const validation = validateWordDataCompleteness(result.data);

        if (validation.isPartiallyValid || validation.isComplete) {
          // 保存到数据库
          try {
            console.log(`[API] 保存爬取结果到数据库`);

            // 保存到JSON字段（兼容性）
            await db.word.update({
              where: { wordText },
              data: {
                definitionData: convertToPrismaJson(result.data),
                status: 'COMPLETED'
              }
            });

            // 保存到新表结构
            await dictionaryScraper.saveWordDataToTables(word!, result.data);

            console.log(`[API] 单词 ${word} 已成功保存到数据库`);
          } catch (cacheError) {
            console.error(`[API] 保存单词数据时出错:`, cacheError);
            // 即使保存失败，也返回结果给用户
          }

          // 返回成功结果
          const response = {
            success: true,
            word,
            requestedType: type,
            data: result.data,
            _status: 'newly_scraped'
          };

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
          // 数据无效，标记为 FAILED
          await db.word.update({
            where: { wordText },
            data: { status: 'FAILED' }
          });

          return NextResponse.json({
            success: false,
            error: '爬取的数据无效',
            word,
            validation: validation
          }, { status: 500 });
        }
      } else {
        // 爬取失败，标记为 FAILED
        await db.word.update({
          where: { wordText },
          data: { status: 'FAILED' }
        });

        return NextResponse.json(result, { status: 500 });
      }
    } catch (scrapeError) {
      // 爬取过程出错，标记为 FAILED
      console.error(`[API] 爬取单词 ${word} 时出错:`, scrapeError);
      await db.word.update({
        where: { wordText },
        data: { status: 'FAILED' }
      });

      throw scrapeError;
    }

  } catch (error) {
    console.error('[API] 处理请求时出错:', error);

    let statusCode = 500;
    let errorMessage = '服务器内部错误';

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        statusCode = 503;
        errorMessage = '词典服务暂时不可用，请稍后重试';
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        statusCode = 408;
        errorMessage = '请求超时，请稍后重试';
      } else if (error.message.includes('database') || error.message.includes('Prisma')) {
        statusCode = 503;
        errorMessage = '数据库服务暂时不可用，请稍后重试';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      word,
      ...(process.env.NODE_ENV === 'development' && {
        errorDetails: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      })
    }, { status: statusCode });
  }
}

// 从新表结构中获取单词数据
async function getWordFromTables(wordText: string): Promise<WordDefinitionData | null> {
  try {
    // 先获取单词基本信息
    const word = await db.word.findUnique({
      where: { wordText: wordText.toLowerCase() }
    });

    if (!word) {
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
    return convertTablesToJson(wordData as unknown as WordDataAssembled);
  } catch (error) {
    console.error('从新表结构获取单词数据时出错:', error);
    return null;
  }
}

// 将表结构数据转换为JSON格式
function convertTablesToJson(word: WordDataAssembled): WordDefinitionData | null {
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
      if (pron.type === 'american') {
        result.pronunciationData!.american = {
          phonetic: pron.phonetic,
          audioUrl: pron.audioUrl || undefined
        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      } else if (pron.type === 'british') {
        result.pronunciationData!.british = {
          phonetic: pron.phonetic,
          audioUrl: pron.audioUrl || undefined
        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    });
  }

  // 处理释义数据
  if (word.definitions && word.definitions.length > 0) {
    word.definitions.forEach((def) => {
      if (def.type === 'basic') {
        result.definitions!.basic!.push({
          partOfSpeech: def.partOfSpeech || '',
          meaning: def.meaning || ''
        });
      } else if (def.type === 'web') {
        result.definitions!.web!.push({
          meaning: def.meaning || ''
        });
      } else if (def.type === 'authoritative') {
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
          partOfSpeech: def.partOfSpeech || '',
          definitions: []
        };

        // 处理释义条目 - 修复：从 DefinitionExamples 表中提取释义（不是例句）
        const examples = word.definitionExamples?.filter((ex) => ex.definitionId === def.id);
        if (examples && examples.length > 0) {
          examples.forEach((example) => {
            // 对于权威英汉释义，需要同时有中英文
            if (example.chinese && example.english) {
              // 判断是否是释义而不是例句
              // 规则1：中文包含分号、顿号通常是释义
              // 规则2：中文很短（<30字符）且英文以小写开头通常是释义
              // 规则3：英文不是完整句子（没有主谓宾结构）通常是释义
              const isDefinition =
                example.chinese.includes('；') ||
                example.chinese.includes('、') ||
                (example.chinese.length < 30 && !/^[A-Z]/.test(example.english)) ||
                (example.chinese.length < 20 && example.english.split(' ').length <= 4);

              if (isDefinition) {
                authDef.definitions.push({
                  number: example.order,
                  chineseMeaning: example.chinese,
                  englishMeaning: example.english
                });
              }
            }
          });
        }

        // 处理习语
        const idioms = word.definitionIdioms?.filter((id) => id.definitionId === def.id);
        if (idioms && idioms.length > 0) {
          authDef.idioms = [];
          idioms.forEach((idiom) => {
            const idiomItem: {
                number: number;
                title: string;
                meaning: string;
                examples?: Array<{
                  english: string;
                  chinese: string;
                }>;
              } = {
              number: idiom.order,
              title: idiom.title,
              meaning: idiom.meaning
            };

            // 处理习语例句
            const idiomExamples = word.idiomExamples?.filter((ex) => ex.idiomId === idiom.id);
            if (idiomExamples && idiomExamples.length > 0) {
              idiomItem.examples = idiomExamples.map((ex) => ({
                english: ex.english,
                chinese: ex.chinese
              }));
            }

            authDef.idioms!.push(idiomItem);
          });
        }

        result.authoritativeDefinitions!.push(authDef);
      } else if (def.type === 'bilingual') {
        const bilDef: {
            partOfSpeech: string;
            definitions: Array<{
              number: number;
              meaning: string;
            }>;
          } = {
          partOfSpeech: def.partOfSpeech || '',
          definitions: []
        };

        // 处理释义条目 - 修复：释义数据存储在 DefinitionExamples 表中
        const examples = word.definitionExamples?.filter((ex) => ex.definitionId === def.id);
        if (examples && examples.length > 0) {
          examples.forEach((example) => {
            // 对于英汉释义，只需要中文释义
            if (example.chinese) {
              bilDef.definitions.push({
                number: example.order,
                meaning: example.chinese
              });
            }
          });
        }

        result.bilingualDefinitions!.push(bilDef);
      } else if (def.type === 'english') {
        const engDef: {
            partOfSpeech: string;
            definitions: Array<{
              number: number;
              meaning: string;
              linkedWords?: string[];
            }>;
          } = {
          partOfSpeech: def.partOfSpeech || '',
          definitions: []
        };

        if (def.meaning) {
          engDef.definitions.push({
            number: def.order || 0,
            meaning: def.meaning,
            linkedWords: def.linkedWords ? JSON.parse(def.linkedWords) : undefined
          });
        }

        result.englishDefinitions!.push(engDef);
      }
    });
  }

  // 处理例句数据
  if (word.sentences && word.sentences.length > 0) {
    result.sentences = word.sentences.map((sentence) => ({
      number: sentence.order,
      english: sentence.english,
      chinese: sentence.chinese,
      audioUrl: sentence.audioUrl || undefined,
      source: sentence.source || undefined
    }));
  }

  // 处理词形变化
  if (word.wordForms && word.wordForms.length > 0) {
    result.wordForms = word.wordForms.map((form) => ({
      form: form.formType,
      word: form.formWord
    }));
  }

  return result;
}