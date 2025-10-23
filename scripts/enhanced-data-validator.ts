import { PrismaClient, Prisma } from '@prisma/client';
import { ValidationResult } from '../src/types/word';
import { WordDefinitionData } from '../src/types/learning';

const prisma = new PrismaClient();

// 增强的验证结果接口
interface EnhancedValidationResult extends ValidationResult {
  dataIntegrityScore: number; // 数据完整性评分 (0-100)
  detailedIssues: Array<{
    wordId: number;
    wordText: string;
    issueType: 'missing_data' | 'inconsistent_data' | 'corrupted_data' | 'orphaned_record';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestedFix: string;
  }>;
  tableStatistics: {
    words: number;
    wordPronunciations: number;
    wordDefinitions: number;
    definitionExamples: number;
    definitionIdioms: number;
    idiomExamples: number;
    wordSentences: number;
    wordForms: number;
  };
  dataQualityMetrics: {
    wordsWithCompleteData: number;
    wordsWithPartialData: number;
    wordsWithOnlyJson: number;
    averageDefinitionsPerWord: number;
    averageSentencesPerWord: number;
    averagePronunciationsPerWord: number;
  };
}

// 验证配置
interface ValidationConfig {
  checkDataConsistency: boolean;
  checkOrphanedRecords: boolean;
  generateDetailedReport: boolean;
  includeSuggestions: boolean;
  batchSize: number;
}

// 默认配置
const DEFAULT_CONFIG: ValidationConfig = {
  checkDataConsistency: true,
  checkOrphanedRecords: true,
  generateDetailedReport: true,
  includeSuggestions: true,
  batchSize: 100
};

// 增强的数据验证器
class EnhancedDataValidator {
  private config: ValidationConfig;
  private result: EnhancedValidationResult;

  constructor(config: ValidationConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.result = {
      totalWords: 0,
      wordsWithJson: 0,
      wordsWithPronunciations: 0,
      wordsWithDefinitions: 0,
      wordsWithSentences: 0,
      wordsWithForms: 0,
      inconsistencies: [],
      dataIntegrityScore: 0,
      detailedIssues: [],
      tableStatistics: {
        words: 0,
        wordPronunciations: 0,
        wordDefinitions: 0,
        definitionExamples: 0,
        definitionIdioms: 0,
        idiomExamples: 0,
        wordSentences: 0,
        wordForms: 0
      },
      dataQualityMetrics: {
        wordsWithCompleteData: 0,
        wordsWithPartialData: 0,
        wordsWithOnlyJson: 0,
        averageDefinitionsPerWord: 0,
        averageSentencesPerWord: 0,
        averagePronunciationsPerWord: 0
      }
    };
  }

