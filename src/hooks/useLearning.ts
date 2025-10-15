'use client';

import { useState, useEffect, useCallback } from 'react';
import { DueWordsResponse, ReviewProgressResponse, LearningState } from '@/types/learning';
import { authFetch } from './useAuth';
import { EBBINGHAUS_INTERVAL_MAP } from '@/types/learning';
import { cachedFetch, generateCacheKey } from '@/lib/cacheUtils';

export function useLearning() {
  const [learningState, setLearningState] = useState<LearningState>({
    sessionType: null,
    wordQueue: [],
    currentWordText: null,
    currentWordData: null,
    currentIndex: 0,
    status: 'idle'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取待复习的单词
  const fetchDueWords = useCallback(async (wordlistId?: number, limit: number = 50): Promise<DueWordsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = generateCacheKey('dueWords', { wordlistId, limit });
      
      const data = await cachedFetch(cacheKey, async () => {
        let url = '/api/review/due?limit=' + limit;
        if (wordlistId) {
          url += '&wordlistId=' + wordlistId;
        }

        const response = await authFetch(url);
        const result: DueWordsResponse = await response.json();
        return result;
      }, 2 * 60 * 1000); // 2分钟缓存

      if (data.success) {
        return data;
      } else {
        setError(data.error || 'Failed to fetch due words');
        return null;
      }
    } catch (err) {
      console.error('Error fetching due words:', err);
      setError('Network error while fetching due words');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 开始学习会话
  const startLearningSession = useCallback(async (
    sessionType: 'new' | 'review' | 'test',
    wordlistId?: number,
    limit: number = 50
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (sessionType === 'test') {
        // 测试模式：获取词书中的所有单词
        const response = await authFetch(`/api/wordlists/${wordlistId}`);
        const data = await response.json();
        
        if (data.success) {
          const words = data.wordlist.words.map((word: any) => word.wordText);
          setLearningState({
            sessionType,
            wordQueue: shuffleArray(words),
            currentWordText: null,
            currentWordData: null,
            currentIndex: 0,
            status: 'active',
            wordlistId
          });
          return true;
        } else {
          setError(data.error || 'Failed to fetch wordlist');
          return false;
        }
      } else {
        // 新学习或复习模式：获取待复习的单词
        const data = await fetchDueWords(wordlistId, limit);
        
        if (data && data.success) {
          if (sessionType === 'new') {
            // 新学习模式：优先选择复习阶段为0的单词
            const response = await authFetch('/api/review/due', {
              method: 'POST',
              body: JSON.stringify({ wordlistId })
            });
            
            const stats = await response.json();
            if (stats.success) {
              // 这里可以进一步筛选，但现在先使用所有待复习单词
              setLearningState({
                sessionType,
                wordQueue: data.words,
                currentWordText: null,
                currentWordData: null,
                currentIndex: 0,
                status: 'active',
                wordlistId
              });
              return true;
            } else {
              setError('Failed to get learning stats');
              return false;
            }
          } else {
            // 复习模式：使用所有待复习单词
            setLearningState({
              sessionType,
              wordQueue: data.words,
              currentWordText: null,
              currentWordData: null,
              currentIndex: 0,
              status: 'active',
              wordlistId
            });
            return true;
          }
        } else {
          setError('No due words found');
          return false;
        }
      }
    } catch (err) {
      console.error('Error starting learning session:', err);
      setError('Network error while starting learning session');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDueWords]);

  // 加载当前单词数据
  const loadCurrentWord = useCallback(async (): Promise<void> => {
    if (!learningState.currentWordText) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/dictionary?word=${learningState.currentWordText}&type=all`);
      const data = await response.json();

      if (data.success && data.data) {
        setLearningState(prev => ({
          ...prev,
          currentWordData: data.data
        }));
      } else {
        setError('Failed to load word data');
      }
    } catch (err) {
      console.error('Error loading word data:', err);
      setError('Network error while loading word data');
    } finally {
      setIsLoading(false);
    }
  }, [learningState.currentWordText]);

  // 进入下一个单词
  const nextWord = (): boolean => {
    if (learningState.currentIndex >= learningState.wordQueue.length - 1) {
      // 已经是最后一个单词
      setLearningState(prev => ({
        ...prev,
        status: 'finished'
      }));
      return false;
    }

    const nextIndex = learningState.currentIndex + 1;
    const nextWordText = learningState.wordQueue[nextIndex];

    setLearningState(prev => ({
      ...prev,
      currentIndex: nextIndex,
      currentWordText: nextWordText,
      currentWordData: null
    }));

    return true;
  };

  // 更新单词复习进度
  const updateWordProgress = useCallback(async (wordId: number, isCorrect: boolean = true): Promise<ReviewProgressResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/review/progress/${wordId}`, {
        method: 'POST',
        body: JSON.stringify({ isCorrect })
      });

      const data: ReviewProgressResponse = await response.json();

      if (data.success) {
        return data;
      } else {
        setError(data.error || 'Failed to update word progress');
        return null;
      }
    } catch (err) {
      console.error('Error updating word progress:', err);
      setError('Network error while updating word progress');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 结束学习会话
  const endLearningSession = (): void => {
    setLearningState({
      sessionType: null,
      wordQueue: [],
      currentWordText: null,
      currentWordData: null,
      currentIndex: 0,
      status: 'idle'
    });
  };

  // 获取学习进度统计
  const getLearningProgressStats = useCallback(async (wordlistId?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = generateCacheKey('learningProgressStats', { wordlistId });
      
      const data = await cachedFetch(cacheKey, async () => {
        const response = await authFetch('/api/review/due', {
          method: 'POST',
          body: JSON.stringify({ wordlistId })
        });

        const result = await response.json();
        return result;
      }, 3 * 60 * 1000); // 3分钟缓存

      if (data.success) {
        return data.stats;
      } else {
        setError(data.error || 'Failed to fetch learning progress stats');
        return null;
      }
    } catch (err) {
      console.error('Error fetching learning progress stats:', err);
      setError('Network error while fetching learning progress stats');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 当当前单词文本变化时，加载单词数据
  useEffect(() => {
    if (learningState.currentWordText) {
      loadCurrentWord();
    }
  }, [learningState.currentWordText]);

  return {
    learningState,
    isLoading,
    error,
    fetchDueWords,
    startLearningSession,
    nextWord,
    updateWordProgress,
    endLearningSession,
    getLearningProgressStats
  };
}

// 工具函数：随机打乱数组
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 工具函数：计算下次复习日期
export function calculateNextReviewDate(currentStage: number): Date {
  const intervalDays = EBBINGHAUS_INTERVAL_MAP[currentStage + 1 as keyof typeof EBBINGHAUS_INTERVAL_MAP] || 60;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate;
}

// 工具函数：获取复习间隔描述
export function getReviewIntervalDescription(stage: number): string {
  const intervalDays = EBBINGHAUS_INTERVAL_MAP[stage as keyof typeof EBBINGHAUS_INTERVAL_MAP] || 60;
  
  if (intervalDays === 1) return '1 天后';
  if (intervalDays < 7) return `${intervalDays} 天后`;
  if (intervalDays < 30) return `${Math.round(intervalDays / 7)} 周后`;
  if (intervalDays < 365) return `${Math.round(intervalDays / 30)} 个月后`;
  return `${Math.round(intervalDays / 365)} 年后`;
}