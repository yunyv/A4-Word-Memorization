// 通用类型定义，用于替换 any 类型

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DatabaseWhereCondition {
  userId: number;
  wordId?: { in: number[] };
  nextReviewDate?: {
    lte: Date;
  };
  reviewStage?: number;
}

// Wordlist 相关类型
export interface WordlistEntry {
  wordId: number;
}

// Progress 相关类型
export interface ReviewProgressData {
  wordId: number;
  isCorrect?: boolean;
  timeSpent?: number;
}

export interface DueWordsCondition {
  userId: number;
  reviewStage: number;
  wordId?: { in: number[] };
}

// Dictionary 相关类型
export interface PronunciationRecord {
  type: string;
  phonetic: string;
  audioUrl: string;
}

export interface DefinitionRecord {
  type: string;
  partOfSpeech?: string;
  meaning?: string;
  id?: number;
  order?: number;
  linkedWords?: string;
}

export interface SentenceRecord {
  order: number;
  english: string;
  chinese: string;
  audioUrl?: string;
  source?: string;
}

export interface DefinitionExampleRecord {
  definitionId: number;
  order: number;
  chinese: string;
  english: string;
}

export interface IdiomRecord {
  definitionId: number;
  id: number;
  title: string;
  meaning: string;
  order: number;
}

export interface IdiomExampleRecord {
  idiomId: number;
  english: string;
  chinese: string;
}

export interface WordFormRecord {
  formType: string;
  formWord: string;
}

// Word 相关数据结构
export interface WordTablesData {
  pronunciation?: string;
  pronunciations?: PronunciationRecord[];
  definitions?: DefinitionRecord[];
  sentences?: SentenceRecord[];
  wordForms?: WordFormRecord[];
  definitionExamples?: DefinitionExampleRecord[];
  definitionIdioms?: IdiomRecord[];
  idiomExamples?: IdiomExampleRecord[];
}

// 网站结构测试相关类型
export interface WebsiteStructureTest {
  title: string;
  hasContentContainer: boolean;
  hasSearchContainer: boolean;
  hasSearchContent: boolean;
  hasLeftSideArea: boolean;
  hasSentenceArea: boolean;
  sentenceAreaDivs: number;
  firstFewDivsContent: string[];
  bodyClasses?: string;
  allContainers: string[];
  error?: string;
}

// 缓存状态相关类型
export interface CacheStatus {
  success: boolean;
  total: number;
  cached: number;
  uncached: number;
  cachePercentage: number;
  processed?: number;
  errors?: number;
  cleaned?: number;
  wordlistId?: number;
  error?: string;
}

// 缓存预加载请求类型
export interface PreloadCacheRequest {
  wordlistId: number;
  batchSize?: number;
}

// 缓存预加载响应类型
export interface PreloadCacheResponse {
  success: boolean;
  processed: number;
  errors?: number;
  error?: string;
}

// 清理缓存响应类型
export interface ClearCacheResponse {
  success: boolean;
  cleaned: number;
  error?: string;
}

// 词典测试结果类型
export interface ScraperResult {
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

// 扩展的 Cheerio 类型，用于爬虫操作
export type ExtendedCheerioAPI = ReturnType<typeof import('cheerio').load>;