// 诊断数据库中的词性和词形数据
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseWordData() {
  try {
    console.log('🔍 诊断数据库中的词性和词形数据...\n');

    // 1. 检查几个示例单词
    const sampleWords = await prisma.word.findMany({
      take: 5,
      select: {
        id: true,
        wordText: true,
        status: true
      }
    });

    console.log('📝 示例单词列表:');
    sampleWords.forEach(word => {
      console.log(`  - ${word.wordText} (ID: ${word.id}, Status: ${word.status})`);
    });

    if (sampleWords.length === 0) {
      console.log('❌ 数据库中没有找到单词数据');
      return;
    }

    // 2. 检查每个单词的详细数据
    for (const word of sampleWords) {
      console.log(`\n🔎 检查单词 "${word.wordText}" 的详细数据:`);

      // 检查词形变化
      const wordForms = await prisma.wordForm.findMany({
        where: { wordId: word.id }
      });
      console.log(`  📝 词形变化: ${wordForms.length} 条记录`);
      wordForms.forEach(form => {
        console.log(`    - ${form.formType}: ${form.formWord}`);
      });

      // 检查释义数据
      const definitions = await prisma.wordDefinition.findMany({
        where: { wordId: word.id },
        select: {
          id: true,
          type: true,
          partOfSpeech: true,
          meaning: true,
          chineseMeaning: true,
          englishMeaning: true
        }
      });
      console.log(`  📖 释义数据: ${definitions.length} 条记录`);
      definitions.forEach(def => {
        console.log(`    - ${def.type}: ${def.partOfSpeech || '无词性'} | ${def.meaning || def.chineseMeaning || def.englishMeaning || '无内容'}`);
      });

      // 检查发音数据
      const pronunciations = await prisma.wordPronunciation.findMany({
        where: { wordId: word.id }
      });
      console.log(`  🔊 发音数据: ${pronunciations.length} 条记录`);
      pronunciations.forEach(pron => {
        console.log(`    - ${pron.type}: ${pron.phonetic}`);
      });
    }

    // 3. 统计整体数据情况
    console.log('\n📊 整体数据统计:');
    const totalWords = await prisma.word.count();
    const totalWordForms = await prisma.wordForm.count();
    const totalDefinitions = await prisma.wordDefinition.count();
    const definitionsWithPartOfSpeech = await prisma.wordDefinition.count({
      where: { partOfSpeech: { not: null } }
    });

    console.log(`  - 单词总数: ${totalWords}`);
    console.log(`  - 词形变化总数: ${totalWordForms}`);
    console.log(`  - 释义总数: ${totalDefinitions}`);
    console.log(`  - 有词性的释义数: ${definitionsWithPartOfSpeech}`);
    console.log(`  - 有词性释义比例: ${totalDefinitions > 0 ? (definitionsWithPartOfSpeech / totalDefinitions * 100).toFixed(1) : 0}%`);

  } catch (error) {
    console.error('❌ 诊断过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  diagnoseWordData();
}

module.exports = { diagnoseWordData };