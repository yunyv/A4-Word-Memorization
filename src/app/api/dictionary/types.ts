// 类型定义文件，用于避免 any 类型

export interface WordDataWithId {
  id: number;
  wordText: string;
  status: string;
  pronunciation?: string | null;
  definitionData?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PronunciationRecord {
  id: number;
  wordId: number;
  type: string;
  phonetic: string;
  audioUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefinitionRecord {
  id: number;
  wordId: number;
  type: string;
  partOfSpeech?: string | null;
  meaning?: string | null;
  chinese_meaning?: string | null; // 数据库字段名
  english_meaning?: string | null; // 数据库字段名
  definition_number?: number | null; // 数据库字段名
  order?: number;
  linkedWords?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SentenceRecord {
  id: number;
  wordId: number;
  order: number;
  english: string;
  chinese: string;
  audioUrl?: string | null;
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordFormRecord {
  id: number;
  wordId: number;
  formType: string;
  formWord: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefinitionExampleRecord {
  id: number;
  definitionId: number;
  order: number;
  chinese: string;
  english: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefinitionIdiomRecord {
  id: number;
  definitionId: number;
  title: string;
  meaning: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdiomExampleRecord {
  id: number;
  idiomId: number;
  english: string;
  chinese: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordDataAssembled extends WordDataWithId {
  pronunciations: PronunciationRecord[];
  definitions: DefinitionRecord[];
  sentences: SentenceRecord[];
  wordForms: WordFormRecord[];
  definitionExamples: DefinitionExampleRecord[];
  definitionIdioms: DefinitionIdiomRecord[];
  idiomExamples: IdiomExampleRecord[];
}