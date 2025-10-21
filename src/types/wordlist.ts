// 词书相关类型定义

export interface Wordlist {
  id: number;
  name: string;
  wordCount: number;
  createdAt: string;
  userId: number;
}

export interface WordlistWithCount extends Wordlist {
  _count: {
    wordlistEntries: number;
  };
}

export interface WordlistsState {
  items: Wordlist[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export interface UploadWordlistRequest {
  name: string;
  file: File;
}

export interface UploadWordlistResponse {
  success: boolean;
  id?: number;
  name?: string;
  word_count?: number;
  error?: string;
}

export interface DeleteWordlistResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface WordlistItemProps {
  wordlist: Wordlist;
  onStartLearning: (wordlistId: number) => void;
  onStartTest: (wordlistId: number) => void;
  onDelete: (wordlistId: number) => void;
}

// 单词释义数据接口（与 learning.ts 保持一致）
export interface WordDefinitionData {
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
}

// 单词相关类型
export interface Word {
  id: number;
  wordText: string;
  definitionData: WordDefinitionData | null;
  createdAt: string;
  updatedAt: string;
}

export interface WordlistEntry {
  id: number;
  wordlistId: number;
  wordId: number;
  word: Word;
}