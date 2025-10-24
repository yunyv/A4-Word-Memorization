'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLearning } from '@/hooks/useLearning';
import { useDefinitionSettings } from '@/hooks/useDefinitionSettings';
import { authFetch } from '@/hooks/useAuth';
import { WordCard, DefinitionPanel, WordDefinitionData } from '@/app/learning/focus/components/types';
import { LearningState } from '@/types/learning';
import { DefinitionSettings, DefinitionTypeSetting } from '@/types/definitionSettings';

// 定义返回类型
interface UseTestLearningStateReturn {
  // 状态
  wordCards: WordCard[];
  definitionPanel: DefinitionPanel | null;
  isSettingsModalOpen: boolean;
  isExitModalOpen: boolean;
  sessionMode: 'new' | 'review' | 'test' | null;
  wordlistId: number | undefined;
  isTransitioning: boolean;
  collisionDetected: boolean;
  hasUserInteraction: boolean;
  isDragging: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;

  // 设置相关
  settings: DefinitionSettings;
  settingsLoading: boolean;

  // 学习状态
  learningState: LearningState;
  isLoading: boolean;
  error: string | null;

  // 方法
  setWordCards: React.Dispatch<React.SetStateAction<WordCard[]>>;
  setDefinitionPanel: React.Dispatch<React.SetStateAction<DefinitionPanel | null>>;
  setCollisionDetected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setDefinitionPanelWithLogging: (panel: DefinitionPanel | null) => void;
  getCardDimensions: () => { widthPercent: number; heightPercent: number };
  handleWordCardClick: (
    cardId: string,
    event?: React.MouseEvent,
    playAutoAudio?: (pronunciationData: WordDefinitionData['pronunciationData'], isUserInteraction: boolean) => void,
    stopAutoAudio?: () => void
  ) => void;
  handleOutsideClick: (event: MouseEvent, stopAutoAudio?: () => void) => void;
  handleOpenSettings: () => void;
  handleCloseSettings: () => void;
  toggleDefinitionType: (typeId: string) => void;
  reorderTypes: (sourceIndex: number, destinationIndex: number) => void;
  updateUI: (updates: Partial<DefinitionSettings['uiSettings']>) => void;
  reset: () => void;
  getEnabledDefinitionTypes: () => DefinitionTypeSetting[];
  shuffleWordCards: () => void;
  handleFullscreen: () => void;
  handleExitLearning: () => void;
  cancelExitLearning: () => void;
  confirmExitLearning: () => void;
  getLearningStats: () => {
    totalWords: number;
    completedWords: number;
    remainingWords: number;
    mode: string;
  };
}

