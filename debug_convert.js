// 模拟 convertTablesToJson 函数的处理逻辑
const mysql = require('mysql2/promise');

async function debugConvert() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'a4recite'
  });

  try {
    const wordId = 165; // compact

    // 获取数据
    const [definitions] = await connection.execute(
      'SELECT * FROM WordDefinitions WHERE word_id = ? ORDER BY type, `order`',
      [wordId]
    );

    const [definitionExamples] = await connection.execute(
      'SELECT * FROM DefinitionExamples WHERE definition_id IN (SELECT id FROM WordDefinitions WHERE word_id = ?) ORDER BY definition_id, `order`',
      [wordId]
    );

    // 模拟处理权威英汉释义
    console.log('=== Authoritative Definitions Processing ===');
    const authDefs = definitions.filter(d => d.type === 'authoritative');

    const result = [];
    authDefs.forEach((def) => {
      const authDef = {
        partOfSpeech: def.part_of_speech || '',
        definitions: []
      };

      // 处理释义条目
      const examples = definitionExamples.filter((ex) => ex.definition_id === def.id);
      console.log(`\nDefinition ${def.id} (${def.part_of_speech}):`);
      console.log(`  Total examples: ${examples.length}`);

      if (examples && examples.length > 0) {
        examples.forEach((example, idx) => {
          console.log(`  Example ${idx + 1}:`);
          console.log(`    Chinese: "${example.chinese}"`);
          console.log(`    English: "${example.english}"`);

          // 对于权威英汉释义，需要同时有中英文才算有效
          if (example.chinese && example.english) {
            // 判断是否是释义还是例句
            // 释义通常是简短的词义解释，例句是完整的句子
            const isDefinition = !example.english.includes(' ') ||
                                example.chinese.includes('；') ||
                                example.chinese.includes('、') ||
                                example.chinese.length < 50;

            console.log(`    Is definition: ${isDefinition}`);

            if (isDefinition) {
              authDef.definitions.push({
                number: example.order,
                chineseMeaning: example.chinese,
                englishMeaning: example.english
              });
            }
          }
        });
      }

      console.log(`  Final definitions count: ${authDef.definitions.length}`);
      result.push(authDef);
    });

    // 输出最终结果
    console.log('\n=== Final Result ===');
    result.forEach((def, idx) => {
      console.log(`Definition ${idx + 1} (${def.partOfSpeech}):`);
      def.definitions.forEach((d, i) => {
        console.log(`  ${i+1}. ${d.chineseMeaning} | ${d.englishMeaning}`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugConvert();