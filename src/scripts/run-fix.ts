/**
 * 运行数据修复脚本
 */

import { runDataFix } from './fix-incomplete-data';

// 运行数据修复
runDataFix({
  limit: 100,        // 限制处理100个单词
  verbose: true,     // 显示详细信息
  resetFailed: true  // 重置失败的单词
})
  .then(() => {
    console.log('\n数据修复完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n数据修复失败：', error);
    process.exit(1);
  });