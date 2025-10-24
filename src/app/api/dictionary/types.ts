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

// 原始数据库查询结果类型（使用下划线命名）
export interface PronunciationRecordRaw {
  id: number;
  word_id: number;
  type: string;
  phonetic: string;
  audio_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

// 直接使用原始类型作为接口名
export type PronunciationRecord = PronunciationRecordRaw;

// 原始数据库查询结果类型（使用下划线命名）
export interface DefinitionRecordRaw {
  id: number;
  word_id: number;
  type: string;
  part_of_speech?: string | null; // 数据库字段名（下划线）
  meaning?: string | null;
  chinese_meaning?: string | null; // 数据库字段名（下划线）
  english_meaning?: string | null; // 数据库字段名（下划线）
  definition_number?: number | null; // 数据库字段名（下划线）
  order?: number;
  linkedWords?: string | null;
  created_at: Date;
  updated_at: Date;
}

// 直接使用原始类型作为接口名
export type DefinitionRecord = DefinitionRecordRaw;

// 原始数据库查询结果类型（使用下划线命名）
export interface SentenceRecordRaw {
  id: number;
  word_id: number;
  order: number;
  english: string;
  chinese?: string | null;
  audio_url?: string | null;
  source?: string | null;
  created_at: Date;
  updated_at: Date;
}

// 直接使用原始类型作为接口名
export type SentenceRecord = SentenceRecordRaw;

// 原始数据库查询结果类型（使用下划线命名）
export interface WordFormRecordRaw {
  id: number;
  word_id: number;
  form_type: string;
  form_word: string;
  created_at: Date;
  updated_at: Date;
}

// 直接使用原始类型作为接口名
export type WordFormRecord = WordFormRecordRaw;

export interface DefinitionExampleRecordRaw {
  id: number;
  definition_id: number;
  order: number;
  chinese: string;
  english: string;
  created_at: Date;
  updated_at: Date;
}

// 直接使用原始类型作为接口名
export type DefinitionExampleRecord = DefinitionExampleRecordRaw;

export interface DefinitionIdiomRecordRaw {
  id: number;
  definition_id: number;
  title: string;
  meaning: string;
  order: number;
  created_at: Date;
  updated_at: Date;
}

// 直接使用原始类型作为接口名
export type DefinitionIdiomRecord = DefinitionIdiomRecordRaw;

export interface IdiomExampleRecordRaw {
  id: number;
  idiom_id: number;
  english: string;
  chinese: string;
  created_at: Date;
  updated_at: Date;
}

// 直接使用原始类型作为接口名
export type IdiomExampleRecord = IdiomExampleRecordRaw;

export interface WordDataAssembled extends WordDataWithId {
  pronunciations: PronunciationRecord[];
  definitions: DefinitionRecord[];
  sentences: SentenceRecord[];
  wordForms: WordFormRecord[];
  definitionExamples: DefinitionExampleRecord[];
  definitionIdioms: DefinitionIdiomRecord[];
  idiomExamples: IdiomExampleRecord[];
}