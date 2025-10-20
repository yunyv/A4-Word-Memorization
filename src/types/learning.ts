// 学习相关类型定义

import { PronunciationData, Sentence } from '@/lib/dictionary';

export interface Word {
  id: number;
  word_text: string;
  definition_data: any | null;
}

export interface LearningState {
  sessionType: 'new' | 'review' | 'test' | null;
  wordQueue: string[]; // 存储待学习/复习的单词文本队列
  currentWordText: string | null; // 当前显示的单词文本
  currentWordData: any | null; // 当前单词的完整数据（含释义）
  currentIndex: number; // 当前单词在队列中的索引
  status: 'idle' | 'active' | 'finished';
  wordlistId?: number; // 当前学习的词书ID
}

export interface UserWordProgress {
  id: number;
  userId: number;
  wordId: number;
  reviewStage: number;
  nextReviewDate: Date;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  word: Word;
}

export interface ReviewSession {
  id?: number;
  userId: number;
  wordlistId?: number;
  sessionType: 'new' | 'review' | 'test';
  startedAt: Date;
  completedAt?: Date;
  wordsStudied: number;
  correctAnswers?: number;
}

export interface ReviewProgressRequest {
  wordId: number;
  isCorrect?: boolean; // 可选，用于未来的统计功能
  timeSpent?: number; // 可选，用于未来的分析功能
}

export interface ReviewProgressResponse {
  success: boolean;
  word_id?: number;
  new_review_stage?: number;
  next_review_date?: string;
  error?: string;
}

export interface DueWordsResponse {
  success: boolean;
  words: string[];
  count: number;
  error?: string;
}

// 设置相关类型
export interface SettingsState {
  fontSize: number; // e.g., 24 (px)
  panelWidth: number; // e.g., 400 (px)
  autoPlayAudio: boolean;
  loopAudio: boolean;
  instantConsolidation: boolean;
}

export interface SettingsPanelProps {
  isOpen: boolean;
  config: SettingsState;
  onConfigChange: (newConfig: SettingsState) => void;
  onClose: () => void;
  isLearningMode?: boolean;
}

// 单词卡片相关类型
export interface WordCardProps {
  wordText: string;
  wordDefinition: any | null;
  isFlipped?: boolean;
  onFlip?: () => void;
  position?: {
    x: number;
    y: number;
  };
}

export interface WordDisplayProps {
  wordText: string;
  wordDefinition: any | null;
  pronunciationData?: PronunciationData;
  sentences?: Sentence[];
  onClick?: () => void;
  fontSize?: number;
  autoPlayAudio?: boolean;
  onAutoPlay?: (pronunciationData: PronunciationData | any) => void;
  onStopAuto?: () => void;
}

// 艾宾浩斯复习间隔配置
export const EBBINGHAUS_INTERVAL_MAP = {
  1: 1,   // stage 0 -> 1, 间隔 1 天
  2: 2,   // stage 1 -> 2, 间隔 2 天
  3: 4,   // stage 2 -> 3, 间隔 4 天
  4: 7,   // stage 3 -> 4, 间隔 7 天
  5: 15,  // stage 4 -> 5, 间隔 15 天
  6: 30,  // stage 5 -> 6, 间隔 30 天
  7: 60,  // stage 6 -> 7, 间隔 60 天
  8: 120, // stage 7 -> 8, 间隔 120 天
} as const;

export type ReviewStage = keyof typeof EBBINGHAUS_INTERVAL_MAP;