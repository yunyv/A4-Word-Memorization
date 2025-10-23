# 数据迁移执行计划

## 概述

本文档提供了完整的数据迁移执行计划，确保数据正确拆解并存储到关系表中。我们已经创建了一套完整的工具来处理数据迁移、验证、清理和监控。

## 已创建的工具和脚本

### 1. 核心脚本

| 脚本名称 | 功能描述 | 状态 |
|---------|---------|------|
| `enhanced-migrate-word-data.ts` | 增强版数据迁移脚本 | ✅ 完成 |
| `enhanced-data-validator.ts` | 数据验证工具 | ✅ 完成 |
| `data-cleanup-and-repair.ts` | 数据清理和修复工具 | ✅ 完成 |
| `migration-monitor.ts` | 监控和日志系统 | ✅ 完成 |
| `run-migration.ts` | 统一执行脚本 | ✅ 完成 |
| `test-migration.ts` | 测试脚本 | ✅ 完成 |

### 2. 优化和改进

| 组件 | 改进内容 | 状态 |
|------|---------|------|
| `src/lib/dictionary.ts` | 添加数据清理和验证方法 | ✅ 完成 |
| `package.json` | 添加迁移脚本和依赖 | ✅ 完成 |
| `scripts/README.md` | 详细使用文档 | ✅ 完成 |

## 执行步骤

### 阶段1: 准备工作

1. **安装依赖**
   ```bash
   npm install commander
   ```

2. **编译TypeScript**
   ```bash
   npm run build
   ```

3. **运行测试**
   ```bash
   npm run migration:test
   ```

4. **备份数据库**
   ```bash
   # 创建数据库备份
   mysqldump -u root -p123456 your_database > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

### 阶段2: 数据验证

1. **执行初始验证**
   ```bash
   npm run migration:validate
   ```

2. **检查验证报告**
   - 查看 `validation-report.json` 文件
   - 关注数据完整性评分
   - 记录发现的问题

### 阶段3: 数据清理（可选）

如果验证发现数据问题，执行清理：

1. **试运行清理**
   ```bash
   npm run migration:repair -- --dry-run
   ```

2. **执行实际清理**
   ```bash
   npm run migration:repair
   ```

3. **验证清理结果**
   ```bash
   npm run migration:validate
   ```

### 阶段4: 数据迁移

1. **试运行迁移**
   ```bash
   npm run migration:migrate -- --dry-run
   ```

2. **执行实际迁移**
   ```bash
   npm run migration:migrate
   ```

3. **监控迁移过程**
   - 查看实时日志输出
   - 检查 `migration.log` 文件
   - 监控系统性能

### 阶段5: 最终验证

1. **执行最终验证**
   ```bash
   npm run migration:validate
   ```

2. **比较验证结果**
   - 对比初始和最终验证报告
   - 确认数据完整性评分提升
   - 验证所有问题已解决

## 完整自动化流程

对于生产环境，推荐使用完整自动化流程：

```bash
# 完整流程（验证 -> 修复 -> 迁移 -> 验证）
npm run migration:full

# 试运行完整流程（仅验证）
npm run migration:full -- --dry-run
```

## 配置建议

### 开发环境
```bash
npm run migration:migrate -- \
  --batch-size 20 \
  --detailed-logging \
  --skip-incomplete
```

### 生产环境
```bash
npm run migration:migrate -- \
  --batch-size 50 \
  --max-retries 5 \
  --retry-delay 2000 \
  --stop-on-error
```

### 大数据量环境
```bash
npm run migration:migrate -- \
  --batch-size 100 \
  --max-retries 3 \
  --no-detailed-logging
```

## 监控和日志

### 日志文件
- `migration.log`: 迁移过程日志
- `migration-monitor.log`: 监控系统日志
- `validation-report.json`: 验证报告
- `repair-report.json`: 修复报告

### 关键指标
- 数据完整性评分 (目标: >90)
- 处理速率 (单词/分钟)
- 错误率 (目标: <1%)
- 重试次数

## 故障排除

### 常见问题及解决方案

1. **内存不足**
   ```bash
   # 减小批处理大小
   npm run migration:migrate -- --batch-size 10
   
   # 增加Node.js内存限制
   node --max-old-space-size=4096 ./node_modules/.bin/ts-node scripts/run-migration.ts migrate
   ```

2. **数据库连接超时**
   ```bash
   # 增加重试次数和延迟
   npm run migration:migrate -- --max-retries 5 --retry-delay 3000
   ```

3. **数据验证失败**
   ```bash
   # 运行数据修复
   npm run migration:repair
   
   # 检查详细错误日志
   cat migration.log | grep ERROR
   ```

4. **迁移速度慢**
   ```bash
   # 增加批处理大小
   npm run migration:migrate -- --batch-size 100
   
   # 禁用详细日志
   npm run migration:migrate -- --no-detailed-logging
   ```

## 回滚计划

如果迁移出现问题，按以下步骤回滚：

1. **停止迁移进程**
   ```bash
   # 找到进程ID
   ps aux | grep ts-node
   
   # 停止进程
   kill -9 <PID>
   ```

2. **恢复数据库备份**
   ```bash
   mysql -u root -p123456 your_database < backup-YYYYMMDD-HHMMSS.sql
   ```

3. **验证恢复**
   ```bash
   npm run migration:validate
   ```

## 性能优化

### 数据库优化
1. 确保有适当的索引
2. 增加数据库连接池大小
3. 优化查询语句

### 应用优化
1. 调整批处理大小
2. 优化内存使用
3. 并行处理（如果可能）

## 安全考虑

1. **数据备份**: 始终在迁移前创建备份
2. **权限控制**: 使用适当的数据库权限
3. **日志安全**: 确保日志文件不包含敏感信息
4. **监控警报**: 设置适当的警报阈值

## 验收标准

迁移完成后，满足以下标准视为成功：

1. **数据完整性**: 评分 >90
2. **数据一致性**: 无孤立记录
3. **性能指标**: 处理速率符合预期
4. **错误率**: <1%
5. **功能验证**: 所有功能正常工作

## 联系信息

如有问题或需要支持，请：

1. 查看日志文件获取详细错误信息
2. 运行测试脚本诊断问题
3. 参考README文档获取更多信息
4. 联系开发团队获取技术支持

---

**注意**: 在生产环境执行迁移前，请务必在测试环境完整测试所有步骤。