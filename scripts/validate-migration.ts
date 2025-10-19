import { PrismaClient } from '@prisma/client';
import { ValidationResult } from '../src/types/word';

const prisma = new PrismaClient();

async function validateMigration(): Promise<ValidationResult> {
  const result: ValidationResult = {
    totalWords: 0,
    wordsWithJson: 0,
    wordsWithPronunciations: 0,
    wordsWithDefinitions: 0,
    wordsWithSentences: 0,
    wordsWithForms: 0,
    inconsistencies: []
  };

  try {
    // 获取所有单词
    const words = await prisma.word.findMany();
    result.totalWords = words.length;

    for (const word of words) {
      // 检查JSON数据
      if (word.definitionData) {
        result.wordsWithJson++;
      }

      // 检查发音数据
      const pronunciations = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM WordPronunciations WHERE word_id = ${word.id}
      ` as Array<{ count: bigint }>;
      if (pronunciations[0].count > 0) {
        result.wordsWithPronunciations++;
      }

      // 检查释义数据
      const definitions = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM WordDefinitions WHERE word_id = ${word.id}
      ` as Array<{ count: bigint }>;
      if (definitions[0].count > 0) {
        result.wordsWithDefinitions++;
      }

      // 检查例句数据
      const sentences = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM WordSentences WHERE word_id = ${word.id}
      ` as Array<{ count: bigint }>;
      if (sentences[0].count > 0) {
        result.wordsWithSentences++;
      }

      // 检查词形数据
      const forms = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM WordForms WHERE word_id = ${word.id}
      ` as Array<{ count: bigint }>;
      if (forms[0].count > 0) {
        result.wordsWithForms++;
      }

      // 检查数据一致性
      if (word.definitionData && !pronunciations && !definitions && !sentences && !forms) {
        result.inconsistencies.push({
          word: word.wordText,
          issue: '有JSON数据但没有迁移到新表结构'
        });
      }
    }

    // 输出验证结果
    console.log('=== 数据验证结果 ===');
    console.log(`总单词数: ${result.totalWords}`);
    console.log(`有JSON数据的单词: ${result.wordsWithJson}`);
    console.log(`有发音数据的单词: ${result.wordsWithPronunciations}`);
    console.log(`有释义数据的单词: ${result.wordsWithDefinitions}`);
    console.log(`有例句数据的单词: ${result.wordsWithSentences}`);
    console.log(`有词形数据的单词: ${result.wordsWithForms}`);
    console.log(`数据不一致数量: ${result.inconsistencies.length}`);

    if (result.inconsistencies.length > 0) {
      console.log('\n不一致详情:');
      result.inconsistencies.forEach(inc => console.log(`- ${inc.word}: ${inc.issue}`));
    }

    return result;
  } catch (error) {
    console.error('验证过程中发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行验证
if (require.main === module) {
  validateMigration()
    .then(() => {
      console.log('验证完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('验证失败:', error);
      process.exit(1);
    });
}

export { validateMigration };