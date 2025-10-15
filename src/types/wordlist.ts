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

// 单词相关类型
export interface Word {
  id: number;
  wordText: string;
  definitionData: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface WordlistEntry {
  id: number;
  wordlistId: number;
  wordId: number;
  word: Word;
}