  async validate(): Promise<EnhancedValidationResult> {
    console.log('开始数据验证...');
    
    try {
      // 1. 获取表统计信息
      await this.getTableStatistics();
      
      // 2. 验证单词数据
      await this.validateWordData();
      
      // 3. 检查数据一致性
      if (this.config.checkDataConsistency) {
        await this.checkDataConsistency();
      }
      
      // 4. 检查孤立记录
      if (this.config.checkOrphanedRecords) {
        await this.checkOrphanedRecords();
      }
      
      // 5. 计算数据质量指标
      await this.calculateDataQualityMetrics();
      
      // 6. 计算数据完整性评分
      this.calculateDataIntegrityScore();
      
      // 7. 生成报告
      if (this.config.generateDetailedReport) {
        await this.generateValidationReport();
      }
      
      console.log('数据验证完成');
      return this.result;
      
    } catch (error) {
      console.error('数据验证过程中发生错误:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async getTableStatistics() {
    console.log('获取表统计信息...');
    
    // 获取各表的记录数
    this.result.tableStatistics.words = await prisma.word.count();
    this.result.tableStatistics.wordPronunciations = await prisma.wordPronunciation.count();
    this.result.tableStatistics.wordDefinitions = await prisma.wordDefinition.count();
    this.result.tableStatistics.definitionExamples = await prisma.definitionExample.count();
    this.result.tableStatistics.definitionIdioms = await prisma.definitionIdiom.count();
    this.result.tableStatistics.idiomExamples = await prisma.idiomExample.count();
    this.result.tableStatistics.wordSentences = await prisma.wordSentence.count();
    this.result.tableStatistics.wordForms = await prisma.wordForm.count();
    
    console.log('表统计信息:', this.result.tableStatistics);
  }

  private async validateWordData() {
    console.log('验证单词数据...');
    
    const words = await prisma.word.findMany({
      select: {
        id: true,
        wordText: true,
        definitionData: true,
        pronunciation: true
      }
    });

    this.result.totalWords = words.length;
    
    for (const word of words) {
      // 检查JSON数据
      if (word.definitionData) {
        this.result.wordsWithJson++;
      }

      // 检查关系表数据
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

      if (pronunciationCount > 0) {
        this.result.wordsWithPronunciations++;
      }
      
      if (definitionCount > 0) {
        this.result.wordsWithDefinitions++;
      }
      
      if (sentenceCount > 0) {
        this.result.wordsWithSentences++;
      }
      
      if (formCount > 0) {
        this.result.wordsWithForms++;
      }

      // 检查数据完整性问题
      await this.checkWordDataIntegrity(word, pronunciationCount, definitionCount, sentenceCount, formCount);
    }
  }

  private async checkWordDataIntegrity(
    word: { id: number; wordText: string; definitionData: any; pronunciation: string | null },
    pronunciationCount: number,
    definitionCount: number,
    sentenceCount: number,
    formCount: number
  ) {
    const issues: Array<{
      issueType: 'missing_data' | 'inconsistent_data' | 'corrupted_data' | 'orphaned_record';
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      suggestedFix: string;
    }> = [];

    // 检查JSON数据与关系表的一致性
    if (word.definitionData) {
      const jsonData = word.definitionData as WordDefinitionData;
      
      // 检查发音数据
      if (jsonData.pronunciationData && pronunciationCount === 0) {
        issues.push({
          issueType: 'inconsistent_data',
          severity: 'medium',
          description: 'JSON中有发音数据但关系表中没有',
          suggestedFix: '运行数据迁移脚本将JSON数据迁移到关系表'
        });
      }
      
      // 检查释义数据
      const hasJsonDefinitions = 
        (jsonData.definitions?.basic && jsonData.definitions.basic.length > 0) ||
        (jsonData.authoritativeDefinitions && jsonData.authoritativeDefinitions.length > 0) ||
        (jsonData.bilingualDefinitions && jsonData.bilingualDefinitions.length > 0) ||
        (jsonData.englishDefinitions && jsonData.englishDefinitions.length > 0);
      
      if (hasJsonDefinitions && definitionCount === 0) {
        issues.push({
          issueType: 'inconsistent_data',
          severity: 'high',
          description: 'JSON中有释义数据但关系表中没有',
          suggestedFix: '运行数据迁移脚本将JSON数据迁移到关系表'
        });
      }
      
      // 检查例句数据
      if (jsonData.sentences && jsonData.sentences.length > 0 && sentenceCount === 0) {
        issues.push({
          issueType: 'inconsistent_data',
          severity: 'medium',
          description: 'JSON中有例句数据但关系表中没有',
          suggestedFix: '运行数据迁移脚本将JSON数据迁移到关系表'
        });
      }
      
      // 检查词形数据
      if (jsonData.wordForms && jsonData.wordForms.length > 0 && formCount === 0) {
        issues.push({
          issueType: 'inconsistent_data',
          severity: 'low',
          description: 'JSON中有词形数据但关系表中没有',
          suggestedFix: '运行数据迁移脚本将JSON数据迁移到关系表'
        });
      }
    } else {
      // 没有JSON数据，检查关系表是否有数据
      if (pronunciationCount > 0 || definitionCount > 0 || sentenceCount > 0 || formCount > 0) {
        issues.push({
          issueType: 'missing_data',
          severity: 'medium',
          description: '关系表中有数据但没有JSON备份',
          suggestedFix: '从关系表数据重建JSON备份'
        });
      }
    }

    // 检查基本数据完整性
    if (definitionCount === 0) {
      issues.push({
        issueType: 'missing_data',
        severity: 'critical',
        description: '缺少释义数据',
        suggestedFix: '重新爬取单词数据或检查数据源'
      });
    }

    // 检查发音字段与发音表的一致性
    if (word.pronunciation && pronunciationCount === 0) {
      issues.push({
        issueType: 'inconsistent_data',
        severity: 'low',
        description: '单词表有发音字段但发音表没有数据',
        suggestedFix: '将发音字段数据迁移到发音表'
      });
    }

    // 添加问题到结果
    issues.forEach(issue => {
      this.result.detailedIssues.push({
        wordId: word.id,
        wordText: word.wordText,
        ...issue
      });
    });

    // 添加到不一致列表（保持向后兼容）
    if (issues.length > 0) {
      this.result.inconsistencies.push({
        word: word.wordText,
        issue: issues.map(i => i.description).join('; ')
      });
    }
  }

  private async checkDataConsistency() {
    console.log('检查数据一致性...');
    
    // 检查释义例句的一致性
    const orphanedExamples = await prisma.$queryRaw`
      SELECT de.id, de.definition_id, wd.id as word_id, w.word_text
      FROM DefinitionExamples de
      LEFT JOIN WordDefinitions wd ON de.definition_id = wd.id
      LEFT JOIN Words w ON wd.word_id = w.id
      WHERE wd.id IS NULL
    ` as Array<{ id: number; definition_id: number; word_id: number; word_text: string }>;

    orphanedExamples.forEach(example => {
      this.result.detailedIssues.push({
        wordId: example.word_id,
        wordText: example.word_text,
        issueType: 'orphaned_record',
        severity: 'high',
        description: `释义例句ID ${example.id} 引用了不存在的释义ID ${example.definition_id}`,
        suggestedFix: '删除孤立的释义例句记录或修复引用关系'
      });
    });

    // 检查习语例句的一致性
    const orphanedIdiomExamples = await prisma.$queryRaw`
      SELECT ie.id, ie.idiom_id, di.definition_id, wd.id as word_id, w.word_text
      FROM IdiomExamples ie
      LEFT JOIN DefinitionIdioms di ON ie.idiom_id = di.id
      LEFT JOIN WordDefinitions wd ON di.definition_id = wd.id
      LEFT JOIN Words w ON wd.word_id = w.id
      WHERE wd.id IS NULL
    ` as Array<{ id: number; idiom_id: number; definition_id: number; word_id: number; word_text: string }>;

    orphanedIdiomExamples.forEach(example => {
      this.result.detailedIssues.push({
        wordId: example.word_id,
        wordText: example.word_text,
        issueType: 'orphaned_record',
        severity: 'high',
        description: `习语例句ID ${example.id} 引用了不存在的习语ID ${example.idiom_id}`,
        suggestedFix: '删除孤立的习语例句记录或修复引用关系'
      });
    });
  }

  private async checkOrphanedRecords() {
    console.log('检查孤立记录...');
    
    // 检查发音表中的孤立记录
    const orphanedPronunciations = await prisma.$queryRaw`
      SELECT wp.id, wp.word_id
      FROM WordPronunciations wp
      LEFT JOIN Words w ON wp.word_id = w.id
      WHERE w.id IS NULL
    ` as Array<{ id: number; word_id: number }>;

    orphanedPronunciations.forEach(pronunciation => {
      this.result.detailedIssues.push({
        wordId: pronunciation.word_id,
        wordText: 'Unknown',
        issueType: 'orphaned_record',
        severity: 'high',
        description: `发音记录ID ${pronunciation.id} 引用了不存在的单词ID ${pronunciation.word_id}`,
        suggestedFix: '删除孤立的发音记录'
      });
    });

    // 检查释义表中的孤立记录
    const orphanedDefinitions = await prisma.$queryRaw`
      SELECT wd.id, wd.word_id
      FROM WordDefinitions wd
      LEFT JOIN Words w ON wd.word_id = w.id
      WHERE w.id IS NULL
    ` as Array<{ id: number; word_id: number }>;

    orphanedDefinitions.forEach(definition => {
      this.result.detailedIssues.push({
        wordId: definition.word_id,
        wordText: 'Unknown',
        issueType: 'orphaned_record',
        severity: 'high',
        description: `释义记录ID ${definition.id} 引用了不存在的单词ID ${definition.word_id}`,
        suggestedFix: '删除孤立的释义记录'
      });
    });
  }

  private async calculateDataQualityMetrics() {
    console.log('计算数据质量指标...');
    
    // 计算有完整数据的单词数
    const wordsWithCompleteData = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM Words w
      WHERE w.definition_data IS NOT NULL
      AND EXISTS (SELECT 1 FROM WordPronunciations wp WHERE wp.word_id = w.id)
      AND EXISTS (SELECT 1 FROM WordDefinitions wd WHERE wd.word_id = w.id)
    ` as Array<{ count: bigint }>;

    this.result.dataQualityMetrics.wordsWithCompleteData = Number(wordsWithCompleteData[0].count);

    // 计算只有JSON数据的单词数
    const wordsWithOnlyJson = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM Words w
      WHERE w.definition_data IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM WordPronunciations wp WHERE wp.word_id = w.id)
      AND NOT EXISTS (SELECT 1 FROM WordDefinitions wd WHERE wd.word_id = w.id)
      AND NOT EXISTS (SELECT 1 FROM WordSentences ws WHERE ws.word_id = w.id)
      AND NOT EXISTS (SELECT 1 FROM WordForms wf WHERE wf.word_id = w.id)
    ` as Array<{ count: bigint }>;

    this.result.dataQualityMetrics.wordsWithOnlyJson = Number(wordsWithOnlyJson[0].count);

    // 计算有部分数据的单词数
    this.result.dataQualityMetrics.wordsWithPartialData = 
      this.result.totalWords - 
      this.result.dataQualityMetrics.wordsWithCompleteData - 
      this.result.dataQualityMetrics.wordsWithOnlyJson;

    // 计算平均值
    if (this.result.totalWords > 0) {
      this.result.dataQualityMetrics.averageDefinitionsPerWord = 
        this.result.tableStatistics.wordDefinitions / this.result.totalWords;
      this.result.dataQualityMetrics.averageSentencesPerWord = 
        this.result.tableStatistics.wordSentences / this.result.totalWords;
      this.result.dataQualityMetrics.averagePronunciationsPerWord = 
        this.result.tableStatistics.wordPronunciations / this.result.totalWords;
    }
  }

  private calculateDataIntegrityScore() {
    console.log('计算数据完整性评分...');
    
    let score = 0;
    const maxScore = 100;
    
    // 基础分数：有释义数据的单词比例 (40分)
    const definitionScore = (this.result.wordsWithDefinitions / this.result.totalWords) * 40;
    score += definitionScore;
    
    // 发音数据分数 (20分)
    const pronunciationScore = (this.result.wordsWithPronunciations / this.result.totalWords) * 20;
    score += pronunciationScore;
    
    // 例句数据分数 (15分)
    const sentenceScore = (this.result.wordsWithSentences / this.result.totalWords) * 15;
    score += sentenceScore;
    
    // 数据一致性分数 (15分)
    const consistencyIssues = this.result.detailedIssues.filter(issue => 
      issue.issueType === 'inconsistent_data' || issue.issueType === 'orphaned_record'
    ).length;
    const consistencyScore = Math.max(0, 15 - (consistencyIssues / this.result.totalWords) * 15);
    score += consistencyScore;
    
    // 数据完整性分数 (10分)
    const criticalIssues = this.result.detailedIssues.filter(issue => 
      issue.severity === 'critical'
    ).length;
    const completenessScore = Math.max(0, 10 - (criticalIssues / this.result.totalWords) * 10);
    score += completenessScore;
    
    this.result.dataIntegrityScore = Math.round(Math.min(maxScore, score));
  }

  private async generateValidationReport() {
    console.log('生成验证报告...');
    
    console.log('\n=== 数据验证报告 ===');
    console.log(`数据完整性评分: ${this.result.dataIntegrityScore}/100`);
    
    console.log('\n=== 表统计信息 ===');
    console.log(`单词总数: ${this.result.tableStatistics.words}`);
    console.log(`发音记录: ${this.result.tableStatistics.wordPronunciations}`);
    console.log(`释义记录: ${this.result.tableStatistics.wordDefinitions}`);
    console.log(`释义例句: ${this.result.tableStatistics.definitionExamples}`);
    console.log(`习语记录: ${this.result.tableStatistics.definitionIdioms}`);
    console.log(`习语例句: ${this.result.tableStatistics.idiomExamples}`);
    console.log(`例句记录: ${this.result.tableStatistics.wordSentences}`);
    console.log(`词形记录: ${this.result.tableStatistics.wordForms}`);
    
    console.log('\n=== 数据质量指标 ===');
    console.log(`有完整数据的单词: ${this.result.dataQualityMetrics.wordsWithCompleteData}`);
    console.log(`有部分数据的单词: ${this.result.dataQualityMetrics.wordsWithPartialData}`);
    console.log(`只有JSON数据的单词: ${this.result.dataQualityMetrics.wordsWithOnlyJson}`);
    console.log(`平均释义数/单词: ${this.result.dataQualityMetrics.averageDefinitionsPerWord.toFixed(2)}`);
    console.log(`平均例句数/单词: ${this.result.dataQualityMetrics.averageSentencesPerWord.toFixed(2)}`);
    console.log(`平均发音数/单词: ${this.result.dataQualityMetrics.averagePronunciationsPerWord.toFixed(2)}`);
    
    // 按严重程度分组显示问题
    const issuesBySeverity = {
      critical: this.result.detailedIssues.filter(issue => issue.severity === 'critical'),
      high: this.result.detailedIssues.filter(issue => issue.severity === 'high'),
      medium: this.result.detailedIssues.filter(issue => issue.severity === 'medium'),
      low: this.result.detailedIssues.filter(issue => issue.severity === 'low')
    };
    
    console.log('\n=== 问题统计 ===');
    console.log(`严重问题: ${issuesBySeverity.critical.length}`);
    console.log(`高优先级问题: ${issuesBySeverity.high.length}`);
    console.log(`中优先级问题: ${issuesBySeverity.medium.length}`);
    console.log(`低优先级问题: ${issuesBySeverity.low.length}`);
    
    // 显示详细问题
    if (this.config.includeSuggestions) {
      Object.entries(issuesBySeverity).forEach(([severity, issues]) => {
        if (issues.length > 0) {
          console.log(`\n=== ${severity.toUpperCase()} 问题详情 ===`);
          issues.slice(0, 10).forEach(issue => {
            console.log(`单词: ${issue.wordText}`);
            console.log(`问题: ${issue.description}`);
            console.log(`建议: ${issue.suggestedFix}`);
            console.log('---');
          });
          
          if (issues.length > 10) {
            console.log(`... 还有 ${issues.length - 10} 个${severity}问题未显示`);
          }
        }
      });
    }
    
    // 保存报告到文件
    try {
      const fs = require('fs').promises;
      const reportData = {
        timestamp: new Date().toISOString(),
        dataIntegrityScore: this.result.dataIntegrityScore,
        tableStatistics: this.result.tableStatistics,
        dataQualityMetrics: this.result.dataQualityMetrics,
        issuesBySeverity: {
          critical: issuesBySeverity.critical.length,
          high: issuesBySeverity.high.length,
          medium: issuesBySeverity.medium.length,
          low: issuesBySeverity.low.length
        },
        detailedIssues: this.result.detailedIssues
      };
      
      await fs.writeFile('validation-report.json', JSON.stringify(reportData, null, 2));
      console.log('\n详细报告已保存到: validation-report.json');
    } catch (error) {
      console.error('保存报告失败:', error);
    }
  }
}

// 执行验证
async function main() {
  const validator = new EnhancedDataValidator();
  
  try {
    const result = await validator.validate();
    console.log('验证完成');
    process.exit(0);
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { EnhancedDataValidator, DEFAULT_CONFIG };
export type { ValidationConfig };