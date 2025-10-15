// 统一导出所有类型定义

// 认证相关
export * from './auth';

// 词书相关（重命名Word类型以避免冲突）
export type { 
  Wordlist, 
  WordlistWithCount, 
  WordlistsState, 
  UploadWordlistRequest, 
  UploadWordlistResponse, 
  DeleteWordlistResponse, 
  WordlistItemProps,
  WordlistEntry 
} from './wordlist';

// 学习相关（重命名Word类型以避免冲突）
export type { 
  LearningState, 
  UserWordProgress, 
  ReviewSession, 
  ReviewProgressRequest, 
  ReviewProgressResponse, 
  DueWordsResponse, 
  SettingsState, 
  SettingsPanelProps, 
  WordCardProps, 
  WordDisplayProps 
} from './learning';
export { EBBINGHAUS_INTERVAL_MAP, type ReviewStage } from './learning';

// 词典相关（使用export type语法）
export type {
  AuthoritativeDefinition,
  BilingualDefinition,
  EnglishDefinition,
  PronunciationData,
  Sentence,
  DictionaryResult
} from '@/lib/dictionary';