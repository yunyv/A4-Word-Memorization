// 测试API返回的词性和词形数据
const axios = require('axios');

async function testApiResponse() {
  const baseUrl = 'http://localhost:3002';
  const testWords = ['hello', 'world', 'lease']; // 包含有/无词形变化的单词

  console.log('🔍 测试API返回的词性和词形数据...\n');

  for (const word of testWords) {
    try {
      console.log(`📝 测试单词: "${word}"`);

      const response = await axios.get(`${baseUrl}/api/dictionary?word=${word}&type=all`, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;

        console.log(`  ✅ API调用成功`);
        console.log(`  📖 释义数据结构:`);

        // 检查基本释义
        if (data.definitions && data.definitions.basic) {
          console.log(`    - 基本释义 (${data.definitions.basic.length} 条):`);
          data.definitions.basic.forEach((def, index) => {
            console.log(`      ${index + 1}. 词性: ${def.partOfSpeech || '❌ 缺失'} | 释义: ${def.meaning || '无内容'}`);
          });
        }

        // 检查权威释义
        if (data.authoritativeDefinitions && data.authoritativeDefinitions.length > 0) {
          console.log(`    - 权威释义 (${data.authoritativeDefinitions.length} 条):`);
          data.authoritativeDefinitions.forEach((authDef, index) => {
            console.log(`      ${index + 1}. 词性: ${authDef.partOfSpeech || '❌ 缺失'} | 包含 ${authDef.definitions?.length || 0} 个释义`);
            authDef.definitions?.forEach((def, defIndex) => {
              console.log(`        ${defIndex + 1}. ${def.chineseMeaning || def.englishMeaning || '无内容'}`);
            });
          });
        }

        // 检查英汉释义
        if (data.bilingualDefinitions && data.bilingualDefinitions.length > 0) {
          console.log(`    - 英汉释义 (${data.bilingualDefinitions.length} 条):`);
          data.bilingualDefinitions.forEach((bilDef, index) => {
            console.log(`      ${index + 1}. 词性: ${bilDef.partOfSpeech || '❌ 缺失'} | 包含 ${bilDef.definitions?.length || 0} 个释义`);
          });
        }

        // 检查英英释义
        if (data.englishDefinitions && data.englishDefinitions.length > 0) {
          console.log(`    - 英英释义 (${data.englishDefinitions.length} 条):`);
          data.englishDefinitions.forEach((engDef, index) => {
            console.log(`      ${index + 1}. 词性: ${engDef.partOfSpeech || '❌ 缺失'} | 包含 ${engDef.definitions?.length || 0} 个释义`);
          });
        }

        // 检查词形变化
        console.log(`  🔄 词形变化:`);
        if (data.wordForms && data.wordForms.length > 0) {
          console.log(`    - 词形数量: ${data.wordForms.length}`);
          data.wordForms.forEach((form, index) => {
            console.log(`      ${index + 1}. ${form.form}: ${form.word}`);
          });
        } else {
          console.log(`    - ❌ 无词形变化数据`);
        }

        // 检查发音数据
        console.log(`  🔊 发音数据:`);
        if (data.pronunciationData) {
          if (data.pronunciationData.american) {
            console.log(`    - 美式: ${data.pronunciationData.american.phonetic || '无音标'}`);
          }
          if (data.pronunciationData.british) {
            console.log(`    - 英式: ${data.pronunciationData.british.phonetic || '无音标'}`);
          }
        } else {
          console.log(`    - ❌ 无发音数据`);
        }

      } else {
        console.log(`  ❌ API调用失败或无数据`);
        console.log(`     响应:`, JSON.stringify(response.data, null, 2));
      }

      console.log(''); // 空行分隔

    } catch (error) {
      console.error(`  ❌ 测试单词 "${word}" 时出错:`, error.message);
      if (error.response) {
        console.error(`     响应状态: ${error.response.status}`);
        console.error(`     响应数据:`, JSON.stringify(error.response.data, null, 2));
      }
      console.log('');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testApiResponse();
}

module.exports = { testApiResponse };