import { PrismaClient, Prisma } from '@prisma/client';
import { MigrationStats } from '../src/types/word';

const prisma = new PrismaClient();

async function migrateWordData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalWords: 0,
    migratedWords: 0,
    skippedWords: 0,
    errors: []
  };

  try {
    // 1. 获取所有有JSON数据的单词
    const words = await prisma.word.findMany({
      where: {
        definitionData: {
          not: Prisma.JsonNull
        }
      }
    });

    stats.totalWords = words.length;
    console.log(`找到 ${words.length} 个需要迁移的单词`);

    // 2. 逐个处理单词
    for (const word of words) {
      try {
        await migrateSingleWord(word);
        stats.migratedWords++;
        console.log(`✅ 成功迁移单词: ${word.wordText}`);
      } catch (error) {
        stats.errors.push({
          word: word.wordText,
          error: error instanceof Error ? error.message : '未知错误'
        });
        console.error(`❌ 迁移单词失败: ${word.wordText}`, error);
      }
    }

    // 3. 输出迁移统计
    console.log('\n=== 迁移完成 ===');
    console.log(`总单词数: ${stats.totalWords}`);
    console.log(`成功迁移: ${stats.migratedWords}`);
    console.log(`跳过单词: ${stats.skippedWords}`);
    console.log(`错误数量: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n错误详情:');
      stats.errors.forEach(err => console.log(`- ${err.word}: ${err.error}`));
    }

    return stats;
  } catch (error) {
    console.error('迁移过程中发生严重错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateSingleWord(word: any) {
  const definitionData = word.definitionData as any;
  
  if (!definitionData) {
    return; // 跳过没有数据的单词
  }

  // 使用事务确保数据一致性
  await prisma.$transaction(async (tx) => {
    // 1. 更新基本发音信息
    if (definitionData.pronunciation) {
      // 使用原生SQL更新，避免Prisma类型问题
      await tx.$executeRaw`UPDATE Words SET pronunciation = ${definitionData.pronunciation} WHERE id = ${word.id}`;
    }

    // 2. 迁移发音数据
    if (definitionData.pronunciationData) {
      await migratePronunciationData(tx, word.id, definitionData.pronunciationData);
    }

    // 3. 迁移释义数据
    if (definitionData.definitions) {
      await migrateDefinitionData(tx, word.id, definitionData.definitions);
    }

    // 4. 迁移权威英汉释义
    if (definitionData.authoritativeDefinitions) {
      await migrateAuthoritativeDefinitions(tx, word.id, definitionData.authoritativeDefinitions);
    }

    // 5. 迁移英汉释义
    if (definitionData.bilingualDefinitions) {
      await migrateBilingualDefinitions(tx, word.id, definitionData.bilingualDefinitions);
    }

    // 6. 迁移英英释义
    if (definitionData.englishDefinitions) {
      await migrateEnglishDefinitions(tx, word.id, definitionData.englishDefinitions);
    }

    // 7. 迁移例句数据
    if (definitionData.sentences && definitionData.sentences.length > 0) {
      await migrateSentenceData(tx, word.id, definitionData.sentences);
    }

    // 8. 迁移词形变化
    if (definitionData.wordForms && definitionData.wordForms.length > 0) {
      await migrateWordForms(tx, word.id, definitionData.wordForms);
    }
  });
}

async function migratePronunciationData(tx: any, wordId: number, pronunciationData: any) {
  // 美式发音
  if (pronunciationData.american) {
    await tx.$executeRaw`
      INSERT INTO WordPronunciations (word_id, type, phonetic, audio_url, created_at, updated_at)
      VALUES (${wordId}, 'american', ${pronunciationData.american.phonetic}, ${pronunciationData.american.audioUrl}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      phonetic = ${pronunciationData.american.phonetic},
      audio_url = ${pronunciationData.american.audioUrl},
      updated_at = NOW()
    `;
  }

  // 英式发音
  if (pronunciationData.british) {
    await tx.$executeRaw`
      INSERT INTO WordPronunciations (word_id, type, phonetic, audio_url, created_at, updated_at)
      VALUES (${wordId}, 'british', ${pronunciationData.british.phonetic}, ${pronunciationData.british.audioUrl}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      phonetic = ${pronunciationData.british.phonetic},
      audio_url = ${pronunciationData.british.audioUrl},
      updated_at = NOW()
    `;
  }
}

async function migrateDefinitionData(tx: any, wordId: number, definitions: any) {
  // 基本释义
  if (definitions.basic && definitions.basic.length > 0) {
    for (let i = 0; i < definitions.basic.length; i++) {
      const def = definitions.basic[i];
      await tx.$executeRaw`
        INSERT INTO WordDefinitions (word_id, type, part_of_speech, order, meaning, created_at, updated_at)
        VALUES (${wordId}, 'basic', ${def.partOfSpeech}, ${i}, ${def.meaning}, NOW(), NOW())
      `;
    }
  }

  // 网络释义
  if (definitions.web && definitions.web.length > 0) {
    for (let i = 0; i < definitions.web.length; i++) {
      const def = definitions.web[i];
      await tx.$executeRaw`
        INSERT INTO WordDefinitions (word_id, type, order, meaning, created_at, updated_at)
        VALUES (${wordId}, 'web', ${i}, ${def.meaning}, NOW(), NOW())
      `;
    }
  }
}

async function migrateAuthoritativeDefinitions(tx: any, wordId: number, authoritativeDefinitions: any[]) {
  for (const authDef of authoritativeDefinitions) {
    // 创建主释义记录
    const definitionResult = await tx.$queryRaw`
      INSERT INTO WordDefinitions (word_id, type, part_of_speech, order, created_at, updated_at)
      VALUES (${wordId}, 'authoritative', ${authDef.partOfSpeech}, 0, NOW(), NOW())
    `;
    const definitionId = (definitionResult as any).insertId;

    // 创建释义条目
    for (const defItem of authDef.definitions) {
      await tx.$executeRaw`
        INSERT INTO DefinitionExamples (definition_id, order, english, chinese, created_at, updated_at)
        VALUES (${definitionId}, ${defItem.number}, ${defItem.englishMeaning || ''}, ${defItem.chineseMeaning || ''}, NOW(), NOW())
      `;

      // 如果有例句，创建例句记录
      if (defItem.examples && defItem.examples.length > 0) {
        for (const example of defItem.examples) {
          await tx.$executeRaw`
            INSERT INTO DefinitionExamples (definition_id, order, english, chinese, created_at, updated_at)
            VALUES (${definitionId}, ${defItem.number}, ${example.english}, ${example.chinese}, NOW(), NOW())
          `;
        }
      }
    }

    // 处理习语
    if (authDef.idioms && authDef.idioms.length > 0) {
      for (const idiom of authDef.idioms) {
        const idiomResult = await tx.$queryRaw`
          INSERT INTO DefinitionIdioms (definition_id, order, title, meaning, created_at, updated_at)
          VALUES (${definitionId}, ${idiom.number}, ${idiom.title}, ${idiom.meaning}, NOW(), NOW())
        `;
        const idiomId = (idiomResult as any).insertId;

        // 创建习语例句
        if (idiom.examples && idiom.examples.length > 0) {
          for (const example of idiom.examples) {
            await tx.$executeRaw`
              INSERT INTO IdiomExamples (idiom_id, order, english, chinese, created_at, updated_at)
              VALUES (${idiomId}, 0, ${example.english}, ${example.chinese}, NOW(), NOW())
            `;
          }
        }
      }
    }
  }
}

async function migrateBilingualDefinitions(tx: any, wordId: number, bilingualDefinitions: any[]) {
  for (const bilDef of bilingualDefinitions) {
    const definitionResult = await tx.$queryRaw`
      INSERT INTO WordDefinitions (word_id, type, part_of_speech, order, created_at, updated_at)
      VALUES (${wordId}, 'bilingual', ${bilDef.partOfSpeech}, 0, NOW(), NOW())
    `;
    const definitionId = (definitionResult as any).insertId;

    // 创建释义条目
    for (const defItem of bilDef.definitions) {
      await tx.$executeRaw`
        INSERT INTO DefinitionExamples (definition_id, order, english, chinese, created_at, updated_at)
        VALUES (${definitionId}, ${defItem.number}, '', ${defItem.meaning}, NOW(), NOW())
      `;
    }
  }
}

async function migrateEnglishDefinitions(tx: any, wordId: number, englishDefinitions: any[]) {
  for (const engDef of englishDefinitions) {
    // 创建释义条目
    for (const defItem of engDef.definitions) {
      await tx.$executeRaw`
        INSERT INTO WordDefinitions (word_id, type, part_of_speech, order, meaning, linked_words, created_at, updated_at)
        VALUES (${wordId}, 'english', ${engDef.partOfSpeech}, ${defItem.number}, ${defItem.meaning}, ${defItem.linkedWords ? JSON.stringify(defItem.linkedWords) : null}, NOW(), NOW())
      `;
    }
  }
}

async function migrateSentenceData(tx: any, wordId: number, sentences: any[]) {
  for (const sentence of sentences) {
    await tx.$executeRaw`
      INSERT INTO WordSentences (word_id, order, english, chinese, audio_url, source, created_at, updated_at)
      VALUES (${wordId}, ${sentence.number}, ${sentence.english}, ${sentence.chinese}, ${sentence.audioUrl}, ${sentence.source}, NOW(), NOW())
    `;
  }
}

async function migrateWordForms(tx: any, wordId: number, wordForms: any[]) {
  for (const wordForm of wordForms) {
    await tx.$executeRaw`
      INSERT INTO WordForms (word_id, form_type, form_word, created_at, updated_at)
      VALUES (${wordId}, ${wordForm.form}, ${wordForm.word}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      form_word = ${wordForm.word},
      updated_at = NOW()
    `;
  }
}

// 执行迁移
if (require.main === module) {
  migrateWordData()
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}

export { migrateWordData, migrateSingleWord };