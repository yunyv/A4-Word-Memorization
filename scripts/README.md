# 数据迁移和验证工具

本工具集提供了完整的数据迁移、验证和修复解决方案，确保单词数据正确地从JSON格式拆解并存储到关系表中。

## 工具概述

### 1. 增强版数据迁移脚本 (`enhanced-migrate-word-data.ts`)
- 功能：将JSON数据迁移到关系表
- 特性：
  - 批处理支持
  - 错误重试机制
  - 数据验证和清理
  - 详细日志记录
  - 进度监控

### 2. 数据验证工具 (`enhanced-data-validator.ts`)
- 功能：验证数据完整性和一致性
- 特性：
  - 数据完整性评分
  - 孤立记录检测
  - 数据一致性检查
  - 详细问题报告
  - 修复建议

### 3. 数据清理和修复工具 (`data-cleanup-and-repair.ts`)
- 功能：清理和修复数据问题
- 特性：
  - 孤立记录移除
  - 不一致数据修复
  - 损坏数据清理
  - 数据备份
  - 试运行模式

### 4. 监控和日志系统 (`migration-monitor.ts`)
- 功能：实时监控迁移过程
- 特性：
  - 实时进度更新
  - 性能指标收集
  - 数据库健康监控
  - 警报系统
  - 日志记录

### 5. 统一执行脚本 (`run-migration.ts`)
- 功能：提供命令行界面
- 特性：
  - 统一入口点
  - 多种操作模式
  - 完整流程自动化
  - 丰富的命令行选项

## 安装和设置

### 1. 安装依赖
```bash
npm install commander
```

### 2. 编译TypeScript
```bash
npm run build
```

### 3. 确保数据库连接
确保`.env`文件中包含正确的数据库连接信息：
```
DATABASE_URL="mysql://root:123456@localhost:3306/your_database"
```

## 使用方法

### 命令行界面

#### 1. 执行数据迁移
```bash
# 基本迁移
npx ts-node scripts/run-migration.ts migrate

# 自定义配置
npx ts-node scripts/run-migration.ts migrate \
  --batch-size 100 \
  --max-retries 5 \
  --skip-incomplete \
  --stop-on-error

# 试运行模式
npx ts-node scripts/run-migration.ts migrate --dry-run
```

#### 2. 执行数据验证
```bash
# 基本验证
npx ts-node scripts/run-migration.ts validate

# 详细验证
npx ts-node scripts/run-migration.ts validate \
  --consistency-check \
  --orphaned-check \
  --detailed-report
```

#### 3. 执行数据修复
```bash
# 基本修复
npx ts-node scripts/run-migration.ts repair

# 安全修复（创建备份）
npx ts-node scripts/run-migration.ts repair \
  --backup \
  --dry-run
```

#### 4. 执行完整流程
```bash
# 完整流程（验证 -> 修复 -> 迁移 -> 验证）
npx ts-node scripts/run-migration.ts full-process

# 试运行完整流程（仅验证）
npx ts-node scripts/run-migration.ts full-process --dry-run
```

### 编程接口

#### 1. 数据迁移
```typescript
import { EnhancedDataMigrator, MigrationConfig } from './scripts/enhanced-migrate-word-data';

const config: MigrationConfig = {
  batchSize: 50,
  maxRetries: 3,
  retryDelay: 1000,
  enableDataValidation: true,
  enableDetailedLogging: true,
  skipIncompleteData: false,
  continueOnError: true
};

const migrator = new EnhancedDataMigrator(config);
const stats = await migrator.migrate();
```

#### 2. 数据验证
```typescript
import { EnhancedDataValidator, ValidationConfig } from './scripts/enhanced-data-validator';

const config: ValidationConfig = {
  checkDataConsistency: true,
  checkOrphanedRecords: true,
  generateDetailedReport: true,
  includeSuggestions: true,
  batchSize: 100
};

const validator = new EnhancedDataValidator(config);
const result = await validator.validate();
```

#### 3. 数据修复
```typescript
import { DataCleanupAndRepair, RepairConfig } from './scripts/data-cleanup-and-repair';

const config: RepairConfig = {
  removeOrphanedRecords: true,
  fixInconsistentData: true,
  cleanCorruptedData: true,
  reconstructMissingData: false,
  createBackup: true,
  dryRun: false
};

const repairer = new DataCleanupAndRepair(config);
const result = await repairer.repair();
```

