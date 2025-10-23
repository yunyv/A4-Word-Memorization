import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 监控事件类型
export interface MigrationEvent {
  type: 'start' | 'progress' | 'warning' | 'error' | 'complete';
  timestamp: Date;
  data: any;
}

// 监控指标
export interface MigrationMetrics {
  startTime: Date;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  processedWords: number;
  totalWords: number;
  errors: number;
  warnings: number;
  estimatedTimeRemaining?: number;
  processingRate?: number; // words per minute
}

// 监控配置
export interface MonitoringConfig {
  enableRealTimeUpdates: boolean;
  updateInterval: number; // milliseconds
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetricsCollection: boolean;
  enableAlerts: boolean;
  logToFile: boolean;
  logFileName: string;
}

// 默认配置
const DEFAULT_CONFIG: MonitoringConfig = {
  enableRealTimeUpdates: true,
  updateInterval: 1000,
  logLevel: 'info',
  enableMetricsCollection: true,
  enableAlerts: true,
  logToFile: true,
  logFileName: 'migration-monitor.log'
};

// 迁移监控器
export class MigrationMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: MigrationMetrics;
  private logBuffer: string[] = [];
  private updateTimer?: NodeJS.Timeout;
  private lastProgressUpdate?: Date;

  constructor(config: MonitoringConfig = DEFAULT_CONFIG) {
    super();
    this.config = config;
    this.metrics = {
      startTime: new Date(),
      currentStep: 'initializing',
      totalSteps: 0,
      completedSteps: 0,
      processedWords: 0,
      totalWords: 0,
      errors: 0,
      warnings: 0
    };
  }

  // 开始监控
  start(totalSteps: number, totalWords: number): void {
    this.metrics.totalSteps = totalSteps;
    this.metrics.totalWords = totalWords;
    this.metrics.currentStep = 'starting';
    this.metrics.startTime = new Date();
    this.lastProgressUpdate = new Date();

    this.log('info', '迁移监控已启动', {
      totalSteps,
      totalWords
    });

    if (this.config.enableRealTimeUpdates) {
      this.startRealTimeUpdates();
    }

    this.emitEvent('start', {
      totalSteps,
      totalWords,
      startTime: this.metrics.startTime
    });
  }

  // 更新步骤
  updateStep(stepName: string, stepNumber?: number): void {
    this.metrics.currentStep = stepName;
    if (stepNumber !== undefined) {
      this.metrics.completedSteps = stepNumber;
    }

    this.log('info', `进入步骤: ${stepName}`, {
      step: stepName,
      completedSteps: this.metrics.completedSteps,
      totalSteps: this.metrics.totalSteps
    });

    this.emitEvent('progress', {
      step: stepName,
      completedSteps: this.metrics.completedSteps,
      totalSteps: this.metrics.totalSteps,
      progress: this.calculateProgress()
    });
  }

  // 更新处理进度
  updateProgress(processedWords: number): void {
    const now = new Date();
    const timeDiff = now.getTime() - (this.lastProgressUpdate?.getTime() || now.getTime());
    
    this.metrics.processedWords = processedWords;
    
    // 计算处理速率
    if (timeDiff > 0 && this.config.enableMetricsCollection) {
      const wordsProcessed = processedWords - (this.metrics.processedWords || 0);
      this.metrics.processingRate = (wordsProcessed / timeDiff) * 60000; // words per minute
    }
    
    // 计算剩余时间
    if (this.metrics.processingRate && this.metrics.processingRate > 0) {
      const remainingWords = this.metrics.totalWords - processedWords;
      this.metrics.estimatedTimeRemaining = (remainingWords / this.metrics.processingRate) * 60000; // milliseconds
    }

    this.lastProgressUpdate = now;

    this.log('debug', '进度更新', {
      processedWords,
      totalWords: this.metrics.totalWords,
      progress: this.calculateProgress(),
      processingRate: this.metrics.processingRate,
      estimatedTimeRemaining: this.metrics.estimatedTimeRemaining
    });

    this.emitEvent('progress', {
      processedWords,
      totalWords: this.metrics.totalWords,
      progress: this.calculateProgress(),
      processingRate: this.metrics.processingRate,
      estimatedTimeRemaining: this.metrics.estimatedTimeRemaining
    });
  }

  // 记录错误
  recordError(error: Error | string, context?: any): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.metrics.errors++;

    this.log('error', errorMessage, context);

    this.emitEvent('error', {
      error: errorMessage,
      context,
      errorCount: this.metrics.errors
    });

    // 如果启用警报，发送错误警报
    if (this.config.enableAlerts) {
      this.sendAlert('error', errorMessage, context);
    }
  }

  // 记录警告
  recordWarning(warning: string, context?: any): void {
    this.metrics.warnings++;

    this.log('warn', warning, context);

    this.emitEvent('warning', {
      warning,
      context,
      warningCount: this.metrics.warnings
    });
  }

  // 完成监控
  complete(): void {
    this.metrics.currentStep = 'completed';
    this.metrics.completedSteps = this.metrics.totalSteps;

    const duration = new Date().getTime() - this.metrics.startTime.getTime();
    const averageProcessingRate = this.metrics.totalWords / (duration / 60000); // words per minute

    this.log('info', '迁移已完成', {
      duration,
      totalWords: this.metrics.totalWords,
      errors: this.metrics.errors,
      warnings: this.metrics.warnings,
      averageProcessingRate
    });

    this.emitEvent('complete', {
      duration,
      totalWords: this.metrics.totalWords,
      errors: this.metrics.errors,
      warnings: this.metrics.warnings,
      averageProcessingRate
    });

    this.stopRealTimeUpdates();
    this.flushLogs();
  }

  // 获取当前指标
  getMetrics(): MigrationMetrics {
    return { ...this.metrics };
  }

  // 计算进度百分比
  private calculateProgress(): number {
    if (this.metrics.totalWords === 0) return 0;
    return Math.round((this.metrics.processedWords / this.metrics.totalWords) * 100);
  }

  // 启动实时更新
  private startRealTimeUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.emitEvent('progress', {
        currentStep: this.metrics.currentStep,
        processedWords: this.metrics.processedWords,
        totalWords: this.metrics.totalWords,
        progress: this.calculateProgress(),
        processingRate: this.metrics.processingRate,
        estimatedTimeRemaining: this.metrics.estimatedTimeRemaining
      });
    }, this.config.updateInterval);
  }

  // 停止实时更新
  private stopRealTimeUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  // 记录日志
  public log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    this.logBuffer.push(logEntry);
    
    if (data) {
      this.logBuffer.push(JSON.stringify(data, null, 2));
    }

    // 控制台输出
    if (this.shouldLog(level)) {
      console.log(logEntry);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }

    // 定期刷新日志到文件
    if (this.config.logToFile && this.logBuffer.length >= 100) {
      this.flushLogs();
    }
  }

  // 判断是否应该记录日志
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  // 刷新日志到文件
  private flushLogs(): void {
    if (!this.config.logToFile || this.logBuffer.length === 0) return;

    try {
      const fs = require('fs').promises;
      fs.appendFile(this.config.logFileName, this.logBuffer.join('\n') + '\n');
      this.logBuffer = [];
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  // 发送事件
  private emitEvent(type: MigrationEvent['type'], data: any): void {
    const event: MigrationEvent = {
      type,
      timestamp: new Date(),
      data
    };

    this.emit(type, event);
    this.emit('event', event);
  }

  // 发送警报
  private sendAlert(type: 'error' | 'warning', message: string, context?: any): void {
    // 这里可以实现各种警报方式，如邮件、短信、Slack等
    console.log(`🚨 ${type.toUpperCase()} ALERT: ${message}`);
    if (context) {
      console.log('Context:', context);
    }
  }
}

// 数据库监控器
export class DatabaseMonitor {
  private monitor: MigrationMonitor;
  private checkInterval?: NodeJS.Timeout;

  constructor(monitor: MigrationMonitor) {
    this.monitor = monitor;
  }

  // 开始数据库监控
  start(intervalMs: number = 30000): void {
    this.checkInterval = setInterval(async () => {
      await this.checkDatabaseHealth();
    }, intervalMs);

    this.monitor.log('info', '数据库监控已启动', { interval: intervalMs });
  }

  // 停止数据库监控
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.monitor.log('info', '数据库监控已停止');
  }

  // 检查数据库健康状况
  private async checkDatabaseHealth(): Promise<void> {
    try {
      // 检查数据库连接
      await prisma.$queryRaw`SELECT 1`;

      // 检查表大小和记录数
      const wordCount = await prisma.word.count();
      const pronunciationCount = await prisma.wordPronunciation.count();
      const definitionCount = await prisma.wordDefinition.count();

      this.monitor.log('debug', '数据库健康检查', {
        wordCount,
        pronunciationCount,
        definitionCount
      });

      // 检查是否有异常增长
      if (wordCount === 0) {
        this.monitor.recordWarning('单词表为空', {
          table: 'Words',
          count: wordCount
        });
      }

    } catch (error) {
      this.monitor.recordError('数据库健康检查失败', error);
    }
  }
}

