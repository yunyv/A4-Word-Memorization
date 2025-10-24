import { db } from './src/lib/db';

async function testQuery() {
  try {
    const word = await db.word.findUnique({
      where: { wordText: 'hello' }
    });
    console.log('Word ID:', word?.id);

    if (word) {
      const definitions = await db.$queryRaw`
        SELECT id, type, part_of_speech, chinese_meaning, english_meaning, definition_number, \`order\`
        FROM WordDefinitions
        WHERE word_id = ${word.id} AND type IN ('authoritative', 'bilingual')
        ORDER BY type, part_of_speech, definition_number, \`order\`
      `;

      console.log('权威英汉释义和英汉释义数据:');
      console.log(JSON.stringify(definitions, null, 2));

      const examples = await db.$queryRaw`
        SELECT de.id, de.definition_id, de.\`order\`, de.english, de.chinese, wd.type, wd.part_of_speech
        FROM DefinitionExamples de
        JOIN WordDefinitions wd ON de.definition_id = wd.id
        WHERE wd.word_id = ${word.id}
        ORDER BY wd.type, wd.part_of_speech, de.definition_id, de.\`order\`
      `;

      console.log('\n释义例句数据:');
      console.log(JSON.stringify(examples, null, 2));
    }
  } catch (error) {
    console.error('查询出错:', error);
  } finally {
    await db.$disconnect();
  }
}

testQuery();