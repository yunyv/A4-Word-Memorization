import { PrismaClient, Prisma } from '@prisma/client';
import { MigrationStats } from '../src/types/word';
import { WordDefinitionData } from '../src/types/learning';
import { dictionaryScraper } from '../src/lib/dictionary';

const prisma = new PrismaClient();

// 增强的迁移统计接口
interface EnhancedMigrationStats extends MigrationStats {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  processedWords: number;
  retriedWords: number;
  dataIntegrityIssues: Array<{
    word: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  migrationDetails: {
    pronunciationMigrations: number;
    definitionMigrations: number;
    sentenceMigrations: number;
    formMigrations: number;
  };
}

// 迁移配置
interface MigrationConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  enableDataValidation: boolean;
  enableDetailedLogging: boolean;
  skipIncompleteData: boolean;
  continueOnError: boolean;
}

// 默认配置
const DEFAULT_CONFIG: MigrationConfig = {
  batchSize: 50,
  maxRetries: 3,
  retryDelay: 1000,
  enableDataValidation: true,
  enableDetailedLogging: true,
  skipIncompleteData: false,
  continueOnError: true
};

// 日志记录器
class MigrationLogger {
  private logFile: string;
  private logs: string[] = [];

  constructor(logFile: string = 'migration.log') {
    this.logFile = logFile;
  }

  log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    
    this.logs.push(logEntry);
    console.log(logEntry);
    
    if (data) {
      console.log(JSON.stringify(data, null, 2));
      this.logs.push(JSON.stringify(data, null, 2));
    }
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  async saveLogs() {
    try {
      const fs = require('fs').promises;
      await fs.writeFile(this.logFile, this.logs.join('\n'));
      this.info(`日志已保存到: ${this.logFile}`);
    } catch (error) {
      console.error('保存日志失败:', error);
    }
  }
}

// 数据验证器
class DataValidator {
  private logger: MigrationLogger;

  constructor(logger: MigrationLogger) {
    this.logger = logger;
  }

  validateWordData(data: WordDefinitionData): {
    isValid: boolean;
    issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>;
  } {
    const issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];

    // 检查基本数据结构
    if (!data || typeof data !== 'object') {
      issues.push({
        type: 'structure',
        message: '数据结构无效',
        severity: 'high'
      });
      return { isValid: false, issues };
    }

    // 检查发音数据
    if (data.pronunciationData) {
      if (data.pronunciationData.american && !data.pronunciationData.american.phonetic) {
        issues.push({
          type: 'pronunciation',
          message: '美式发音缺少音标',
          severity: 'medium'
        });
      }
      if (data.pronunciationData.british && !data.pronunciationData.british.phonetic) {
        issues.push({
          type: 'pronunciation',
          message: '英式发音缺少音标',
          severity: 'medium'
        });
      }
    }

    // 检查释义数据
    const hasDefinitions = 
      (data.definitions?.basic && data.definitions.basic.length > 0) ||
      (data.authoritativeDefinitions && data.authoritativeDefinitions.length > 0) ||
      (data.bilingualDefinitions && data.bilingualDefinitions.length > 0) ||
      (data.englishDefinitions && data.englishDefinitions.length > 0);

    if (!hasDefinitions) {
      issues.push({
        type: 'definitions',
        message: '缺少释义数据',
        severity: 'high'
      });
    }

    // 检查例句数据
    if (data.sentences && Array.isArray(data.sentences)) {
      data.sentences.forEach((sentence, index) => {
        if (!sentence.english && !sentence.chinese) {
          issues.push({
            type: 'sentence',
            message: `例句 ${index + 1} 缺少英文或中文内容`,
            severity: 'medium'
          });
        }
      });
    }

    // 检查词形数据
    if (data.wordForms && Array.isArray(data.wordForms)) {
      data.wordForms.forEach((form, index) => {
        if (!form.form || !form.word) {
          issues.push({
            type: 'wordForm',
            message: `词形 ${index + 1} 数据不完整`,
            severity: 'low'
          });
        }
      });
    }