// 性能监控器
export class PerformanceMonitor {
  private monitor: MigrationMonitor;
  private metrics: Map<string, number[]> = new Map();
  private startTime: number = 0;

  constructor(monitor: MigrationMonitor) {
    this.monitor = monitor;
  }

  // 开始性能监控
  start(): void {
    this.startTime = Date.now();
    this.monitor.log('info', '性能监控已启动');
  }

  // 记录操作时间
  recordOperation(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    this.metrics.get(operation)!.push(duration);
    
    // 记录慢操作
    if (duration > 5000) { // 5秒
      this.monitor.recordWarning(`慢操作检测: ${operation}`, {
        operation,
        duration
      });
    }
  }

  // 测量操作执行时间
  async measureOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.recordOperation(operation, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitor.recordError(`操作失败: ${operation}`, {
        operation,
        duration,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // 获取性能统计
  getStatistics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [operation, durations] of this.metrics.entries()) {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      stats[operation] = {
        avg: Math.round(avg),
        min,
        max,
        count: durations.length
      };
    }
    
    return stats;
  }

  // 生成性能报告
  generateReport(): void {
    const stats = this.getStatistics();
    const totalTime = Date.now() - this.startTime;
    
    this.monitor.log('info', '性能报告', {
      totalTime,
      operations: stats
    });
  }
}

export { DEFAULT_CONFIG };