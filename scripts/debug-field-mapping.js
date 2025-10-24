// 调试字段映射问题
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugFieldMapping() {
  try {
    console.log('🔍 调试数据库字段映射问题...\n');

    // 检查一个有词形变化的单词
    const wordWithForms = await prisma.word.findFirst({
      where: { wordText: 'lease' },
      include: {
        wordForms: true
      }
    });

    if (wordWithForms) {
      console.log('📝 使用 Prisma include 查询的词形数据:');
      console.log(JSON.stringify(wordWithForms.wordForms, null, 2));
    }

    // 检查原始 SQL 查询结果
    const rawForms = await prisma.$queryRaw`
      SELECT * FROM WordForms WHERE word_id = (SELECT id FROM Words WHERE word_text = 'lease' LIMIT 1)
    `;

    if (rawForms && rawForms.length > 0) {
      console.log('\n📝 使用 $queryRaw 查询的词形数据:');
      console.log(JSON.stringify(rawForms, null, 2));
      console.log('\n字段名分析:');
      Object.keys(rawForms[0]).forEach(key => {
        console.log(`  - "${key}"`);
      });
    }

    // 检查释义数据的 partOfSpeech 字段
    const rawDefinitions = await prisma.$queryRaw`
      SELECT type, part_of_speech, meaning FROM WordDefinitions
      WHERE word_id = (SELECT id FROM Words WHERE word_text = 'lease' LIMIT 1)
      AND type = 'basic' LIMIT 2
    `;

    if (rawDefinitions && rawDefinitions.length > 0) {
      console.log('\n📖 使用 $queryRaw 查询的释义数据:');
      console.log(JSON.stringify(rawDefinitions, null, 2));
      console.log('\n字段名分析:');
      Object.keys(rawDefinitions[0]).forEach(key => {
        console.log(`  - "${key}"`);
      });
    }

  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  debugFieldMapping();
}

module.exports = { debugFieldMapping };