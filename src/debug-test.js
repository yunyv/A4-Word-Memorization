// 调试测试脚本
// 用于测试词典爬取功能的调试版本

import { testDatabaseConnection } from './lib/db.js';

async function runDebugTest() {
  console.log('=== 开始调试测试 ===');
  
  // 1. 测试数据库连接
  console.log('\n1. 测试数据库连接');
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.error('数据库连接失败，无法继续测试');
    return;
  }
  
  // 2. 测试爬取一个简单单词
  console.log('\n2. 测试爬取单词 "hello"');
  try {
    const response = await fetch('http://localhost:3000/api/dictionary?word=hello&type=all');
    const data = await response.json();
    
    console.log('爬取结果:', {
      status: response.status,
      success: data.success,
      word: data.word,
      hasData: !!data.data,
      error: data.error
    });
    
    if (data.success && data.data) {
      console.log('数据概览:', {
        hasPronunciation: !!data.data.pronunciation,
        hasPronunciationData: !!data.data.pronunciationData,
        hasDefinitions: !!data.data.definitions,
        authoritativeCount: data.data.authoritativeDefinitions?.length || 0,
        bilingualCount: data.data.bilingualDefinitions?.length || 0,
        englishCount: data.data.englishDefinitions?.length || 0,
        sentencesCount: data.data.sentences?.length || 0,
        wordFormsCount: data.data.wordForms?.length || 0
      });
    }
  } catch (error) {
    console.error('爬取测试失败:', error);
  }
  
  console.log('\n=== 调试测试完成 ===');
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runDebugTest().catch(console.error);
}

export { runDebugTest };