/**
 * 数据修复脚本
 * 用于扫描和修复数据库中不完整的单词数据
 */

import { db } from '../lib/db';
import { validateWordDataCompleteness } from '../lib/dictionary';

// 从新表结构中获取单词数据的函数（复制自 route.ts）
async function getWordFromTables(wordText: string) {
  try {
    const word = await db.word.findUnique({
      where: { wordText: wordText.toLowerCase() }
    });

    if (!word) {
      return null;
    }

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

    return convertTablesToJson(wordData as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  } catch (error) {
    console.error('从新表结构获取单词数据时出错:', error);
    return null;
  }
}

// 将表结构数据转换为JSON格式
function convertTablesToJson(word: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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

  const result = {
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
    word.pronunciations.forEach((pron: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (pron.type === 'american') {
        (result.pronunciationData as any).american = {
          phonetic: pron.phonetic,
          audioUrl: pron.audioUrl
        }; // eslint-disable-line @typescript-eslint/no-explicit-any
      } else if (pron.type === 'british') {
        (result.pronunciationData as any).british = {
          phonetic: pron.phonetic,
          audioUrl: pron.audioUrl
        }; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    });
  }

  // 处理释义数据
  if (word.definitions && word.definitions.length > 0) {
    word.definitions.forEach((def: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (def.type === 'basic') {
        result.definitions!.basic!.push({
          partOfSpeech: def.partOfSpeech || '',
          meaning: def.meaning || ''
        });
      } else if (def.type === 'web') {
        result.definitions!.web!.push({
          meaning: def.meaning || ''
        });
      }
      // ... 其他类型的处理
    });
  }

  // 处理例句和词形
  if (word.sentences && word.sentences.length > 0) {
    result.sentences = word.sentences.map((sentence: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      number: sentence.order,
      english: sentence.english,
      chinese: sentence.chinese,
      audioUrl: sentence.audioUrl,
      source: sentence.source
    }));
  }

  if (word.wordForms && word.wordForms.length > 0) {
    result.wordForms = word.wordForms.map((form: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      form: form.formType,
      word: form.formWord
    }));
  }

  return result;
}

interface FixOptions {
  limit?: number; // 限制处理的单词数量
  resetFailed?: boolean; // 是否重置 FAILED 状态的单词
  verbose?: boolean; // 是否输出详细信息
}

/**
 * 扫描数据库中的不完整数据
 */
export async function scanIncompleteData(options: FixOptions = {}) {
  const { limit = 100, verbose = false } = options;

  console.log(`\n[SCAN] 开始扫描不完整数据，限制: ${limit} 个单词\n`);

  const incompleteWords = [];
  let processedCount = 0;

  // 获取所有单词
  const words = await db.word.findMany({
    select: {
      wordText: true,
      status: true,
      updatedAt: true
    },
    orderBy: {
      updatedAt: 'asc' // 从最旧的开始
    }
  });

  console.log(`[SCAN] 数据库中共有 ${words.length} 个单词\n`);

  for (const word of words) {
    if (processedCount >= limit) break;
    processedCount++;

    // 跳过正在处理的单词
    if (word.status === 'PROCESSING') {
      if (verbose) {
        console.log(`[SKIP] ${word.wordText} - 正在处理中`);
      }
      continue;
    }

    // 尝试获取单词数据
    const wordData = await getWordFromTables(word.wordText);

    if (!wordData) {
      // 完全没有数据
      incompleteWords.push({
        wordText: word.wordText,
        status: word.status,
        issue: 'no_data',
        validation: null
      });
      if (verbose) {
        console.log(`[FOUND] ${word.wordText} - 没有数据`);
      }
    } else {
      // 验证数据完整性
      const validation = validateWordDataCompleteness(wordData);

      if (!validation.isComplete) {
        incompleteWords.push({
          wordText: word.wordText,
          status: word.status,
          issue: 'incomplete_data',
          validation: {
            isComplete: validation.isComplete,
            isPartiallyValid: validation.isPartiallyValid,
            missingFields: validation.missingFields,
            issues: validation.issues
          }
        });
        if (verbose) {
          console.log(`[FOUND] ${word.wordText} - 数据不完整`);
          console.log(`  - 缺失字段: ${validation.missingFields.join(', ')}`);
          console.log(`  - 问题: ${validation.issues.join(', ')}`);
        }
      } else if (verbose) {
        console.log(`[OK] ${word.wordText} - 数据完整`);
      }
    }
  }

  console.log(`\n[SCAN] 扫描完成，发现 ${incompleteWords.length} 个不完整的单词\n`);

  return incompleteWords;
}

