// 单词发音数据接口
export interface WordPronunciation {
  id: number;
  wordId: number;
  type: 'american' | 'british';
  phonetic: string;
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 单词释义数据接口
export interface WordDefinition {
  id: number;
  wordId: number;
  type: 'basic' | 'web' | 'authoritative' | 'bilingual' | 'english';
  partOfSpeech?: string;
  order: number;
  meaning?: string;
  chineseMeaning?: string;
  englishMeaning?: string;
  definitionNumber?: number;
  linkedWords?: string;
  createdAt: Date;
  updatedAt: Date;
  examples?: DefinitionExample[];
  idioms?: DefinitionIdiom[];
}

// 释义例句数据接口
export interface DefinitionExample {
  id: number;
  definitionId: number;
  order: number;
  english: string;
  chinese?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 释义习语数据接口
export interface DefinitionIdiom {
  id: number;
  definitionId: number;
  order: number;
  title: string;
  meaning: string;
  createdAt: Date;
  updatedAt: Date;
  examples?: IdiomExample[];
}

// 习语例句数据接口
export interface IdiomExample {
  id: number;
  idiomId: number;
  order: number;
  english: string;
  chinese?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 单词例句数据接口
export interface WordSentence {
  id: number;
  wordId: number;
  order: number;
  english: string;
  chinese?: string;
  audioUrl?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 词形变换数据接口
export interface WordForm {
  id: number;
  wordId: number;
  formType: string;
  formWord: string;
  createdAt: Date;
  updatedAt: Date;
}

// 完整的单词数据接口（包含所有关联数据）
export interface WordWithDetails {
  id: number;
  wordText: string;
  pronunciation?: string;
  definitionData?: {
    extractedContent?: string;
    pronunciation?: string;
    pronunciationData?: {
      american?: {
        phonetic: string;
        audioUrl: string;
      };
      british?: {
        phonetic: string;
        audioUrl: string;
      };
    };
    sentences?: Array<{
      number: number;
      english: string;
      chinese: string;
      audioUrl?: string;
      source?: string;
      highlightedWords?: Array<{
        word: string;
        className: string;
      }>;
    }>;
    definitions?: {
      basic: Array<{
        partOfSpeech: string;
        meaning: string;
      }>;
      web: Array<{
        meaning: string;
      }>;
    };
    authoritativeDefinitions?: Array<{
      partOfSpeech: string;
      definitions: Array<{
        number: number;
        chineseMeaning: string;
        englishMeaning: string;
        examples?: Array<{
          english: string;
          chinese: string;
        }>;
      }>;
      idioms?: Array<{
        number: number;
        title: string;
        meaning: string;
        examples?: Array<{
          english: string;
          chinese: string;
        }>;
      }>;
    }>;
    bilingualDefinitions?: Array<{
      partOfSpeech: string;
      definitions: Array<{
        number: number;
        meaning: string;
      }>;
    }>;
    englishDefinitions?: Array<{
      partOfSpeech: string;
      definitions: Array<{
        number: number;
        meaning: string;
        linkedWords?: string[];
      }>;
    }>;
    wordForms?: Array<{
      form: string;
      word: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
  pronunciations: WordPronunciation[];
  definitions: WordDefinition[];
  sentences: WordSentence[];
  wordForms: WordForm[];
}

// 用于API响应的单词数据接口（转换为原有JSON格式）
export interface WordApiResponse {
  success: boolean;
  word: string;
  requestedType?: 'all' | 'authoritative' | 'bilingual' | 'english';
  data?: {
    extractedContent?: string;
    pronunciation?: string;
    pronunciationData?: {
      american?: {
        phonetic: string;
        audioUrl: string;
      };
      british?: {
        phonetic: string;
        audioUrl: string;
      };
    };
    sentences?: Array<{
      number: number;
      english: string;
      chinese: string;
      audioUrl?: string;
      source?: string;
      highlightedWords?: Array<{
        word: string;
        className: string;
      }>;
    }>;
    definitions?: {
      basic: Array<{
        partOfSpeech: string;
        meaning: string;
      }>;
      web: Array<{
        meaning: string;
      }>;
    };
    authoritativeDefinitions?: Array<{
      partOfSpeech: string;
      definitions: Array<{
        number: number;
        chineseMeaning: string;
        englishMeaning: string;
        examples?: Array<{
          english: string;
          chinese: string;
        }>;
      }>;
      idioms?: Array<{
        number: number;
        title: string;
        meaning: string;
        examples?: Array<{
          english: string;
          chinese: string;
        }>;
      }>;
    }>;
    bilingualDefinitions?: Array<{
      partOfSpeech: string;
      definitions: Array<{
        number: number;
        meaning: string;
      }>;
    }>;
    englishDefinitions?: Array<{
      partOfSpeech: string;
      definitions: Array<{
        number: number;
        meaning: string;
        linkedWords?: string[];
      }>;
    }>;
    wordForms?: Array<{
      form: string;
      word: string;
    }>;
  };
  error?: string;
}

// 数据迁移统计接口
export interface MigrationStats {
  totalWords: number;
  migratedWords: number;
  skippedWords: number;
  errors: Array<{ word: string; error: string }>;
}

// 数据验证结果接口
export interface ValidationResult {
  totalWords: number;
  wordsWithJson: number;
  wordsWithPronunciations: number;
  wordsWithDefinitions: number;
  wordsWithSentences: number;
  wordsWithForms: number;
  inconsistencies: Array<{
    word: string;
    issue: string;
  }>;
}