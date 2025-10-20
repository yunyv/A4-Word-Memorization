import { NextRequest, NextResponse } from 'next/server';
import { dictionaryScraper, validateWordDataCompleteness } from '@/lib/dictionary';
import { db } from '@/lib/db';

/**
 * 将复杂对象转换为 Prisma 可接受的 JsonValue 类型
 * 通过 JSON 序列化和反序列化来确保对象结构符合 Prisma 的 Json 字段要求
 */
function convertToPrismaJson(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  try {
    // 将对象转换为 JSON 字符串，然后再解析回来
    // 这样可以确保对象结构符合 Prisma 的 Json 字段要求
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error('转换对象为 Prisma JSON 时出错:', error);
    return null;
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
          
          if (validation.isComplete) {
            // 如果数据完整，直接返回
            console.log(`从新表结构中获取完整单词数据: ${word}`);
            return NextResponse.json({
              success: true,
              word: word!,
              requestedType: type,
              data: wordData
            });
          } else {
            // 如果数据不完整，记录日志并继续执行爬虫逻辑
            console.log(`单词 ${word} 数据不完整，缺失字段: ${validation.missingFields.join(', ')}`);
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
            const validation = validateWordDataCompleteness(existingWord.definitionData);
            console.log(`单词 ${word} JSON缓存数据验证结果:`, validation);
            
            if (validation.isComplete) {
              // 如果JSON缓存数据完整，返回缓存数据
              console.log(`从JSON缓存中获取完整单词数据: ${word}`);
              return NextResponse.json({
                success: true,
                word: word!,
                requestedType: type,
                data: existingWord.definitionData
              });
            } else {
              // 如果JSON缓存数据不完整，记录日志并继续执行爬虫逻辑
              console.log(`单词 ${word} JSON缓存数据不完整，缺失字段: ${validation.missingFields.join(', ')}`);
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
      console.log(`开始爬取单词: ${word}`);
      const result = await dictionaryScraper.scrapeWord(word!, type);
      
      if (result.success && result.data) {
        // 验证新爬取的数据完整性
        const validation = validateWordDataCompleteness(result.data);
        console.log(`新爬取的单词 ${word} 数据验证结果:`, validation);
        
        // 将爬取结果存储到数据库（同时保存到JSON和新表结构）
        try {
          // 保存到JSON字段（兼容性）
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
          
          // 保存到新表结构
          await dictionaryScraper.saveWordDataToTables(word!, result.data);
          
          console.log(`单词 ${word} 已缓存到数据库（JSON和新表结构）`);
        } catch (cacheError) {
          console.error('缓存单词数据时出错:', cacheError);
          // 不影响返回结果，只记录错误
        }
        
        // 如果新爬取的数据仍然不完整，添加警告信息
        if (!validation.isComplete) {
          (result.data as any)._incompleteDataWarning = {
            missingFields: validation.missingFields,
            issues: validation.issues
          };
          console.log(`警告: 新爬取的单词 ${word} 数据仍然不完整`);
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
    console.error('API路由处理错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        word
      },
      { status: 500 }
    );
  }
}

// 从新表结构中获取单词数据
async function getWordFromTables(wordText: string): Promise<any> {
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
    return convertTablesToJson(wordData);
  } catch (error) {
    console.error('从新表结构获取单词数据时出错:', error);
    return null;
  }
}

// 将表结构数据转换为JSON格式
function convertTablesToJson(word: any): any {
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

  const result: any = {
    pronunciation: word.pronunciation,
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
    word.pronunciations.forEach((pron: any) => {
      if (pron.type === 'american') {
        result.pronunciationData.american = {
          phonetic: pron.phonetic,
          audioUrl: pron.audioUrl
        };
      } else if (pron.type === 'british') {
        result.pronunciationData.british = {
          phonetic: pron.phonetic,
          audioUrl: pron.audioUrl
        };
      }
    });
  }

  // 处理释义数据
  if (word.definitions && word.definitions.length > 0) {
    word.definitions.forEach((def: any) => {
      if (def.type === 'basic') {
        result.definitions.basic.push({
          partOfSpeech: def.partOfSpeech,
          meaning: def.meaning
        });
      } else if (def.type === 'web') {
        result.definitions.web.push({
          meaning: def.meaning
        });
      } else if (def.type === 'authoritative') {
        const authDef: any = {
          partOfSpeech: def.partOfSpeech,
          definitions: []
        };

        // 处理释义条目
        const examples = word.definitionExamples.filter((ex: any) => ex.definitionId === def.id);
        if (examples && examples.length > 0) {
          examples.forEach((example: any) => {
            authDef.definitions.push({
              number: example.order,
              chineseMeaning: example.chinese,
              englishMeaning: example.english
            });
          });
        }

        // 处理习语
        const idioms = word.definitionIdioms.filter((id: any) => id.definitionId === def.id);
        if (idioms && idioms.length > 0) {
          authDef.idioms = [];
          idioms.forEach((idiom: any) => {
            const idiomItem: any = {
              number: idiom.order,
              title: idiom.title,
              meaning: idiom.meaning
            };

            // 处理习语例句
            const idiomExamples = word.idiomExamples.filter((ex: any) => ex.idiomId === idiom.id);
            if (idiomExamples && idiomExamples.length > 0) {
              idiomItem.examples = idiomExamples.map((ex: any) => ({
                english: ex.english,
                chinese: ex.chinese
              }));
            }

            authDef.idioms.push(idiomItem);
          });
        }

        result.authoritativeDefinitions.push(authDef);
      } else if (def.type === 'bilingual') {
        const bilDef: any = {
          partOfSpeech: def.partOfSpeech,
          definitions: []
        };

        const examples = word.definitionExamples.filter((ex: any) => ex.definitionId === def.id);
        if (examples && examples.length > 0) {
          examples.forEach((example: any) => {
            bilDef.definitions.push({
              number: example.order,
              meaning: example.chinese
            });
          });
        }

        result.bilingualDefinitions.push(bilDef);
      } else if (def.type === 'english') {
        const engDef: any = {
          partOfSpeech: def.partOfSpeech,
          definitions: []
        };

        if (def.meaning) {
          engDef.definitions.push({
            number: def.order,
            meaning: def.meaning,
            linkedWords: def.linkedWords ? JSON.parse(def.linkedWords) : undefined
          });
        }

        result.englishDefinitions.push(engDef);
      }
    });
  }

  // 处理例句数据
  if (word.sentences && word.sentences.length > 0) {
    result.sentences = word.sentences.map((sentence: any) => ({
      number: sentence.order,
      english: sentence.english,
      chinese: sentence.chinese,
      audioUrl: sentence.audioUrl,
      source: sentence.source
    }));
  }

  // 处理词形变化
  if (word.wordForms && word.wordForms.length > 0) {
    result.wordForms = word.wordForms.map((form: any) => ({
      form: form.formType,
      word: form.formWord
    }));
  }

  return result;
}