/**
 * 修复不完整的数据
 * 将不完整的单词状态重置为 PENDING，以便重新爬取
 */
export async function fixIncompleteData(incompleteWords: any[], options: FixOptions = {}) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { verbose = false } = options;

  console.log(`[FIX] 开始修复 ${incompleteWords.length} 个不完整的单词\n`);

  let fixedCount = 0;
  let failedCount = 0;

  for (const item of incompleteWords) {
    try {
      // 重置单词状态为 PENDING
      await db.word.update({
        where: { wordText: item.wordText },
        data: {
          status: 'PENDING',
          updatedAt: new Date()
        }
      });

      fixedCount++;
      if (verbose) {
        console.log(`[FIXED] ${item.wordText} - 已重置为 PENDING 状态`);
      }
    } catch (error) {
      failedCount++;
      console.error(`[ERROR] ${item.wordText} - 修复失败:`, error);
    }
  }

  console.log(`\n[FIX] 修复完成`);
  console.log(`  - 成功: ${fixedCount} 个`);
  console.log(`  - 失败: ${failedCount} 个\n`);

  return { fixedCount, failedCount };
}

/**
 * 重置失败的单词
 */
export async function resetFailedWords(options: FixOptions = {}) {
  const { limit = 50, verbose = false } = options;

  console.log(`[RESET] 开始重置失败的单词，限制: ${limit} 个\n`);

  const failedWords = await db.word.findMany({
    where: { status: 'FAILED' },
    select: {
      wordText: true,
      updatedAt: true
    },
    orderBy: {
      updatedAt: 'desc' // 从最新的失败开始
    },
    take: limit
  });

  console.log(`[RESET] 找到 ${failedWords.length} 个失败的单词\n`);

  let resetCount = 0;
  for (const word of failedWords) {
    try {
      await db.word.update({
        where: { wordText: word.wordText },
        data: {
          status: 'PENDING',
          updatedAt: new Date()
        }
      });

      resetCount++;
      if (verbose) {
        console.log(`[RESET] ${word.wordText} - 已重置为 PENDING`);
      }
    } catch (error) {
      console.error(`[ERROR] ${word.wordText} - 重置失败:`, error);
    }
  }

  console.log(`\n[RESET] 重置完成，共重置 ${resetCount} 个单词\n`);

  return resetCount;
}

// 主函数 - 执行完整的数据修复流程
export async function runDataFix(options: FixOptions = {}) {
  console.log('='.repeat(60));
  console.log('数据修复脚本 - 开始执行');
  console.log('='.repeat(60));

  // 1. 扫描不完整数据
  const incompleteWords = await scanIncompleteData(options);

  if (incompleteWords.length === 0) {
    console.log('✅ 所有数据都是完整的，无需修复');
    return;
  }

  // 2. 修复不完整数据
  const fixResult = await fixIncompleteData(incompleteWords, options);

  // 3. 可选：重置失败的单词
  if (options.resetFailed) {
    const resetCount = await resetFailedWords(options);
    console.log(`额外重置了 ${resetCount} 个失败的单词`);
  }

  console.log('='.repeat(60));
  console.log('数据修复脚本 - 执行完成');
  console.log(`- 发现问题: ${incompleteWords.length} 个`);
  console.log(`- 修复成功: ${fixResult.fixedCount} 个`);
  console.log(`- 修复失败: ${fixResult.failedCount} 个`);
  console.log('='.repeat(60));
}

// 如果直接运行此脚本
if (require.main === module) {
  runDataFix({
    limit: 50,
    verbose: true,
    resetFailed: true
  }).catch(console.error);
}