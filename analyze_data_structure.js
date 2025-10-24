const mysql = require('mysql2/promise');

async function analyzeData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'a4recite'
  });

  try {
    const wordId = 165; // compact

    const [definitionExamples] = await connection.execute(
      'SELECT * FROM DefinitionExamples WHERE definition_id IN (SELECT id FROM WordDefinitions WHERE word_id = ? AND type = "authoritative") ORDER BY definition_id, `order`',
      [wordId]
    );

    console.log('=== Analyzing DefinitionExamples Data Structure ===\n');

    // 按 order 分组显示
    const grouped = {};
    definitionExamples.forEach(ex => {
      if (!grouped[ex.order]) {
        grouped[ex.order] = [];
      }
      grouped[ex.order].push(ex);
    });

    Object.keys(grouped).forEach(order => {
      console.log(`Order ${order}:`);
      grouped[order].forEach(ex => {
        console.log(`  Chinese: "${ex.chinese}"`);
        console.log(`  English: "${ex.english}"`);
        console.log('');
      });
    });

    // 分析规律
    console.log('\n=== Pattern Analysis ===');
    console.log('Looking for patterns to distinguish definitions from examples...');

    const definitions = [];
    const examples = [];

    definitionExamples.forEach(ex => {
      // 判断规则：
      // 1. 中文包含分号、顿号通常是释义
      // 2. 英文很短（少于5个单词）可能是释义
      // 3. 英文以大写开头且包含句号可能是例句
      // 4. 中文很短（少于20字符）可能是释义

      const isDefinitionByChinese = ex.chinese.includes('；') || ex.chinese.includes('、');
      const isDefinitionByLength = ex.chinese.length < 20;
      const isExampleByEnglish = /^[A-Z]/.test(ex.english) && ex.english.includes(' ');
      const englishWordCount = ex.english.split(' ').length;

      console.log(`\nEntry: "${ex.chinese}" | "${ex.english}"`);
      console.log(`  Chinese has separators: ${isDefinitionByChinese}`);
      console.log(`  Chinese is short: ${isDefinitionByLength}`);
      console.log(`  English starts with capital: ${isExampleByEnglish}`);
      console.log(`  English word count: ${englishWordCount}`);

      // 综合判断
      const isDefinition = isDefinitionByChinese ||
                          (isDefinitionByLength && englishWordCount <= 5) ||
                          ex.chinese.match(/^[^。！？]+[；、]?[^。！？]*$/);

      if (isDefinition) {
        definitions.push(ex);
      } else {
        examples.push(ex);
      }
    });

    console.log(`\n=== Result ===`);
    console.log(`Definitions: ${definitions.length}`);
    console.log(`Examples: ${examples.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

analyzeData();