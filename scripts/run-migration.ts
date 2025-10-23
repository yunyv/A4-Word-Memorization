#!/usr/bin/env node

import { Command } from 'commander';
import { EnhancedDataMigrator, MigrationConfig } from './enhanced-migrate-word-data';
import { EnhancedDataValidator, ValidationConfig } from './enhanced-data-validator';
import { DataCleanupAndRepair, RepairConfig } from './data-cleanup-and-repair';
import { MigrationMonitor, DatabaseMonitor, PerformanceMonitor } from './migration-monitor';

const program = new Command();

// 全局选项
program
  .name('migration-cli')
  .description('数据迁移和验证工具')
  .version('1.0.0');

// 迁移命令
program
  .command('migrate')
  .description('执行数据迁移')
  .option('-b, --batch-size <number>', '批处理大小', '50')
  .option('-r, --max-retries <number>', '最大重试次数', '3')
  .option('-d, --retry-delay <number>', '重试延迟(毫秒)', '1000')
  .option('--no-validation', '跳过数据验证')
  .option('--no-detailed-logging', '禁用详细日志')
  .option('--skip-incomplete', '跳过不完整数据')
  .option('--stop-on-error', '遇到错误时停止')
  .option('--dry-run', '试运行模式')
  .action(async (options) => {
    const monitor = new MigrationMonitor({
      enableRealTimeUpdates: true,
      updateInterval: 2000,
      logLevel: options.detailedLogging ? 'debug' : 'info',
      enableMetricsCollection: true,
      enableAlerts: true,
      logToFile: true,
      logFileName: 'migration.log'
    });

    const dbMonitor = new DatabaseMonitor(monitor);
    const perfMonitor = new PerformanceMonitor(monitor);

    try {
      // 设置事件监听器
      setupEventListeners(monitor);

      // 启动监控
      dbMonitor.start();
      perfMonitor.start();

      // 配置迁移参数
      const config: MigrationConfig = {
        batchSize: parseInt(options.batchSize),
        maxRetries: parseInt(options.maxRetries),
        retryDelay: parseInt(options.retryDelay),
        enableDataValidation: options.validation,
        enableDetailedLogging: options.detailedLogging,
        skipIncompleteData: options.skipIncomplete,
        continueOnError: !options.stopOnError
      };

      console.log('开始数据迁移...');
      console.log('配置:', config);

      // 创建迁移器并执行
      const migrator = new EnhancedDataMigrator(config);
      
      // 包装迁移器以添加监控
      const monitoredMigrator = createMonitoredMigrator(migrator, monitor, perfMonitor);
      
      const stats = await monitoredMigrator.migrate();

      // 生成最终报告
      perfMonitor.generateReport();
      monitor.complete();

      console.log('\n=== 迁移完成 ===');
      console.log(`总单词数: ${stats.totalWords}`);
      console.log(`成功迁移: ${stats.migratedWords}`);
      console.log(`跳过单词: ${stats.skippedWords}`);
      console.log(`处理单词: ${stats.processedWords}`);
      console.log(`重试次数: ${stats.retriedWords}`);
      console.log(`错误数量: ${stats.errors.length}`);
      
      if (stats.duration) {
        console.log(`总耗时: ${Math.round(stats.duration / 1000)}秒`);
      }

      if (stats.errors.length > 0) {
        console.log('\n错误详情:');
        stats.errors.forEach(err => {
          console.log(`- ${err.word}: ${err.error}`);
        });
        process.exit(1);
      }

    } catch (error) {
      monitor.recordError('迁移失败', error);
      console.error('迁移失败:', error);
      process.exit(1);
    } finally {
      dbMonitor.stop();
    }
  });