#### 4. 监控系统
```typescript
import { MigrationMonitor, DatabaseMonitor, PerformanceMonitor } from './scripts/migration-monitor';

// 创建监控器
const monitor = new MigrationMonitor({
  enableRealTimeUpdates: true,
  updateInterval: 2000,
  logLevel: 'info',
  enableMetricsCollection: true,
  enableAlerts: true,
  logToFile: true,
  logFileName: 'migration.log'
});

// 设置事件监听器
monitor.on('progress', (event) => {
  console.log(`进度: ${event.data.progress}%`);
});

monitor.on('error', (event) => {
  console.error(`错误: ${event.data.error}`);
});

// 启动监控
monitor.start(8, totalWords);
```

## 配置选项

### 迁移配置 (MigrationConfig)
- `batchSize`: 批处理大小 (默认: 50)
- `maxRetries`: 最大重试次数 (默认: 3)
- `retryDelay`: 重试延迟毫秒数 (默认: 1000)
- `enableDataValidation`: 启用数据验证 (默认: true)
- `enableDetailedLogging`: 启用详细日志 (默认: true)
- `skipIncompleteData`: 跳过不完整数据 (默认: false)
- `continueOnError`: 遇到错误时继续 (默认: true)

### 验证配置 (ValidationConfig)
- `checkDataConsistency`: 检查数据一致性 (默认: true)
- `checkOrphanedRecords`: 检查孤立记录 (默认: true)
- `generateDetailedReport`: 生成详细报告 (默认: true)
- `includeSuggestions`: 包含修复建议 (默认: true)
- `batchSize`: 批处理大小 (默认: 100)

### 修复配置 (RepairConfig)
- `removeOrphanedRecords`: 移除孤立记录 (默认: true)
- `fixInconsistentData`: 修复不一致数据 (默认: true)
- `cleanCorruptedData`: 清理损坏数据 (默认: true)
- `reconstructMissingData`: 重构缺失数据 (默认: false)
- `createBackup`: 创建备份 (默认: true)
- `dryRun`: 试运行模式 (默认: false)

### 监控配置 (MonitoringConfig)
- `enableRealTimeUpdates`: 启用实时更新 (默认: true)
- `updateInterval`: 更新间隔毫秒数 (默认: 1000)
- `logLevel`: 日志级别 (默认: 'info')
- `enableMetricsCollection`: 启用指标收集 (默认: true)
- `enableAlerts`: 启用警报 (默认: true)
- `logToFile`: 记录到文件 (默认: true)
- `logFileName`: 日志文件名 (默认: 'migration-monitor.log')

## 输出文件

### 日志文件
- `migration.log`: 迁移过程日志
- `migration-monitor.log`: 监控系统日志
- `validation-report.json`: 验证报告
- `repair-report.json`: 修复报告

### 备份文件
- `backup-<timestamp>.json`: 数据备份（JSON格式）

## 最佳实践

### 1. 迁移前准备
```bash
# 1. 执行初始验证
npx ts-node scripts/run-migration.ts validate

# 2. 创建数据备份
npx ts-node scripts/run-migration.ts repair --backup --dry-run

# 3. 试运行迁移
npx ts-node scripts/run-migration.ts migrate --dry-run
```

### 2. 执行迁移
```bash
# 使用完整流程（推荐）
npx ts-node scripts/run-migration.ts full-process
```

### 3. 迁移后验证
```bash
# 执行最终验证
npx ts-node scripts/run-migration.ts validate --detailed-report
```

### 4. 生产环境建议
- 使用较小的批处理大小（20-30）
- 启用详细日志记录
- 创建数据备份
- 使用试运行模式先测试
- 监控系统性能

## 故障排除

### 常见问题

#### 1. 内存不足
- 减小批处理大小
- 增加Node.js内存限制：`node --max-old-space-size=4096`

#### 2. 数据库连接超时
- 增加重试次数
- 增加重试延迟
- 检查数据库连接配置

#### 3. 数据验证失败
- 检查数据源格式
- 运行数据修复工具
- 查看详细错误日志

#### 4. 迁移速度慢
- 增加批处理大小
- 禁用详细日志
- 优化数据库索引

### 调试模式
```bash
# 启用调试日志
DEBUG=true npx ts-node scripts/run-migration.ts migrate --detailed-logging
```

## API参考

详细的API文档请参考各个TypeScript文件中的接口定义和注释。

## 贡献指南

1. 遵循现有代码风格
2. 添加适当的错误处理
3. 编写单元测试
4. 更新文档

## 许可证

本项目采用MIT许可证。