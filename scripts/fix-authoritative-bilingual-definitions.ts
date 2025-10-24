#!/usr/bin/env tsx

/**
 * 修复权威英汉释义和英汉释义数据迁移脚本
 *
 * 此脚本用于修复已经错误存储在 DefinitionExamples 表中的释义数据，
 * 将其迁移到 WordDefinitions 表的正确字段中。
 */

import { db } from '../src/lib/db';
import { PrismaClient } from '@prisma/client';

interface DefinitionExampleRecord {
  id: number;
  definitionId: number;
  order: number;
  english: string;
  chinese: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WordDefinitionRecord {
  id: number;
  wordId: number;
  type: string;
  partOfSpeech?: string | null;
  meaning?: string | null;
  chineseMeaning?: string | null;
  englishMeaning?: string | null;
  order?: number;
  definitionNumber?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

console.log('开始修复权威英汉释义和英汉释义数据...');

async function migrateDefinitionData() {
  try {
    // 获取所有权威英汉释义和英汉释义的定义记录
    const authoritativeDefinitions = await db.$queryRaw<WordDefinitionRecord[]>`
      SELECT * FROM WordDefinitions
      WHERE type IN ('authoritative', 'bilingual')
      ORDER BY word_id, part_of_speech, \`order\`
    `;

    console.log(`找到 ${authoritativeDefinitions.length} 条权威英汉释义和英汉释义记录`);

    let migratedCount = 0;
    let errorCount = 0;

    // 处理每个释义记录
    for (const def of authoritativeDefinitions) {
      try {
        // 获取该释义的所有例句/释义数据
        const examples = await db.$queryRaw<DefinitionExampleRecord[]>`
          SELECT * FROM DefinitionExamples
          WHERE definition_id = ${def.id}
          ORDER BY \`order\`
        `;

        if (examples.length === 0) {
          console.log(`释义记录 ${def.id} 没有关联的例句/释义数据`);
          continue;
        }

        console.log(`处理释义记录 ${def.id} (类型: ${def.type}, 词性: ${def.partOfSpeech}), 找到 ${examples.length} 条数据`);

        if (def.type === 'authoritative') {
          // 处理权威英汉释义
          await processAuthoritativeDefinitions(def, examples);
        } else if (def.type === 'bilingual') {
          // 处理英汉释义
          await processBilingualDefinitions(def, examples);
        }

        migratedCount++;
        console.log(`成功处理释义记录 ${def.id}`);

      } catch (error) {
        errorCount++;
        console.error(`处理释义记录 ${def.id} 时出错:`, error);
      }
    }

    console.log(`\n数据迁移完成！`);
    console.log(`成功处理: ${migratedCount} 条记录`);
    console.log(`处理失败: ${errorCount} 条记录`);

  } catch (error) {
    console.error('数据迁移过程中出现严重错误:', error);
    throw error;
  }
}

async function processAuthoritativeDefinitions(
  def: WordDefinitionRecord,
  examples: DefinitionExampleRecord[]
) {
  console.log(`  处理权威英汉释义: ${def.partOfSpeech}`);

  // 检查是否已经存在正确的释义数据
  if (def.chineseMeaning || def.englishMeaning) {
    console.log(`  释义记录 ${def.id} 已包含正确的释义数据，跳过处理`);
    return;
  }

  // 分析例句数据，区分释义和例句
  const realDefinitions: DefinitionExampleRecord[] = [];
  const realExamples: DefinitionExampleRecord[] = [];

  examples.forEach((example) => {
    // 使用启发式规则判断是释义还是例句
    const isDefinition =
      (example.chinese && example.chinese.includes('；')) ||
      (example.chinese && example.chinese.includes('、')) ||
      (example.chinese && example.chinese.length < 30 && example.english && !/^[A-Z]/.test(example.english)) ||
      (example.chinese && example.chinese.length < 20 && example.english && example.english.split(' ').length <= 4);

    if (isDefinition) {
      realDefinitions.push(example);
    } else {
      realExamples.push(example);
    }
  });

  console.log(`    识别出 ${realDefinitions.length} 条释义和 ${realExamples.length} 条例句`);

  if (realDefinitions.length > 0) {
    // 更新主释义记录
    const firstDef = realDefinitions[0];
    await db.$executeRaw`
      UPDATE WordDefinitions
      SET chinese_meaning = ${firstDef.chinese},
          english_meaning = ${firstDef.english},
          definition_number = ${firstDef.order}
      WHERE id = ${def.id}
    `;

    // 如果有多个释义条目，为每个额外的释义创建新的记录
    for (let i = 1; i < realDefinitions.length; i++) {
      const extraDef = realDefinitions[i];
      await db.wordDefinition.create({
        data: {
          wordId: def.wordId,
          type: 'authoritative',
          partOfSpeech: def.partOfSpeech,
          order: extraDef.order,
          chineseMeaning: extraDef.chinese,
          englishMeaning: extraDef.english,
          definitionNumber: extraDef.order
        }
      });

      // 重新关联例句到新的释义记录
      const newDef = await db.wordDefinition.findFirst({
        where: {
          wordId: def.wordId,
          type: 'authoritative',
          partOfSpeech: def.partOfSpeech,
          chineseMeaning: extraDef.chinese,
          englishMeaning: extraDef.english
        }
      });

      if (newDef) {
        // 将对应的例句重新关联到新的释义记录
        const relatedExamples = realExamples.filter(ex => ex.order === extraDef.order);
        for (const example of relatedExamples) {
          await db.definitionExample.update({
            where: { id: example.id },
            data: { definitionId: newDef.id }
          });
        }
      }
    }

    // 清理已处理的释义数据（保留真正的例句）
    const defIdsToDelete = realDefinitions.map(d => d.id);
    if (defIdsToDelete.length > 0) {
      await db.$executeRaw`
        DELETE FROM DefinitionExamples
        WHERE id IN (${defIdsToDelete.join(',')})
      `;
    }
  }

  // 重新编号剩余的例句
  const remainingExamples = await db.$queryRaw<DefinitionExampleRecord[]>`
    SELECT * FROM DefinitionExamples
    WHERE definition_id = ${def.id}
    ORDER BY \`order\`
  `;

  for (let i = 0; i < remainingExamples.length; i++) {
    await db.$executeRaw`
      UPDATE DefinitionExamples
      SET \`order\` = ${i + 1}
      WHERE id = ${remainingExamples[i].id}
    `;
  }
}

async function processBilingualDefinitions(
  def: WordDefinitionRecord,
  examples: DefinitionExampleRecord[]
) {
  console.log(`  处理英汉释义: ${def.partOfSpeech}`);

  // 检查是否已经存在正确的释义数据
  if (def.chineseMeaning) {
    console.log(`  释义记录 ${def.id} 已包含正确的释义数据，跳过处理`);
    return;
  }

  if (examples.length > 0) {
    // 对于英汉释义，通常第一个是主要释义
    const firstExample = examples[0];

    // 更新主释义记录
    await db.$executeRaw`
      UPDATE WordDefinitions
      SET chinese_meaning = ${firstExample.chinese},
          definition_number = ${firstExample.order}
      WHERE id = ${def.id}
    `;

    // 如果有多个释义条目，为每个额外的释义创建新的记录
    for (let i = 1; i < examples.length; i++) {
      const extraExample = examples[i];
      await db.wordDefinition.create({
        data: {
          wordId: def.wordId,
          type: 'bilingual',
          partOfSpeech: def.partOfSpeech,
          order: extraExample.order,
          chineseMeaning: extraExample.chinese,
          definitionNumber: extraExample.order
        }
      });
    }

    // 删除已迁移的释义数据
    await db.$executeRaw`
      DELETE FROM DefinitionExamples
      WHERE definition_id = ${def.id}
    `;
  }
}

// 运行迁移
async function main() {
  const startTime = Date.now();

  try {
    await migrateDefinitionData();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n迁移脚本执行完成，耗时: ${duration.toFixed(2)} 秒`);

  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}