// 验证命令
program
  .command('validate')
  .description('执行数据验证')
  .option('--no-consistency-check', '跳过一致性检查')
  .option('--no-orphaned-check', '跳过孤立记录检查')
  .option('--no-detailed-report', '不生成详细报告')
  .option('--no-suggestions', '不包含修复建议')
  .option('-b, --batch-size <number>', '批处理大小', '100')
  .action(async (options) => {
    try {
      console.log('开始数据验证...');

      const config: ValidationConfig = {
        checkDataConsistency: options.consistencyCheck,
        checkOrphanedRecords: options.orphanedCheck,
        generateDetailedReport: options.detailedReport,
        includeSuggestions: options.suggestions,
        batchSize: parseInt(options.batchSize)
      };

      const validator = new EnhancedDataValidator(config);
      const result = await validator.validate();

      console.log('\n=== 验证完成 ===');
      console.log(`数据完整性评分: ${result.dataIntegrityScore}/100`);
      console.log(`总单词数: ${result.totalWords}`);
      console.log(`有JSON数据的单词: ${result.wordsWithJson}`);
      console.log(`有发音数据的单词: ${result.wordsWithPronunciations}`);
      console.log(`有释义数据的单词: ${result.wordsWithDefinitions}`);
      console.log(`有例句数据的单词: ${result.wordsWithSentences}`);
      console.log(`有词形数据的单词: ${result.wordsWithForms}`);
      console.log(`数据不一致数量: ${result.inconsistencies.length}`);

      if (result.inconsistencies.length > 0) {
        console.log('\n不一致详情:');
        result.inconsistencies.forEach(inc => {
          console.log(`- ${inc.word}: ${inc.issue}`);
        });
      }

      // 根据评分设置退出码
      if (result.dataIntegrityScore < 70) {
        console.log('\n数据完整性较低，建议运行修复工具');
        process.exit(1);
      }

    } catch (error) {
      console.error('验证失败:', error);
      process.exit(1);
    }
  });

// 修复命令
program
  .command('repair')
  .description('执行数据修复')
  .option('--no-orphaned-removal', '不移除孤立记录')
  .option('--no-inconsistency-fix', '不修复不一致数据')
  .option('--no-corrupted-cleanup', '不清理损坏数据')
  .option('--reconstruct-missing', '重构缺失数据')
  .option('--no-backup', '不创建备份')
  .option('--dry-run', '试运行模式')
  .action(async (options) => {
    try {
      console.log('开始数据修复...');

      const config: RepairConfig = {
        removeOrphanedRecords: options.orphanedRemoval,
        fixInconsistentData: options.inconsistencyFix,
        cleanCorruptedData: options.corruptedCleanup,
        reconstructMissingData: options.reconstructMissing,
        createBackup: options.backup,
        dryRun: options.dryRun
      };

      const repairer = new DataCleanupAndRepair(config);
      const result = await repairer.repair();

      console.log('\n=== 修复完成 ===');
      console.log(`总问题数: ${result.totalIssues}`);
      console.log(`已修复问题数: ${result.fixedIssues}`);
      console.log(`修复失败数: ${result.failedRepairs.length}`);

      console.log('\n修复详情:');
      console.log(`移除孤立记录: ${result.repairDetails.orphanedRecordsRemoved}`);
      console.log(`修复不一致数据: ${result.repairDetails.inconsistentDataFixed}`);
      console.log(`清理损坏数据: ${result.repairDetails.corruptedDataCleaned}`);
      console.log(`重构缺失数据: ${result.repairDetails.missingDataReconstructed}`);

      if (result.failedRepairs.length > 0) {
        console.log('\n修复失败:');
        result.failedRepairs.forEach(failure => {
          console.log(`- ${failure.wordText}: ${failure.error}`);
        });
        process.exit(1);
      }

    } catch (error) {
      console.error('修复失败:', error);
      process.exit(1);
    }
  });