    return {
      isValid: issues.filter(issue => issue.severity === 'high').length === 0,
      issues
    };
  }

  cleanWordData(data: WordDefinitionData): WordDefinitionData {
    const cleaned = { ...data };

    // 清理发音数据
    if (cleaned.pronunciationData) {
      if (cleaned.pronunciationData.american) {
        cleaned.pronunciationData.american.phonetic = this.cleanText(cleaned.pronunciationData.american.phonetic) || '';
        cleaned.pronunciationData.american.audioUrl = this.cleanUrl(cleaned.pronunciationData.american.audioUrl) || '';
      }
      if (cleaned.pronunciationData.british) {
        cleaned.pronunciationData.british.phonetic = this.cleanText(cleaned.pronunciationData.british.phonetic) || '';
        cleaned.pronunciationData.british.audioUrl = this.cleanUrl(cleaned.pronunciationData.british.audioUrl) || '';
      }
    }

    // 清理释义数据
    if (cleaned.definitions) {
      if (cleaned.definitions.basic) {
        cleaned.definitions.basic = cleaned.definitions.basic.map(def => ({
          ...def,
          partOfSpeech: this.cleanText(def.partOfSpeech) || '',
          meaning: this.cleanText(def.meaning) || ''
        }));
      }
      if (cleaned.definitions.web) {
        cleaned.definitions.web = cleaned.definitions.web.map(def => ({
          ...def,
          meaning: this.cleanText(def.meaning) || ''
        }));
      }
    }

    // 清理例句数据
    if (cleaned.sentences) {
      cleaned.sentences = cleaned.sentences.map(sentence => ({
        ...sentence,
        english: this.cleanText(sentence.english) || '',
        chinese: this.cleanText(sentence.chinese) || '',
        source: this.cleanText(sentence.source) || '',
        audioUrl: this.cleanUrl(sentence.audioUrl) || ''
      }));
    }

    // 清理词形数据
    if (cleaned.wordForms) {
      cleaned.wordForms = cleaned.wordForms.map(form => ({
        ...form,
        form: this.cleanText(form.form) || '',
        word: this.cleanText(form.word) || ''
      }));
    }

    return cleaned;
  }

  private cleanText(text?: string): string | undefined {
    if (!text) return undefined;
    return text.trim().replace(/\s+/g, ' ') || undefined;
  }

  private cleanUrl(url?: string): string | undefined {
    if (!url) return undefined;
    const cleaned = url.trim();
    return cleaned.startsWith('http') ? cleaned : undefined;
  }
}

// 增强的数据迁移器
class EnhancedDataMigrator {
  private logger: MigrationLogger;
  private validator: DataValidator;
  private config: MigrationConfig;
  private stats: EnhancedMigrationStats;

  constructor(config: MigrationConfig = DEFAULT_CONFIG) {
    this.logger = new MigrationLogger();
    this.validator = new DataValidator(this.logger);
    this.config = config;
    this.stats = {
      startTime: new Date(),
      totalWords: 0,
      migratedWords: 0,
      skippedWords: 0,
      processedWords: 0,
      retriedWords: 0,
      errors: [],
      dataIntegrityIssues: [],
      migrationDetails: {
        pronunciationMigrations: 0,
        definitionMigrations: 0,
        sentenceMigrations: 0,
        formMigrations: 0
      }
    };
  }

