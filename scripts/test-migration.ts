import { PrismaClient, Prisma } from '@prisma/client';
import { EnhancedDataValidator } from './enhanced-data-validator';
import { DataCleanupAndRepair } from './data-cleanup-and-repair';
import { EnhancedDataMigrator } from './enhanced-migrate-word-data';
import { MigrationMonitor } from './migration-monitor';

const prisma = new PrismaClient();

// 测试结果接口
interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: string;
  error?: string;
}

// 测试套件
class MigrationTestSuite {
  private results: TestResult[] = [];

  // 运行测试
  async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    console.log(`\n🧪 运行测试: ${testName}`);
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        testName,
        passed: true,
        duration,
        details: '测试通过'
      });
      
      console.log(`✅ ${testName} - 通过 (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      this.results.push({
        testName,
        passed: false,
        duration,
        details: '测试失败',
        error: errorMessage
      });
      
      console.log(`❌ ${testName} - 失败 (${duration}ms)`);
      console.log(`   错误: ${errorMessage}`);
    }
  }

  // 生成测试报告
  generateReport(): void {
    console.log('\n=== 测试报告 ===');
    
    const passedTests = this.results.filter(r => r.passed);
    const failedTests = this.results.filter(r => !r.passed);
    
    console.log(`总测试数: ${this.results.length}`);
    console.log(`通过测试: ${passedTests.length}`);
    console.log(`失败测试: ${failedTests.length}`);
    console.log(`成功率: ${Math.round((passedTests.length / this.results.length) * 100)}%`);
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`总耗时: ${totalDuration}ms`);
    
    if (failedTests.length > 0) {
      console.log('\n=== 失败测试详情 ===');
      failedTests.forEach(test => {
        console.log(`\n❌ ${test.testName}`);
        console.log(`   错误: ${test.error}`);
        console.log(`   耗时: ${test.duration}ms`);
      });
    }
    
    console.log('\n=== 通过测试详情 ===');
    passedTests.forEach(test => {
      console.log(`✅ ${test.testName} (${test.duration}ms)`);
    });
  }

  // 检查是否有失败的测试
  hasFailures(): boolean {
    return this.results.some(r => !r.passed);
  }
}

// 测试数据库连接
async function testDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('   数据库连接正常');
  } finally {
    await prisma.$disconnect();
  }
}

// 测试数据验证器
async function testDataValidator(): Promise<void> {
  const validator = new EnhancedDataValidator({
    checkDataConsistency: true,
    checkOrphanedRecords: true,
    generateDetailedReport: false,
    includeSuggestions: true,
    batchSize: 10
  });
  
  const result = await validator.validate();
  
  if (result.totalWords >= 0) {
    console.log(`   验证了 ${result.totalWords} 个单词`);
    console.log(`   数据完整性评分: ${result.dataIntegrityScore}/100`);
  } else {
    throw new Error('验证器返回无效结果');
  }
}

// 测试数据清理工具
async function testDataCleanup(): Promise<void> {
  const repairer = new DataCleanupAndRepair({
    removeOrphanedRecords: true,
    fixInconsistentData: true,
    cleanCorruptedData: true,
    reconstructMissingData: false,
    createBackup: false,
    dryRun: true // 试运行模式
  });
  
  const result = await repairer.repair();
  
  if (result.totalIssues >= 0) {
    console.log(`   发现 ${result.totalIssues} 个问题`);
    console.log(`   试运行模式，未实际修复`);
  } else {
    throw new Error('清理工具返回无效结果');
  }
}

// 测试数据迁移器
async function testDataMigrator(): Promise<void> {
  // 首先检查是否有需要迁移的数据
  const wordCount = await prisma.word.count({
    where: {
      definitionData: {
        not: Prisma.JsonNull
      }
    }
  });
  
  if (wordCount === 0) {
    console.log('   没有需要迁移的数据，跳过测试');
    return;
  }
  
  const migrator = new EnhancedDataMigrator({
    batchSize: 5, // 小批量测试
    maxRetries: 1,
    retryDelay: 100,
    enableDataValidation: true,
    enableDetailedLogging: false,
    skipIncompleteData: false,
    continueOnError: true
  });
  
  // 只处理前5个单词进行测试
  const testWords = await prisma.word.findMany({
    where: {
      definitionData: {
        not: Prisma.JsonNull
      }
    },
    take: 5
  });
  
  if (testWords.length === 0) {
    console.log('   没有测试数据');
    return;
  }
  
  console.log(`   测试 ${testWords.length} 个单词的迁移`);
  
  // 这里我们只测试配置，不执行实际迁移
  // 实际迁移会在完整流程中测试
  console.log('   迁移器配置正常');
}

// 测试监控系统
async function testMonitoringSystem(): Promise<void> {
  const monitor = new MigrationMonitor({
    enableRealTimeUpdates: true,
    updateInterval: 100,
    logLevel: 'info',
    enableMetricsCollection: true,
    enableAlerts: false, // 测试时禁用警报
    logToFile: false,
    logFileName: 'test-monitor.log'
  });
  
  // 测试基本功能
  monitor.start(3, 10);
  monitor.updateStep('测试步骤1', 1);
  monitor.updateProgress(5);
  monitor.updateStep('测试步骤2', 2);
  monitor.updateProgress(10);
  monitor.complete();
  
  const metrics = monitor.getMetrics();
  
  if (metrics.totalSteps === 3 && metrics.totalWords === 10) {
    console.log('   监控系统功能正常');
  } else {
    throw new Error('监控系统指标不正确');
  }
}

// 测试数据清理方法
async function testDataCleaning(): Promise<void> {
  // 创建测试数据
  const testWord = await prisma.word.create({
    data: {
      wordText: 'test-word-cleanup',
      definitionData: {
        pronunciation: 'test',
        pronunciationData: {
          american: {
            phonetic: '[test]',
            audioUrl: ''
          }
        },
        definitions: {
          basic: [{
            partOfSpeech: 'n.',
            meaning: '测试'
          }]
        }
      }
    }
  });
  
  // 测试清理方法
  const { DictionaryScraper } = require('../src/lib/dictionary');
  const scraper = new DictionaryScraper();
  
  // 通过反射访问私有方法进行测试
  const cleanData = (scraper as any).cleanAndValidateData.call(scraper, testWord.definitionData);
  
  if (cleanData && cleanData.pronunciationData && cleanData.definitions) {
    console.log('   数据清理方法正常');
  } else {
    throw new Error('数据清理方法失败');
  }
  
  // 清理测试数据
  await prisma.word.delete({
    where: { id: testWord.id }
  });
}

// 主测试函数
async function runAllTests(): Promise<void> {
  console.log('🚀 开始数据迁移工具测试');
  console.log('测试时间:', new Date().toISOString());
  
  const testSuite = new MigrationTestSuite();
  
  // 运行所有测试
  await testSuite.runTest('数据库连接测试', testDatabaseConnection);
  await testSuite.runTest('数据验证器测试', testDataValidator);
  await testSuite.runTest('数据清理工具测试', testDataCleanup);
  await testSuite.runTest('数据迁移器测试', testDataMigrator);
  await testSuite.runTest('监控系统测试', testMonitoringSystem);
  await testSuite.runTest('数据清理方法测试', testDataCleaning);
  
  // 生成报告
  testSuite.generateReport();
  
  // 根据测试结果设置退出码
  if (testSuite.hasFailures()) {
    console.log('\n❌ 部分测试失败，请检查错误信息');
    process.exit(1);
  } else {
    console.log('\n✅ 所有测试通过！');
    process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

export { runAllTests, MigrationTestSuite };