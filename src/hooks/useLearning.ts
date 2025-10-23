'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DueWordsResponse, ReviewProgressResponse, LearningState, WordDefinitionData } from '@/types/learning';
import { authFetch } from './useAuth';
import { EBBINGHAUS_INTERVAL_MAP } from '@/types/learning';
import { cachedFetch, generateCacheKey } from '@/lib/cacheUtils';

// 单词数据缓存接口
interface WordDataCache {
  [wordText: string]: {
    data: WordDefinitionData;
    timestamp: number;
    expiry: number;
  };
}

// 预加载队列任务
interface PreloadTask {
  wordText: string;
  priority: number;
  retryCount: number;
}

// 初始化用户学习进度的API调用
const initializeUserProgress = async (wordlistId?: number): Promise<boolean> => {
  try {
    const response = await authFetch('/api/learning/initialize', {
      method: 'POST',
      body: JSON.stringify({ wordlistId })
    });
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error initializing user progress:', error);
    return false;
  }
};

// 检查用户学习进度初始化状态
const checkInitializationStatus = async (wordlistId?: number): Promise<{
  isFullyInitialized: boolean;
  totalWords: number;
  initializedWords: number;
}> => {
  try {
    let url = '/api/learning/initialize';
    if (wordlistId) {
      url += `?wordlistId=${wordlistId}`;
    }
    
    const response = await authFetch(url);
    const data = await response.json();
    
    if (data.success) {
      return {
        isFullyInitialized: data.status.isFullyInitialized,
        totalWords: data.status.totalWords,
        initializedWords: data.status.initializedWords
      };
    }
    
    return { isFullyInitialized: false, totalWords: 0, initializedWords: 0 };
  } catch (error) {
    console.error('Error checking initialization status:', error);
    return { isFullyInitialized: false, totalWords: 0, initializedWords: 0 };
  }
};

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

  // 单词数据缓存（30分钟过期）
  const wordDataCache = useRef<WordDataCache>({});
  const CACHE_EXPIRY = 30 * 60 * 1000; // 30分钟

  // 预加载管理
  const preloadQueue = useRef<PreloadTask[]>([]);
  const isPreloading = useRef(false);
  const preloadPromise = useRef<Promise<void> | null>(null);

  // 检查缓存是否有效
  const isCacheValid = useCallback((wordText: string): boolean => {
    const cached = wordDataCache.current[wordText];
    if (!cached) return false;
    return Date.now() - cached.timestamp < cached.expiry;
  }, []);

  // 获取缓存的单词数据
  const getCachedWordData = useCallback((wordText: string): WordDefinitionData | null => {
    if (isCacheValid(wordText)) {
      return wordDataCache.current[wordText].data;
    }
    // 清理过期缓存
    delete wordDataCache.current[wordText];
    return null;
  }, [isCacheValid]);

  // 设置单词数据缓存
  const setCachedWordData = useCallback((wordText: string, data: WordDefinitionData): void => {
    wordDataCache.current[wordText] = {
      data,
      timestamp: Date.now(),
      expiry: CACHE_EXPIRY
    };
  }, [CACHE_EXPIRY]);

  // 获取单个单词数据（内部方法）
  const fetchWordDataInternal = useCallback(async (wordText: string): Promise<WordDefinitionData | null> => {
    try {
      // 检查缓存
      const cached = getCachedWordData(wordText);
      if (cached) {
        return cached;
      }

      // 从API获取数据
      const response = await authFetch(`/api/dictionary?word=${wordText}&type=all`);
      const data = await response.json();

      if (data.success && data.data) {
        // 缓存数据
        setCachedWordData(wordText, data.data);
        return data.data;
      } else {
        console.warn(`Failed to fetch data for word: ${wordText}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching word data for ${wordText}:`, error);
      return null;
    }
  }, [getCachedWordData, setCachedWordData]);

  // 预加载管理器（单个爬取，后5个单词）
  const preloadNextWords = useCallback(async (wordQueue: string[], currentIndex: number): Promise<void> => {
    if (isPreloading.current) return;

    isPreloading.current = true;

    try {
      // 清空当前队列
      preloadQueue.current = [];

      // 添加后面5个单词到预加载队列
      for (let i = 1; i <= 5; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < wordQueue.length) {
          const wordText = wordQueue[nextIndex];

          // 如果没有缓存，添加到预加载队列
          if (!isCacheValid(wordText)) {
            preloadQueue.current.push({
              wordText,
              priority: i, // 越近的单词优先级越高
              retryCount: 0
            });
          }
        }
      }

      // 按优先级排序
      preloadQueue.current.sort((a, b) => a.priority - b.priority);

      // 逐个处理预加载任务
      while (preloadQueue.current.length > 0) {
        const task = preloadQueue.current.shift();
        if (!task) continue;

        try {
          // 检查是否已经有缓存了
          if (isCacheValid(task.wordText)) {
            continue;
          }

          // 获取单词数据
          await fetchWordDataInternal(task.wordText);

          // 添加小延迟避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`预加载失败: ${task.wordText}`, error);

          // 重试机制：最多重试2次
          if (task.retryCount < 2) {
            task.retryCount++;
            task.priority += 10; // 降低重试优先级
            preloadQueue.current.push(task);
          }
        }
      }
    } finally {
      isPreloading.current = false;
    }
  }, [fetchWordDataInternal, isCacheValid]);

  // 触发预加载（异步，不阻塞当前流程）
  const triggerPreload = useCallback((wordQueue: string[], currentIndex: number): void => {
    // 清理之前的预加载Promise
    if (preloadPromise.current) {
      preloadPromise.current = null;
    }

    // 启动新的预加载
    preloadPromise.current = preloadNextWords(wordQueue, currentIndex).catch(error => {
      console.error('预加载过程出错:', error);
    });
  }, [preloadNextWords]);

  // 获取待复习的单词
  const fetchDueWords = useCallback(async (wordlistId?: number, limit: number = 200, isNewMode: boolean = false): Promise<DueWordsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = generateCacheKey('dueWords', { wordlistId, limit, isNewMode });
      
      const data = await cachedFetch(cacheKey, async () => {
        let url = '/api/review/due?limit=' + limit;
        if (wordlistId) {
          url += '&wordlistId=' + wordlistId;
        }
        if (isNewMode) {
          url += '&newMode=true';
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
    limit: number = 200
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (sessionType === 'test') {
        // 测试模式：获取词书中的所有单词
        const response = await authFetch(`/api/wordlists/${wordlistId}`);
        const data = await response.json();

        if (data.success) {
          const words: string[] = data.wordlist.words.map((word: { wordText: string }) => word.wordText);
          const shuffledWords: string[] = shuffleArray(words);

          setLearningState({
            sessionType,
            wordQueue: shuffledWords,
            currentWordText: null,
            currentWordData: null,
            currentIndex: 0,
            status: 'active',
            wordlistId
          });

          // 触发预加载前几个单词
          triggerPreload(shuffledWords, 0);

          return true;
        } else {
          setError(data.error || 'Failed to fetch wordlist');
          return false;
        }
      } else {
        // 新学习或复习模式：获取待复习的单词
        const isNewMode = sessionType === 'new';
        let data = await fetchDueWords(wordlistId, limit, isNewMode);
        
        // 如果没有待复习单词，检查是否需要初始化
        if (!data || !data.success || data.words.length === 0) {
          // 检查初始化状态
          const initStatus = await checkInitializationStatus(wordlistId);
          
          if (!initStatus.isFullyInitialized && initStatus.totalWords > 0) {
            // 需要初始化，显示初始化提示
            setError('正在初始化学习进度，请稍候...');
            
            // 调用初始化API
            const initSuccess = await initializeUserProgress(wordlistId);
            
            if (initSuccess) {
              // 初始化成功，重新获取待复习单词
              data = await fetchDueWords(wordlistId, limit, isNewMode);
              
              // 清除缓存以确保获取最新数据
              if (wordlistId) {
                const cacheKey = generateCacheKey('dueWords', { wordlistId, limit, isNewMode });
                // 这里可以添加清除缓存的逻辑
              }
            } else {
              setError('初始化学习进度失败，请重试');
              setIsLoading(false);
              return false;
            }
          }
        }
        
        if (data && data.success && data.words.length > 0) {
          // 确保立即设置第一个单词
          const firstWord = data.words[0] || null;

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
                currentWordText: firstWord, // 立即设置第一个单词
                currentWordData: null,
                currentIndex: 0,
                status: 'active',
                wordlistId
              });
              setIsLoading(false); // 确保清除加载状态

              // 触发预加载前几个单词
              triggerPreload(data.words, 0);

              return true;
            } else {
              setError('Failed to get learning stats');
              setIsLoading(false);
              return false;
            }
          } else {
            // 复习模式：使用所有待复习单词
            setLearningState({
              sessionType,
              wordQueue: data.words,
              currentWordText: firstWord, // 立即设置第一个单词
              currentWordData: null,
              currentIndex: 0,
              status: 'active',
              wordlistId
            });
            setIsLoading(false); // 确保清除加载状态

            // 触发预加载前几个单词
            triggerPreload(data.words, 0);

            return true;
          }
        } else {
          // 检查是否有词书但没有单词
          if (wordlistId) {
            const wordlistResponse = await authFetch(`/api/wordlists/${wordlistId}`);
            const wordlistData = await wordlistResponse.json();
            
            if (wordlistData.success && wordlistData.wordlist.words.length === 0) {
              setError('该词书中没有单词，请先上传单词');
            } else if (wordlistData.success && wordlistData.wordlist.words.length > 0) {
              // 词书有单词但没有学习进度，需要初始化
              setError('检测到词书中有单词但学习进度未初始化，正在自动初始化...');
              
              // 调用初始化API
              const initSuccess = await initializeUserProgress(wordlistId);
              
              if (initSuccess) {
                // 初始化成功，重新获取待复习单词
                data = await fetchDueWords(wordlistId, limit, isNewMode);
                
                if (data && data.success && data.words.length > 0) {
                  const firstWord = data.words[0] || null;
                  setLearningState({
                    sessionType,
                    wordQueue: data.words,
                    currentWordText: firstWord, // 立即设置第一个单词
                    currentWordData: null,
                    currentIndex: 0,
                    status: 'active',
                    wordlistId
                  });
                  setIsLoading(false); // 确保清除加载状态

                  // 触发预加载前几个单词
                  triggerPreload(data.words, 0);

                  return true;
                } else {
                  setError('初始化后仍无法获取单词，请刷新页面重试');
                  setIsLoading(false);
                }
              } else {
                setError('初始化学习进度失败，请重试');
              }
            } else {
              setError('没有找到可学习的单词，请稍后再试');
            }
          } else {
            setError('没有找到可学习的单词，请先创建或上传词书');
            setIsLoading(false);
          }
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

  // 加载当前单词数据（优化版本：从缓存获取）
  const loadCurrentWord = useCallback(async (): Promise<void> => {
    if (!learningState.currentWordText) return;

    try {
      // 优先从缓存获取数据
      const cachedData = getCachedWordData(learningState.currentWordText);

      if (cachedData) {
        // 直接使用缓存数据，实现无刷新切换
        setLearningState(prev => ({
          ...prev,
          currentWordData: cachedData
        }));
      } else {
        // 如果没有缓存，显示加载状态
        setIsLoading(true);
        const data = await fetchWordDataInternal(learningState.currentWordText);

        if (data) {
          setLearningState(prev => ({
            ...prev,
            currentWordData: data
          }));
        } else {
          setError('Failed to load word data');
        }
        setIsLoading(false);
      }

      // 触发预加载后面5个单词
      triggerPreload(learningState.wordQueue, learningState.currentIndex);

    } catch (err) {
      console.error('Error loading word data:', err);
      setError('Network error while loading word data');
      setIsLoading(false);
    }
  }, [learningState.currentWordText, learningState.wordQueue, learningState.currentIndex, getCachedWordData, fetchWordDataInternal, triggerPreload]);

  // 进入下一个单词（优化版本：从缓存获取数据）
  const nextWord = useCallback((): boolean => {
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

    // 尝试从缓存获取下一个单词的数据
    const nextWordData = getCachedWordData(nextWordText);

    setLearningState(prev => ({
      ...prev,
      currentIndex: nextIndex,
      currentWordText: nextWordText,
      currentWordData: nextWordData // 直接使用缓存数据，如果没有则为null
    }));

    // 触发预加载新的后5个单词
    triggerPreload(learningState.wordQueue, nextIndex);

    return true;
  }, [learningState.currentIndex, learningState.wordQueue, getCachedWordData, triggerPreload]);

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