  async migrate(): Promise<EnhancedMigrationStats> {
    this.logger.info('开始数据迁移', { config: this.config });
    
    try {
      // 1. 获取需要迁移的单词
      const words = await this.getWordsToMigrate();
      this.stats.totalWords = words.length;
      this.logger.info(`找到 ${words.length} 个需要迁移的单词`);

      // 2. 分批处理单词
      for (let i = 0; i < words.length; i += this.config.batchSize) {
        const batch = words.slice(i, i + this.config.batchSize);
        this.logger.info(`处理批次 ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(words.length / this.config.batchSize)}`);
        
        await this.processBatch(batch);
        
        // 显示进度
        const progress = Math.round((i + batch.length) / words.length * 100);
        this.logger.info(`迁移进度: ${progress}% (${i + batch.length}/${words.length})`);
      }

      // 3. 完成迁移
      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();
      
      await this.generateMigrationReport();
      await this.logger.saveLogs();
      
      this.logger.info('数据迁移完成', this.stats);
      return this.stats;
      
    } catch (error) {
      this.logger.error('数据迁移失败', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async getWordsToMigrate() {
    this.logger.info('获取需要迁移的单词列表');
    
    // 获取所有有JSON数据的单词
    const words = await prisma.word.findMany({
      where: {
        definitionData: {
          not: Prisma.JsonNull
        }
      }
    });

    // 如果启用数据验证，过滤出需要重新迁移的单词
    if (this.config.enableDataValidation) {
      const wordsToMigrate = [];
      let checkedCount = 0;
      let needsMigrationCount = 0;
      
      for (const word of words) {
        const needsMigration = await this.checkIfNeedsMigration(word);
        checkedCount++;
        
        if (needsMigration) {
          needsMigrationCount++;
          wordsToMigrate.push(word);
          this.logger.info(`DEBUG: 单词 ${word.wordText} 需要迁移`);
        }
      }
      
      this.logger.info(`检查了 ${checkedCount} 个单词，其中 ${needsMigrationCount} 个需要迁移`);
      this.logger.info(`验证后确定需要迁移的单词数量: ${wordsToMigrate.length}`);
      return wordsToMigrate;
    }
    
    return words;
  }

  private async checkIfNeedsMigration(word: any): Promise<boolean> {
    const definitionData = word.definitionData as WordDefinitionData;
    
    if (!definitionData) {
      return false;
    }

    // 检查关系表中是否已有完整数据
    const pronunciationCount = await prisma.wordPronunciation.count({
      where: { wordId: word.id }
    });
    
    const definitionCount = await prisma.wordDefinition.count({
      where: { wordId: word.id }
    });
    
    const sentenceCount = await prisma.wordSentence.count({
      where: { wordId: word.id }
    });
    
    const formCount = await prisma.wordForm.count({
      where: { wordId: word.id }
    });

    // 检查发音数据是否有效且需要迁移
    const hasValidPronunciationData =
      definitionData.pronunciationData && (
        (definitionData.pronunciationData.american && definitionData.pronunciationData.american.phonetic) ||
        (definitionData.pronunciationData.british && definitionData.pronunciationData.british.phonetic)
      );
    const needsPronunciationMigration = !!(hasValidPronunciationData && pronunciationCount === 0);
    
    // 检查释义数据是否有效且需要迁移
    const hasValidDefinitionsData =
      (definitionData.definitions?.basic && definitionData.definitions.basic.length > 0) ||
      (definitionData.definitions?.web && definitionData.definitions.web.length > 0) ||
      (definitionData.authoritativeDefinitions && definitionData.authoritativeDefinitions.length > 0) ||
      (definitionData.bilingualDefinitions && definitionData.bilingualDefinitions.length > 0) ||
      (definitionData.englishDefinitions && definitionData.englishDefinitions.length > 0);
    const needsDefinitionMigration = !!(hasValidDefinitionsData && definitionCount === 0);
    
    // 检查例句数据是否有效且需要迁移
    const hasValidSentencesData =
      definitionData.sentences &&
      Array.isArray(definitionData.sentences) &&
      definitionData.sentences.length > 0 &&
      definitionData.sentences.some(sentence => sentence.english || sentence.chinese);
    const needsSentenceMigration = !!(hasValidSentencesData && sentenceCount === 0);
    
    // 检查词形数据是否有效且需要迁移
    const hasValidWordFormsData =
      definitionData.wordForms &&
      Array.isArray(definitionData.wordForms) &&
      definitionData.wordForms.length > 0;
    const needsFormMigration = !!(hasValidWordFormsData && formCount === 0);

    return needsPronunciationMigration || needsDefinitionMigration ||
           needsSentenceMigration || needsFormMigration;
  }

  private async processBatch(words: any[]) {
    for (const word of words) {
      try {
        await this.processWord(word);
        this.stats.processedWords++;
      } catch (error) {
        this.logger.error(`处理单词 ${word.wordText} 失败`, error);
        
        if (this.config.continueOnError) {
          this.stats.errors.push({
            word: word.wordText,
            error: error instanceof Error ? error.message : '未知错误'
          });
        } else {
          throw error;
        }
      }
    }
  }

  private async processWord(word: any, retryCount: number = 0): Promise<void> {
    try {
      this.logger.info(`处理单词: ${word.wordText}`);
      
      const definitionData = word.definitionData as WordDefinitionData;
      
      if (!definitionData) {
        this.logger.warn(`单词 ${word.wordText} 没有定义数据，跳过`);
        this.stats.skippedWords++;
        return;
      }

      // 验证数据
      const validation = this.validator.validateWordData(definitionData);
      
      if (!validation.isValid) {
        const highSeverityIssues = validation.issues.filter(issue => issue.severity === 'high');
        
        if (highSeverityIssues.length > 0) {
          this.logger.warn(`单词 ${word.wordText} 有严重数据问题`, highSeverityIssues);
          
          if (this.config.skipIncompleteData) {
            this.stats.skippedWords++;
            return;
          }
        }
      }

      // 记录数据完整性问题
      if (validation.issues.length > 0) {
        validation.issues.forEach(issue => {
          this.stats.dataIntegrityIssues.push({
            word: word.wordText,
            issue: `${issue.type}: ${issue.message}`,
            severity: issue.severity
          });
        });
      }

      // 清理数据
      const cleanedData = this.validator.cleanWordData(definitionData);

      // 使用事务迁移数据
      await prisma.$transaction(async (tx) => {
        await this.migrateWordData(tx, word.id, cleanedData);
      });

      this.stats.migratedWords++;
      this.logger.info(`成功迁移单词: ${word.wordText}`);
      
    } catch (error) {
      this.logger.error(`迁移单词 ${word.wordText} 失败 (尝试 ${retryCount + 1}/${this.config.maxRetries})`, error);
      
      if (retryCount < this.config.maxRetries - 1) {
        this.stats.retriedWords++;
        await this.delay(this.config.retryDelay);
        await this.processWord(word, retryCount + 1);
      } else {
        throw error;
      }
    }
  }

  private async migrateWordData(tx: any, wordId: number, data: WordDefinitionData) {
    // 1. 迁移发音数据
    if (data.pronunciationData) {
      await this.migratePronunciationData(tx, wordId, data.pronunciationData);
      this.stats.migrationDetails.pronunciationMigrations++;
    }

    // 2. 迁移基本释义数据
    if (data.definitions) {
      await this.migrateDefinitionData(tx, wordId, data.definitions);
      this.stats.migrationDetails.definitionMigrations++;
    }

    // 3. 迁移权威英汉释义
    if (data.authoritativeDefinitions) {
      await this.migrateAuthoritativeDefinitions(tx, wordId, data.authoritativeDefinitions);
      this.stats.migrationDetails.definitionMigrations++;
    }

    // 4. 迁移英汉释义
    if (data.bilingualDefinitions) {
      await this.migrateBilingualDefinitions(tx, wordId, data.bilingualDefinitions);
      this.stats.migrationDetails.definitionMigrations++;
    }

    // 5. 迁移英英释义
    if (data.englishDefinitions) {
      await this.migrateEnglishDefinitions(tx, wordId, data.englishDefinitions);
      this.stats.migrationDetails.definitionMigrations++;
    }

    // 6. 迁移例句数据
    if (data.sentences && data.sentences.length > 0) {
      await this.migrateSentenceData(tx, wordId, data.sentences);
      this.stats.migrationDetails.sentenceMigrations++;
    }

    // 7. 迁移词形变化
    if (data.wordForms && data.wordForms.length > 0) {
      await this.migrateWordForms(tx, wordId, data.wordForms);
      this.stats.migrationDetails.formMigrations++;
    }
  }

  private async migratePronunciationData(tx: any, wordId: number, pronunciationData: any) {
    // 美式发音
    if (pronunciationData.american) {
      await tx.$executeRaw`
        INSERT INTO WordPronunciations (word_id, type, phonetic, audio_url, created_at, updated_at)
        VALUES (${wordId}, 'american', ${pronunciationData.american.phonetic}, ${pronunciationData.american.audioUrl}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        phonetic = ${pronunciationData.american.phonetic},
        audio_url = ${pronunciationData.american.audioUrl},
        updated_at = NOW()
      `;
    }

    // 英式发音
    if (pronunciationData.british) {
      await tx.$executeRaw`
        INSERT INTO WordPronunciations (word_id, type, phonetic, audio_url, created_at, updated_at)
        VALUES (${wordId}, 'british', ${pronunciationData.british.phonetic}, ${pronunciationData.british.audioUrl}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        phonetic = ${pronunciationData.british.phonetic},
        audio_url = ${pronunciationData.british.audioUrl},
        updated_at = NOW()
      `;
    }
  }

  private async migrateDefinitionData(tx: any, wordId: number, definitions: any) {
    // 基本释义
    if (definitions.basic && definitions.basic.length > 0) {
      for (let i = 0; i < definitions.basic.length; i++) {
        const def = definitions.basic[i];
        await tx.$executeRaw`
          INSERT INTO WordDefinitions (word_id, type, part_of_speech, order, meaning, created_at, updated_at)
          VALUES (${wordId}, 'basic', ${def.partOfSpeech}, ${i}, ${def.meaning}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
          part_of_speech = ${def.partOfSpeech},
          meaning = ${def.meaning},
          updated_at = NOW()
        `;
      }
    }

    // 网络释义
    if (definitions.web && definitions.web.length > 0) {
      for (let i = 0; i < definitions.web.length; i++) {
        const def = definitions.web[i];
        await tx.$executeRaw`
          INSERT INTO WordDefinitions (word_id, type, order, meaning, created_at, updated_at)
          VALUES (${wordId}, 'web', ${i}, ${def.meaning}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
          meaning = ${def.meaning},
          updated_at = NOW()
        `;
      }
    }
  }

  private async migrateAuthoritativeDefinitions(tx: any, wordId: number, authoritativeDefinitions: any[]) {
    for (const authDef of authoritativeDefinitions) {
      // 创建主释义记录
      const definitionResult = await tx.$queryRaw`
        INSERT INTO WordDefinitions (word_id, type, part_of_speech, order, created_at, updated_at)
        VALUES (${wordId}, 'authoritative', ${authDef.partOfSpeech}, 0, NOW(), NOW())
      `;
      const definitionId = (definitionResult as { insertId: number }).insertId;

      // 创建释义条目
      for (const defItem of authDef.definitions) {
        await tx.$executeRaw`
          INSERT INTO DefinitionExamples (definition_id, order, english, chinese, created_at, updated_at)
          VALUES (${definitionId}, ${defItem.number}, ${defItem.englishMeaning || ''}, ${defItem.chineseMeaning || ''}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
          english = ${defItem.englishMeaning || ''},
          chinese = ${defItem.chineseMeaning || ''},
          updated_at = NOW()
        `;

        // 如果有例句，创建例句记录
        if (defItem.examples && defItem.examples.length > 0) {
          for (const example of defItem.examples) {
            await tx.$executeRaw`
              INSERT INTO DefinitionExamples (definition_id, order, english, chinese, created_at, updated_at)
              VALUES (${definitionId}, ${defItem.number}, ${example.english}, ${example.chinese}, NOW(), NOW())
              ON DUPLICATE KEY UPDATE
              english = ${example.english},
              chinese = ${example.chinese},
              updated_at = NOW()
            `;
          }
        }
      }

      // 处理习语
      if (authDef.idioms && authDef.idioms.length > 0) {
        for (const idiom of authDef.idioms) {
          const idiomResult = await tx.$queryRaw`
            INSERT INTO DefinitionIdioms (definition_id, order, title, meaning, created_at, updated_at)
            VALUES (${definitionId}, ${idiom.number}, ${idiom.title}, ${idiom.meaning}, NOW(), NOW())
          `;
          const idiomId = (idiomResult as { insertId: number }).insertId;

          // 创建习语例句
          if (idiom.examples && idiom.examples.length > 0) {
            for (const example of idiom.examples) {
              await tx.$executeRaw`
                INSERT INTO IdiomExamples (idiom_id, order, english, chinese, created_at, updated_at)
                VALUES (${idiomId}, 0, ${example.english}, ${example.chinese}, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                english = ${example.english},
                chinese = ${example.chinese},
                updated_at = NOW()
              `;
            }
          }
        }
      }
    }
  }

  private async migrateBilingualDefinitions(tx: any, wordId: number, bilingualDefinitions: any[]) {
    for (const bilDef of bilingualDefinitions) {
      const definitionResult = await tx.$queryRaw`
        INSERT INTO WordDefinitions (word_id, type, part_of_speech, order, created_at, updated_at)
        VALUES (${wordId}, 'bilingual', ${bilDef.partOfSpeech}, 0, NOW(), NOW())
      `;
      const definitionId = (definitionResult as { insertId: number }).insertId;

      // 创建释义条目
      for (const defItem of bilDef.definitions) {
        await tx.$executeRaw`
          INSERT INTO DefinitionExamples (definition_id, order, english, chinese, created_at, updated_at)
          VALUES (${definitionId}, ${defItem.number}, '', ${defItem.meaning}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
          english = '',
          chinese = ${defItem.meaning},
          updated_at = NOW()
        `;
      }
    }
  }

  private async migrateEnglishDefinitions(tx: any, wordId: number, englishDefinitions: any[]) {
    for (const engDef of englishDefinitions) {
      // 创建释义条目
      for (const defItem of engDef.definitions) {
        await tx.$executeRaw`
          INSERT INTO WordDefinitions (word_id, type, part_of_speech, order, meaning, linked_words, created_at, updated_at)
          VALUES (${wordId}, 'english', ${engDef.partOfSpeech}, ${defItem.number}, ${defItem.meaning}, ${defItem.linkedWords ? JSON.stringify(defItem.linkedWords) : null}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
          meaning = ${defItem.meaning},
          linked_words = ${defItem.linkedWords ? JSON.stringify(defItem.linkedWords) : null},
          updated_at = NOW()
        `;
      }
    }
  }

  private async migrateSentenceData(tx: any, wordId: number, sentences: any[]) {
    for (const sentence of sentences) {
      await tx.$executeRaw`
        INSERT INTO WordSentences (word_id, order, english, chinese, audio_url, source, created_at, updated_at)
        VALUES (${wordId}, ${sentence.number}, ${sentence.english}, ${sentence.chinese}, ${sentence.audioUrl}, ${sentence.source}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        english = ${sentence.english},
        chinese = ${sentence.chinese},
        audio_url = ${sentence.audioUrl},
        source = ${sentence.source},
        updated_at = NOW()
      `;
    }
  }

  private async migrateWordForms(tx: any, wordId: number, wordForms: any[]) {
    for (const wordForm of wordForms) {
      await tx.$executeRaw`
        INSERT INTO WordForms (word_id, form_type, form_word, created_at, updated_at)
        VALUES (${wordId}, ${wordForm.form}, ${wordForm.word}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        form_word = ${wordForm.word},
        updated_at = NOW()
      `;
    }
  }

  private async generateMigrationReport() {
    this.logger.info('=== 迁移报告 ===');
    this.logger.info(`总单词数: ${this.stats.totalWords}`);
    this.logger.info(`成功迁移: ${this.stats.migratedWords}`);
    this.logger.info(`跳过单词: ${this.stats.skippedWords}`);
    this.logger.info(`处理单词: ${this.stats.processedWords}`);
    this.logger.info(`重试次数: ${this.stats.retriedWords}`);
    this.logger.info(`错误数量: ${this.stats.errors.length}`);
    this.logger.info(`数据完整性问题: ${this.stats.dataIntegrityIssues.length}`);
    
    if (this.stats.duration) {
      this.logger.info(`总耗时: ${Math.round(this.stats.duration / 1000)}秒`);
    }

    this.logger.info('=== 迁移详情 ===');
    this.logger.info(`发音数据迁移: ${this.stats.migrationDetails.pronunciationMigrations}`);
    this.logger.info(`释义数据迁移: ${this.stats.migrationDetails.definitionMigrations}`);
    this.logger.info(`例句数据迁移: ${this.stats.migrationDetails.sentenceMigrations}`);
    this.logger.info(`词形数据迁移: ${this.stats.migrationDetails.formMigrations}`);

    if (this.stats.errors.length > 0) {
      this.logger.info('=== 错误详情 ===');
      this.stats.errors.forEach(err => {
        this.logger.error(`${err.word}: ${err.error}`);
      });
    }

    if (this.stats.dataIntegrityIssues.length > 0) {
      this.logger.info('=== 数据完整性问题 ===');
      const highSeverityIssues = this.stats.dataIntegrityIssues.filter(issue => issue.severity === 'high');
      const mediumSeverityIssues = this.stats.dataIntegrityIssues.filter(issue => issue.severity === 'medium');
      const lowSeverityIssues = this.stats.dataIntegrityIssues.filter(issue => issue.severity === 'low');
      
      this.logger.info(`高严重性问题: ${highSeverityIssues.length}`);
      highSeverityIssues.forEach(issue => {
        this.logger.error(`${issue.word}: ${issue.issue}`);
      });
      
      this.logger.info(`中等严重性问题: ${mediumSeverityIssues.length}`);
      mediumSeverityIssues.forEach(issue => {
        this.logger.warn(`${issue.word}: ${issue.issue}`);
      });
      
      this.logger.info(`低严重性问题: ${lowSeverityIssues.length}`);
      lowSeverityIssues.forEach(issue => {
        this.logger.info(`${issue.word}: ${issue.issue}`);
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 执行迁移
async function main() {
  const migrator = new EnhancedDataMigrator();
  
  try {
    const stats = await migrator.migrate();
    console.log('迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { EnhancedDataMigrator, DEFAULT_CONFIG };
export type { MigrationConfig };