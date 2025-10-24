import { PrismaClient } from '@prisma/client';
import { program } from 'commander';

const prisma = new PrismaClient();

interface DatabaseStats {
  users: number;
  wordlists: number;
  words: number;
  wordDefinitions: number;
  wordPronunciations: number;
  wordSentences: number;
  wordForms: number;
  userWordProgress: number;
  wordlistEntries: number;
  definitionExamples: number;
  definitionIdioms: number;
  idiomExamples: number;
}

async function getDatabaseStats(): Promise<DatabaseStats> {
  const [
    users,
    wordlists,
    words,
    wordDefinitions,
    wordPronunciations,
    wordSentences,
    wordForms,
    userWordProgress,
    wordlistEntries,
    definitionExamples,
    definitionIdioms,
    idiomExamples
  ] = await Promise.all([
    prisma.user.count(),
    prisma.wordlist.count(),
    prisma.word.count(),
    prisma.wordDefinition.count(),
    prisma.wordPronunciation.count(),
    prisma.wordSentence.count(),
    prisma.wordForm.count(),
    prisma.userWordProgress.count(),
    prisma.wordlistEntry.count(),
    prisma.definitionExample.count(),
    prisma.definitionIdiom.count(),
    prisma.idiomExample.count()
  ]);

  return {
    users,
    wordlists,
    words,
    wordDefinitions,
    wordPronunciations,
    wordSentences,
    wordForms,
    userWordProgress,
    wordlistEntries,
    definitionExamples,
    definitionIdioms,
    idiomExamples
  };
}

function printStats(stats: DatabaseStats): void {
  console.log('\n📊 数据库当前统计:');
  console.log('='.repeat(50));
  console.log(`👥 用户数: ${stats.users}`);
  console.log(`📚 词书数: ${stats.wordlists}`);
  console.log(`📝 单词数: ${stats.words}`);
  console.log(`📖 释义数: ${stats.wordDefinitions}`);
  console.log(`🔊 发音数: ${stats.wordPronunciations}`);
  console.log(`📄 例句数: ${stats.wordSentences}`);
  console.log(`🔄 词形数: ${stats.wordForms}`);
  console.log(`📈 学习进度: ${stats.userWordProgress}`);
  console.log(`📋 词书条目: ${stats.wordlistEntries}`);
  console.log(`💬 释义例句: ${stats.definitionExamples}`);
  console.log(`🗣️ 释义习语: ${stats.definitionIdioms}`);
  console.log(`📝 习语例句: ${stats.idiomExamples}`);
  console.log('='.repeat(50));
}

async function clearDatabaseCascade(): Promise<void> {
  console.log('\n🔄 使用级联删除策略清空数据库...');

  // 由于设置了 onDelete: Cascade，只需要删除两个根表
  const startTime = Date.now();

  await prisma.$transaction(async (tx) => {
    console.log('🗑️  删除所有用户及相关数据...');
    await tx.user.deleteMany({});

    console.log('🗑️  删除所有单词及相关数据...');
    await tx.word.deleteMany({});
  });

  const duration = Date.now() - startTime;
  console.log(`✅ 级联删除完成，耗时: ${duration}ms`);
}

async function clearDatabaseSequential(): Promise<void> {
  console.log('\n🔄 使用顺序删除策略清空数据库...');

  const startTime = Date.now();

  await prisma.$transaction(async (tx) => {
    // 从叶子节点开始删除
    console.log('🗑️  删除习语例句...');
    await tx.idiomExample.deleteMany({});

    console.log('🗑️  删除释义习语...');
    await tx.definitionIdiom.deleteMany({});

    console.log('🗑️  删除释义例句...');
    await tx.definitionExample.deleteMany({});

    console.log('🗑️  删除单词发音...');
    await tx.wordPronunciation.deleteMany({});

    console.log('🗑️  删除单词例句...');
    await tx.wordSentence.deleteMany({});

    console.log('🗑️  删除词形变换...');
    await tx.wordForm.deleteMany({});

    console.log('🗑️  删除学习进度...');
    await tx.userWordProgress.deleteMany({});

    console.log('🗑️  删除词书条目...');
    await tx.wordlistEntry.deleteMany({});

    console.log('🗑️  删除单词释义...');
    await tx.wordDefinition.deleteMany({});

    console.log('🗑️  删除词书...');
    await tx.wordlist.deleteMany({});

    console.log('🗑️  删除单词...');
    await tx.word.deleteMany({});

    console.log('🗑️  删除用户...');
    await tx.user.deleteMany({});
  });

  const duration = Date.now() - startTime;
  console.log(`✅ 顺序删除完成，耗时: ${duration}ms`);
}

async function verifyDatabaseCleared(): Promise<void> {
  console.log('\n🔍 验证数据库清空结果...');

  const stats = await getDatabaseStats();
  const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);

  if (totalRecords === 0) {
    console.log('✅ 数据库已完全清空！');
  } else {
    console.log('⚠️  警告：数据库中仍有数据：');
    printStats(stats);
    throw new Error('数据库清空不完整');
  }
}

async function testDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  program
    .name('clear-database')
    .description('清空 A4 Recite 数据库')
    .option('-d, --dry-run', '预览模式，不实际删除数据')
    .option('-s, --strategy <type>', '清空策略：cascade（级联删除）或 sequential（顺序删除）', 'cascade')
    .option('-y, --yes', '跳过确认提示')
    .parse();

  const options = program.opts();

  try {
    console.log('🚀 开始数据库清空操作...');

    // 测试数据库连接
    await testDatabaseConnection();

    // 获取当前数据统计
    const stats = await getDatabaseStats();
    printStats(stats);

    const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);

    if (totalRecords === 0) {
      console.log('ℹ️  数据库已经是空的，无需操作');
      return;
    }

    // 确认操作
    if (!options.yes && !options.dryRun) {
      console.log('\n⚠️  警告：此操作将删除数据库中的所有数据！');
      console.log('📅 此操作不可撤销，请确认是否继续？');
      console.log('💡 如需预览而不执行，请使用 --dry-run 参数');

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('请输入 "DELETE" 确认删除操作: ', resolve);
      });

      rl.close();

      if (answer !== 'DELETE') {
        console.log('❌ 操作已取消');
        return;
      }
    }

    if (options.dryRun) {
      console.log('🔍 预览模式：不会实际删除数据');
      console.log(`📋 将使用 ${options.strategy} 策略删除 ${totalRecords} 条记录`);
      return;
    }

    // 执行清空操作
    const startTime = Date.now();

    switch (options.strategy) {
      case 'cascade':
        await clearDatabaseCascade();
        break;
      case 'sequential':
        await clearDatabaseSequential();
        break;
      default:
        throw new Error(`未知的清空策略: ${options.strategy}`);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`🎉 数据库清空完成！总耗时: ${totalDuration}ms`);

    // 验证结果
    await verifyDatabaseCleared();

  } catch (error) {
    console.error('❌ 数据库清空失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

export { main as clearDatabase, getDatabaseStats, printStats };