// 完整流程命令
program
  .command('full-process')
  .description('执行完整的迁移流程：验证 -> 修复 -> 迁移 -> 验证')
  .option('--skip-repair', '跳过修复步骤')
  .option('--skip-final-validation', '跳过最终验证')
  .option('--dry-run', '试运行模式（只执行验证）')
  .action(async (options) => {
    try {
      console.log('开始完整迁移流程...\n');

      // 步骤1: 初始验证
      console.log('=== 步骤1: 初始验证 ===');
      const validator = new EnhancedDataValidator({
        checkDataConsistency: true,
        checkOrphanedRecords: true,
        generateDetailedReport: true,
        includeSuggestions: true,
        batchSize: 100
      });
      
      const initialValidation = await validator.validate();
      console.log(`初始验证完成，数据完整性评分: ${initialValidation.dataIntegrityScore}/100`);

      // 步骤2: 修复（如果需要）
      if (!options.skipRepair && !options.dryRun) {
        console.log('\n=== 步骤2: 数据修复 ===');
        const repairer = new DataCleanupAndRepair({
          removeOrphanedRecords: true,
          fixInconsistentData: true,
          cleanCorruptedData: true,
          reconstructMissingData: false,
          createBackup: true,
          dryRun: false
        });
        
        const repairResult = await repairer.repair();
        console.log(`修复完成，修复了 ${repairResult.fixedIssues} 个问题`);
      }

      // 步骤3: 迁移（如果不是试运行）
      if (!options.dryRun) {
        console.log('\n=== 步骤3: 数据迁移 ===');
        const migrator = new EnhancedDataMigrator({
          batchSize: 50,
          maxRetries: 3,
          retryDelay: 1000,
          enableDataValidation: true,
          enableDetailedLogging: true,
          skipIncompleteData: false,
          continueOnError: true
        });
        
        const migrationResult = await migrator.migrate();
        console.log(`迁移完成，处理了 ${migrationResult.processedWords} 个单词`);
      }

      // 步骤4: 最终验证
      if (!options.skipFinalValidation) {
        console.log('\n=== 步骤4: 最终验证 ===');
        const finalValidator = new EnhancedDataValidator({
          checkDataConsistency: true,
          checkOrphanedRecords: true,
          generateDetailedReport: true,
          includeSuggestions: true,
          batchSize: 100
        });
        
        const finalValidation = await finalValidator.validate();
        console.log(`最终验证完成，数据完整性评分: ${finalValidation.dataIntegrityScore}/100`);

        // 比较验证结果
        const improvement = finalValidation.dataIntegrityScore - initialValidation.dataIntegrityScore;
        console.log(`数据完整性评分提升: ${improvement} 分`);
      }

      console.log('\n=== 完整流程完成 ===');
      if (options.dryRun) {
        console.log('注意：这是试运行模式，没有执行实际迁移');
      }

    } catch (error) {
      console.error('完整流程失败:', error);
      process.exit(1);
    }
  });

// 设置事件监听器
function setupEventListeners(monitor: MigrationMonitor) {
  monitor.on('start', (event) => {
    console.log(`\n🚀 迁移开始 - ${event.data.startTime.toISOString()}`);
  });

  monitor.on('progress', (event) => {
    const { data } = event;
    if (data.progress !== undefined) {
      console.log(`📊 进度: ${data.progress}% (${data.processedWords || data.completedSteps}/${data.totalWords || data.totalSteps})`);
    }
    if (data.step) {
      console.log(`📍 当前步骤: ${data.step}`);
    }
    if (data.estimatedTimeRemaining) {
      const minutes = Math.round(data.estimatedTimeRemaining / 60000);
      console.log(`⏱️  预计剩余时间: ${minutes} 分钟`);
    }
  });

  monitor.on('warning', (event) => {
    console.log(`⚠️  警告: ${event.data.warning}`);
  });

  monitor.on('error', (event) => {
    console.log(`❌ 错误: ${event.data.error}`);
  });

  monitor.on('complete', (event) => {
    const { data } = event;
    const minutes = Math.round(data.duration / 60000);
    console.log(`\n✅ 迁移完成!`);
    console.log(`⏱️  总耗时: ${minutes} 分钟`);
    console.log(`📊 处理单词: ${data.totalWords}`);
    console.log(`⚡ 平均速率: ${Math.round(data.averageProcessingRate)} 单词/分钟`);
    if (data.errors > 0) {
      console.log(`❌ 错误数: ${data.errors}`);
    }
    if (data.warnings > 0) {
      console.log(`⚠️  警告数: ${data.warnings}`);
    }
  });
}

// 创建带监控的迁移器
function createMonitoredMigrator(migrator: EnhancedDataMigrator, monitor: MigrationMonitor, perfMonitor: PerformanceMonitor) {
  return {
    async migrate() {
      // 开始监控
      monitor.start(8, 0); // 假设8个步骤，单词数稍后更新
      
      // 获取总单词数
      const totalWords = await getTotalWordsCount();
      monitor.updateStep('获取单词列表', 1);
      monitor.updateProgress(0);
      
      // 更新总单词数
      (monitor as any).metrics.totalWords = totalWords;
      monitor.updateProgress(0);
      
      // 执行迁移
      const result = await perfMonitor.measureOperation('migration', async () => {
        return await migrator.migrate();
      });
      
      return result;
    }
  };
}

// 获取总单词数
async function getTotalWordsCount(): Promise<number> {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const count = await prisma.word.count({
      where: {
        definitionData: {
          not: null
        }
      }
    });
    return count;
  } finally {
    await prisma.$disconnect();
  }
}

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}