export function useTestLearningState(
  wordlistIdParam: Promise<{ wordlistId: string }>
): UseTestLearningStateReturn {
  const router = useRouter();
  const { startLearningSession, endLearningSession, learningState: externalLearningState } = useLearning();
  const { settings, isLoading: settingsLoading, updateSettings } = useDefinitionSettings();

  // 单词数据缓存（复用useLearning的逻辑）
  const wordDataCache = useRef<Record<string, { data: WordDefinitionData; timestamp: number; expiry: number }>>({});
  const CACHE_EXPIRY = 30 * 60 * 1000; // 30分钟

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

  // 获取单个单词数据
  const fetchWordData = useCallback(async (wordText: string): Promise<WordDefinitionData | null> => {
    try {
      // 检查缓存
      const cached = getCachedWordData(wordText);
      if (cached) {
        console.log(`📦 使用缓存数据: ${wordText}`);
        return cached;
      }

      console.log(`🌐 从API获取数据: ${wordText}`);
      // 从API获取数据
      const response = await authFetch(`/api/dictionary?word=${encodeURIComponent(wordText)}&type=all`);
      const data = await response.json();

      if (data.success && data.data) {
        // 缓存数据
        setCachedWordData(wordText, data.data);
        console.log(`✅ 数据获取并缓存成功: ${wordText}`);
        return data.data;
      } else {
        console.warn(`❌ 获取数据失败: ${wordText}`, data.error);
        return null;
      }
    } catch (error) {
      console.error(`❌ 获取单词数据异常: ${wordText}`, error);
      return null;
    }
  }, [getCachedWordData, setCachedWordData]);

  // 获取并解析词书ID
  const [wordlistId, setWordlistId] = useState<number | undefined>(undefined);
  const [isWordlistIdLoading, setIsWordlistIdLoading] = useState(true);

  // 处理异步的wordlistId参数
  useEffect(() => {
    const resolveWordlistId = async () => {
      try {
        const params = await wordlistIdParam;
        const id = parseInt(params.wordlistId, 10);
        setWordlistId(isNaN(id) ? undefined : id);
        console.log(`🔍 解析词书ID: ${params.wordlistId} -> ${isNaN(id) ? 'invalid' : id}`);
      } catch (error) {
        console.error('❌ 解析词书ID失败:', error);
        setWordlistId(undefined);
      } finally {
        setIsWordlistIdLoading(false);
      }
    };

    resolveWordlistId();
  }, [wordlistIdParam]);

  // 状态管理
  const [wordCards, setWordCards] = useState<WordCard[]>([]);
  const [definitionPanel, setDefinitionPanel] = useState<DefinitionPanel | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [collisionDetected, setCollisionDetected] = useState(false);
  const [hasUserInteraction, setHasUserInteraction] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 学习状态 - 使用外部学习状态
  const learningState = externalLearningState;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 综合加载状态
  const isOverallLoading = isWordlistIdLoading || isLoading;

  // 设置状态管理
  const [internalSettings, setInternalSettings] = useState<DefinitionSettings>(settings);

  // 同步外部设置
  useEffect(() => {
    if (!settingsLoading) {
      setInternalSettings(settings);
    }
  }, [settings, settingsLoading]);

  // 初始化测试会话 - 简化版本，与专注学习模式保持一致
  useEffect(() => {
    // 如果词书ID还在加载中，等待
    if (isWordlistIdLoading) {
      console.log('⏳ 词书ID解析中，等待...');
      return;
    }

    console.log(`🚀 测试会话初始化检查:`, {
      wordlistId,
      currentSessionType: learningState.sessionType,
      currentStatus: learningState.status,
      wordQueueLength: learningState.wordQueue.length
    });

    // 如果学习状态已经是测试模式且活跃，不需要重新初始化
    if (learningState.sessionType === 'test' && learningState.status === 'active') {
      console.log('✅ 测试会话已处于活跃状态，跳过初始化');
      setIsLoading(false);
      return;
    }

    // 如果有词书ID且学习状态未初始化，启动测试会话
    if (wordlistId && learningState.sessionType !== 'test') {
      console.log(`🎯 开始初始化测试会话 [wordlistId: ${wordlistId}]`);
      const initializeTestSession = async () => {
        setIsLoading(true);
        setError(null);

        try {
          console.log('📞 调用 startLearningSession...');
          const success = await startLearningSession('test', wordlistId, undefined);
          console.log(`📞 startLearningSession 结果:`, success);

          if (!success) {
            console.error('❌ startLearningSession 返回 false');
            setError('无法启动测试会话');
          } else {
            console.log('✅ 测试会话启动成功');
          }
        } catch (err) {
          console.error('❌ 初始化测试会话异常:', err);
          setError('初始化测试会话时发生错误');
        } finally {
          setIsLoading(false);
        }
      };

      initializeTestSession();
    } else if (!wordlistId) {
      console.error('❌ 缺少词书ID，无法初始化测试会话');
      setError('词书ID无效，请检查URL是否正确');
    }
  }, [wordlistId, isWordlistIdLoading, startLearningSession, learningState.sessionType, learningState.status, learningState.wordQueue.length]);

  // 初始化单词卡片
  useEffect(() => {
    const initializeWordCards = async () => {
      console.log(`🎴 开始初始化单词卡片:`, {
        sessionType: learningState.sessionType,
        wordQueueLength: learningState.wordQueue.length,
        currentCardsCount: wordCards.length
      });

      if (learningState.sessionType !== 'test') {
        console.log('⏸️ 非测试模式，跳过单词卡片初始化');
        return;
      }

      if (learningState.wordQueue.length === 0) {
        console.warn('⚠️ 单词队列为空，无法创建单词卡片');
        if (learningState.status === 'active') {
          setError('词书中没有可学习的单词');
        }
        return;
      }

      // 如果已经有单词卡片且数量匹配，不需要重新初始化
      if (wordCards.length === learningState.wordQueue.length) {
        console.log('🔄 单词卡片已存在且数量匹配，跳过重新初始化');
        return;
      }

      console.log(`📝 创建 ${learningState.wordQueue.length} 个单词卡片`);
      const newWordCards: WordCard[] = learningState.wordQueue.map((wordText, index) => ({
        id: `word-${index}`,
        text: wordText,
        position: { x: 0, y: 0 },
        definition: null,
        isExpanded: false,
        isAnimating: false
      }));

      // 布局算法
      const centerX = 50;
      const centerY = 50;
      const radius = Math.min(30, 100 / Math.sqrt(newWordCards.length));

      console.log(`🎨 布局算法:`, {
        totalCards: newWordCards.length,
        centerPosition: { x: centerX, y: centerY },
        radius
      });

      newWordCards.forEach((card, index) => {
        const angle = (index / newWordCards.length) * 2 * Math.PI;
        card.position.x = centerX + radius * Math.cos(angle);
        card.position.y = centerY + radius * Math.sin(angle);
      });

      console.log('📍 设置单词卡片到状态');
      setWordCards(newWordCards);

      console.log(`✅ 单词卡片初始化完成: ${newWordCards.length} 个卡片`);
    };

    initializeWordCards();
  }, [learningState.wordQueue, learningState.sessionType]);

  // 获取卡片尺寸
  const getCardDimensions = useCallback(() => {
    const baseWidth = 140;
    const baseHeight = 80;
    const scaleFactor = Math.min(1, 100 / Math.sqrt(wordCards.length));

    return {
      widthPercent: (baseWidth * scaleFactor) / window.innerWidth * 100,
      heightPercent: (baseHeight * scaleFactor) / window.innerHeight * 100
    };
  }, [wordCards.length]);

  // 设置释义面板（带日志）
  const setDefinitionPanelWithLogging = useCallback((panel: DefinitionPanel | null) => {
    if (panel) {
      console.log(`📖 打开释义面板: ${panel.wordText} (${panel.wordId})`);
    } else {
      console.log('📕 关闭释义面板');
    }
    setDefinitionPanel(panel);
  }, []);

  // 处理单词卡片点击（测试模式简化版本）
  const handleWordCardClick = useCallback(async (
    cardId: string,
    event?: React.MouseEvent,
    playAutoAudio?: (pronunciationData: WordDefinitionData['pronunciationData'], isUserInteraction: boolean) => void,
    stopAutoAudio?: () => void
  ) => {
    event?.stopPropagation();

    const card = wordCards.find(c => c.id === cardId);
    if (!card) {
      console.log('❌ 未找到卡片:', cardId);
      return;
    }

    console.log('🃏 测试模式：单词卡片被点击:', {
      cardId,
      cardText: card.text,
      isDragging: card.isDragging
    });

    // 如果卡片正在拖拽中，不处理点击事件
    if (card.isDragging) {
      console.log('⏸️ 卡片正在拖拽中，忽略点击事件');
      return;
    }

    // 首次用户交互
    if (!hasUserInteraction) {
      setHasUserInteraction(true);
    }

    // 如果点击当前已展开的卡片，则关闭
    if (definitionPanel?.wordId === cardId) {
      console.log('📕 关闭当前释义面板');
      stopAutoAudio?.();
      setDefinitionPanelWithLogging(null);
      return;
    }

    // 如果有其他卡片展开，先关闭它
    if (definitionPanel) {
      console.log('📖 关闭之前的释义面板');
      stopAutoAudio?.();
    }

    // 获取释义数据（如果卡片还没有释义数据）
    let definitionData = card.definition;
    if (!definitionData) {
      console.log(`🔍 获取释义数据: ${card.text}`);
      definitionData = await fetchWordData(card.text);

      if (definitionData) {
        // 更新卡片的释义数据
        setWordCards(prev =>
          prev.map(c =>
            c.id === cardId
              ? { ...c, definition: definitionData }
              : c
          )
        );
        console.log(`✅ 更新卡片释义数据: ${card.text}`);
      }
    }

    // 展开新卡片
    const newPanel: DefinitionPanel = {
      wordId: cardId,
      wordText: card.text,
      position: { x: card.position.x, y: card.position.y },
      definition: definitionData,
      pronunciationData: definitionData?.pronunciationData || undefined,
      isVisible: true,
      sourceCardPosition: { x: card.position.x, y: card.position.y }
    };

    console.log('📖 打开新的释义面板:', newPanel.wordText);
    setDefinitionPanelWithLogging(newPanel);

    // 自动播放音频
    if (playAutoAudio && definitionData?.pronunciationData) {
      playAutoAudio(definitionData.pronunciationData, true);
    }
  }, [wordCards, definitionPanel, hasUserInteraction, setDefinitionPanelWithLogging, fetchWordData]);

  // 处理点击外部区域
  const handleOutsideClick = useCallback((event: MouseEvent, stopAutoAudio?: () => void) => {
    const target = event.target as HTMLElement;

    // 检查是否点击了释义面板之外的区域
    if (definitionPanel) {
      const isClickOnDefinitionPanel = target.closest('.definition-panel');
      const isClickOnWordCard = target.closest('.word-card');

      // 如果点击的不是释义面板和单词卡片，则关闭释义面板
      if (!isClickOnDefinitionPanel && !isClickOnWordCard) {
        stopAutoAudio?.();
        setDefinitionPanelWithLogging(null);
      }
    }
  }, [definitionPanel, setDefinitionPanelWithLogging]);

  // 打开设置
  const handleOpenSettings = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  // 关闭设置
  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  // 切换释义类型
  const toggleDefinitionType = useCallback((typeId: string) => {
    setInternalSettings(prev => {
      const newTypes = prev.definitionTypes.map(type =>
        type.id === typeId ? { ...type, enabled: !type.enabled } : type
      );
      const newSettings = { ...prev, definitionTypes: newTypes };
      updateSettings(newSettings);
      return newSettings;
    });
  }, [updateSettings]);

  // 重新排序释义类型
  const reorderTypes = useCallback((sourceIndex: number, destinationIndex: number) => {
    setInternalSettings(prev => {
      const newTypes = Array.from(prev.definitionTypes);
      const [removed] = newTypes.splice(sourceIndex, 1);
      newTypes.splice(destinationIndex, 0, removed);
      const newSettings = { ...prev, definitionTypes: newTypes };
      updateSettings(newSettings);
      return newSettings;
    });
  }, [updateSettings]);

  // 更新UI设置
  const updateUI = useCallback((updates: Partial<DefinitionSettings['uiSettings']>) => {
    setInternalSettings(prev => {
      const newSettings = {
        ...prev,
        uiSettings: { ...prev.uiSettings, ...updates }
      };
      updateSettings(newSettings);
      return newSettings;
    });
  }, [updateSettings]);

  // 重置设置
  const reset = useCallback(() => {
    // 这里可以实现重置逻辑
    console.log('重置设置功能待实现');
  }, []);

  // 获取启用的释义类型
  const getEnabledDefinitionTypes = useCallback(() => {
    return internalSettings.definitionTypes.filter(type => type.enabled);
  }, [internalSettings]);

  // 打乱单词卡片位置
  const shuffleWordCards = useCallback(() => {
    setIsTransitioning(true);

    setWordCards(prev => {
      const shuffled = [...prev];
      const centerX = 50;
      const centerY = 50;
      const radius = Math.min(30, 100 / Math.sqrt(shuffled.length));

      shuffled.forEach((card, index) => {
        const angle = (index / shuffled.length) * 2 * Math.PI;
        card.position.x = centerX + radius * Math.cos(angle);
        card.position.y = centerY + radius * Math.sin(angle);
      });

      return shuffled;
    });

    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  }, []);

  // 全屏处理
  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // 退出学习
  const handleExitLearning = useCallback(() => {
    setIsExitModalOpen(true);
  }, []);

  // 取消退出
  const cancelExitLearning = useCallback(() => {
    setIsExitModalOpen(false);
  }, []);

  // 确认退出
  const confirmExitLearning = useCallback(() => {
    endLearningSession();
    router.push('/dashboard');
  }, [endLearningSession, router]);

  // 获取学习统计（测试模式专用）
  const getLearningStats = useCallback(() => {
    const totalWords = learningState.wordQueue.length;
    // 测试模式没有进度概念，所有单词都可以学习
    const completedWords = 0;
    const remainingWords = totalWords;

    return {
      totalWords,
      completedWords,
      remainingWords,
      mode: '测试模式'
    };
  }, [learningState.wordQueue.length]);

  return {
    // 状态
    wordCards,
    definitionPanel,
    isSettingsModalOpen,
    isExitModalOpen,
    sessionMode: 'test',
    wordlistId,
    isTransitioning,
    collisionDetected,
    hasUserInteraction,
    isDragging,
    containerRef,

    // 设置相关
    settings: internalSettings,
    settingsLoading,

    // 学习状态
    learningState,
    isLoading: isOverallLoading,
    error,

    // 方法
    setWordCards,
    setDefinitionPanel,
    setCollisionDetected,
    setIsDragging,
    setDefinitionPanelWithLogging,
    getCardDimensions,
    handleWordCardClick,
    handleOutsideClick,
    handleOpenSettings,
    handleCloseSettings,
    toggleDefinitionType,
    reorderTypes,
    updateUI,
    reset,
    getEnabledDefinitionTypes,
    shuffleWordCards,
    handleFullscreen,
    handleExitLearning,
    cancelExitLearning,
    confirmExitLearning,
    getLearningStats
  };
}