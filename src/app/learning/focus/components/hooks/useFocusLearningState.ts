'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLearning } from '@/hooks/useLearning';
import { useDefinitionSettings } from '@/hooks/useDefinitionSettings';
import { WordCard, DefinitionPanel, WordDefinitionData } from '../types';
import { CollisionEngine } from '../physics';
import { LearningState } from '@/types/learning';

// 定义返回类型
interface UseFocusLearningStateReturn {
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
  containerRef: React.RefObject<HTMLDivElement | null>;
  
  // 设置相关
  settings: any;
  settingsLoading: boolean;
  
  // 学习状态
  learningState: LearningState;
  isLoading: boolean;
  error: string | null;
  
  // 方法
  setWordCards: React.Dispatch<React.SetStateAction<WordCard[]>>;
  setDefinitionPanel: React.Dispatch<React.SetStateAction<DefinitionPanel | null>>;
  setCollisionDetected: React.Dispatch<React.SetStateAction<boolean>>;
  setDefinitionPanelWithLogging: (panel: DefinitionPanel | null) => void;
  getCardDimensions: () => { widthPercent: number; heightPercent: number };
  handleWordCardClick: (
    cardId: string,
    event?: React.MouseEvent,
    playAutoAudio?: (pronunciationData: any, isUserInteraction: boolean) => void,
    stopAutoAudio?: () => void
  ) => void;
  handleOutsideClick: (event: MouseEvent, stopAutoAudio?: () => void) => void;
  handleExitLearning: () => void;
  handleBackToDashboard: () => void;
  confirmExitLearning: () => void;
  cancelExitLearning: () => void;
  shuffleWordCards: () => void;
  handleOpenSettings: () => void;
  handleCloseSettings: () => void;
  handleFullscreen: () => void;
  handleSettings: () => void;
  getLearningStats: () => {
    totalWords: number;
    completedWords: number;
    remainingWords: number;
    mode: string;
  };
  getEnabledDefinitionTypes: () => any[];
  toggleDefinitionType: (id: string, enabled: boolean) => void;
  reorderTypes: (fromIndex: number, toIndex: number) => void;
  updateUI: (settings: any) => void;
  reset: () => void;
  nextWord: () => boolean;
}

/**
 * 主页面状态管理 Hook
 * 整合所有状态和业务逻辑，使主组件更加清晰
 */
export function useFocusLearningState(): UseFocusLearningStateReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userState } = useAuth();
  const {
    learningState,
    isLoading,
    error,
    startLearningSession,
    nextWord,
    endLearningSession
  } = useLearning();
  
  const {
    settings,
    isLoading: settingsLoading,
    toggleDefinitionType,
    reorderTypes,
    updateUI,
    reset
  } = useDefinitionSettings();
  
  // 基础状态
  const [wordCards, setWordCards] = useState<WordCard[]>([]);
  const [definitionPanel, setDefinitionPanel] = useState<DefinitionPanel | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState<'new' | 'review' | 'test' | null>(null);
  const [wordlistId, setWordlistId] = useState<number | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [collisionDetected, setCollisionDetected] = useState(false);
  const [hasUserInteraction, setHasUserInteraction] = useState(false);
  
  // 引用
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算卡片尺寸百分比
  const getCardDimensions = useCallback(() => {
    const cardWidthPx = settings.uiSettings.cardSize;
    const cardHeightPx = 48; // 固定高度
    const containerWidth = 1200; // 假设容器宽度
    const containerHeight = 700; // 假设容器高度
    
    return {
      widthPercent: (cardWidthPx / containerWidth) * 100,
      heightPercent: (cardHeightPx / containerHeight) * 100
    };
  }, [settings.uiSettings.cardSize]);

  // 设置释义面板
  const setDefinitionPanelWithLogging = useCallback((newPanel: DefinitionPanel | null) => {
    setDefinitionPanel(newPanel);
  }, []);

  // 生成不重叠的随机位置
  const generateRandomPosition = useCallback((existingCards: WordCard[]): { x: number; y: number } => {
    const margin = 5; // 边距百分比
    const { widthPercent, heightPercent } = getCardDimensions();
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = margin + Math.random() * (100 - margin - widthPercent);
      const y = margin + Math.random() * (100 - margin - heightPercent);
      
      // 检查是否与现有卡片重叠 - 减小判定范围
      const hasOverlap = existingCards.some(card => {
        const dx = Math.abs(card.position.x - x);
        const dy = Math.abs(card.position.y - y);
        return dx < (widthPercent - 1) && dy < (heightPercent - 1); // 减小重叠判定范围
      });
      
      if (!hasOverlap) {
        return { x, y };
      }
    }
    
    // 如果找不到不重叠的位置，返回一个随机位置
    return {
      x: margin + Math.random() * (100 - margin - widthPercent),
      y: margin + Math.random() * (100 - margin - heightPercent)
    };
  }, [getCardDimensions]);

  // 添加新单词卡片
  const addNewWordCard = useCallback((
    wordText: string,
    definition?: WordDefinitionData | null,
    pronunciationData?: WordDefinitionData['pronunciationData']
  ) => {
    const position = generateRandomPosition(wordCards);
    const newCard: WordCard = {
      id: `word-${Date.now()}-${Math.random()}`,
      text: wordText,
      position,
      definition,
      pronunciationData,
      isExpanded: false,
      isAnimating: true,
      physics: CollisionEngine.createDefaultPhysics(),
      isColliding: false,
      collisionScale: 1
    };

    console.log('➕ 添加新单词卡片:', {
      wordText,
      position,
      hasDefinition: !!definition,
      hasPronunciation: !!pronunciationData
    });

    setWordCards(prev => [...prev, newCard]);

    // 动画结束后移除动画标记
    setTimeout(() => {
      setWordCards(prev =>
        prev.map(card =>
          card.id === newCard.id ? { ...card, isAnimating: false } : card
        )
      );
    }, 200);
  }, [wordCards, generateRandomPosition]);

  // 处理单词卡片点击
  const handleWordCardClick = useCallback((
    cardId: string,
    event?: React.MouseEvent,
    playAutoAudio?: (pronunciationData: any, isUserInteraction: boolean) => void,
    stopAutoAudio?: () => void
  ) => {
    const card = wordCards.find(c => c.id === cardId);
    if (!card || isTransitioning) {
      console.log('❌ 卡片点击被忽略:', { cardId, cardExists: !!card, isTransitioning });
      return;
    }

    console.log('📖 处理单词卡片点击:', {
      cardId,
      wordText: card.text,
      当前释义面板: definitionPanel?.wordText,
      是否有释义数据: !!card.definition
    });

    // 如果有展开的释义面板，先关闭
    if (definitionPanel && definitionPanel.wordId !== cardId) {
      console.log('🔄 关闭当前释义面板，准备打开新的');
      stopAutoAudio?.();
      setDefinitionPanelWithLogging(null);
      return;
    }

    // 如果点击的是已展开的卡片，关闭释义面板
    if (definitionPanel && definitionPanel.wordId === cardId) {
      console.log('📕 关闭当前释义面板');
      stopAutoAudio?.();
      setDefinitionPanelWithLogging(null);
      return;
    }

    // 展开释义面板
    const newDefinitionPanel = {
      wordId: cardId,
      wordText: card.text,
      position: card.position,
      definition: card.definition,
      pronunciationData: card.pronunciationData,
      isVisible: true,
      sourceCardPosition: card.position
    };

    console.log('📖 展开释义面板:', newDefinitionPanel);
    setDefinitionPanelWithLogging(newDefinitionPanel);

    // 自动播放音频（传入用户交互标记）
    if (card.pronunciationData && playAutoAudio) {
      console.log('🔊 触发音频播放');
      playAutoAudio(card.pronunciationData, true); // 传入 true 表示这是用户直接交互
    }
  }, [wordCards, definitionPanel, isTransitioning]);

  // 处理点击外部区域
  const handleOutsideClick = useCallback((
    event: MouseEvent,
    stopAutoAudio?: () => void
  ) => {
    if (!containerRef.current || !containerRef.current.contains(event.target as Node)) {
      return;
    }

    // 检查点击的是否是释义面板或单词卡片
    const target = event.target as HTMLElement;
    const isClickOnCard = target.closest('.word-card');
    const isClickOnPanel = target.closest('.definition-panel');
    const isClickOnControls = target.closest('.corner-controls');

    // 添加更多检查，确保不会误关闭释义面板
    const panelElement = document.querySelector('.definition-panel');
    const isClickInsidePanel = panelElement && panelElement.contains(target);

    if (!isClickOnCard && !isClickOnPanel && !isClickOnControls && !isClickInsidePanel && definitionPanel) {
      console.log('🖱️ 点击外部区域，关闭释义面板并进入下一个单词');
      // 关闭释义面板并添加新单词
      stopAutoAudio?.();
      setDefinitionPanelWithLogging(null);

      // 移动到下一个单词
      setTimeout(() => {
        nextWord();
      }, 300);
    }
  }, [definitionPanel, nextWord]);

  // 处理退出学习
  const handleExitLearning = useCallback(() => {
    setIsExitModalOpen(true);
  }, []);

  // 处理返回仪表盘
  const handleBackToDashboard = useCallback(() => {
    endLearningSession();
    router.push('/dashboard');
  }, [endLearningSession, router]);

  // 确认退出学习
  const confirmExitLearning = useCallback(() => {
    endLearningSession();
    router.push('/dashboard');
  }, [endLearningSession, router]);

  // 取消退出学习
  const cancelExitLearning = useCallback(() => {
    setIsExitModalOpen(false);
  }, []);

  // 打乱单词卡片位置
  const shuffleWordCards = useCallback(() => {
    setWordCards(prev => {
      const shuffled = [...prev];
      const newCards = [];

      // 为每个卡片生成新的不重叠随机位置
      for (let i = 0; i < shuffled.length; i++) {
        const card = shuffled[i];
        // 创建临时数组，包含当前卡片和其他已重新定位的卡片
        const newPosition = generateRandomPosition(newCards);

        newCards.push({
          ...card,
          position: newPosition,
          isAnimating: true // 添加动画标记
        });
      }

      return newCards;
    });

    // 300ms后移除动画标记
    setTimeout(() => {
      setWordCards(prev =>
        prev.map(card => ({ ...card, isAnimating: false }))
      );
    }, 300);
  }, [generateRandomPosition]);

  // 处理设置面板
  const handleOpenSettings = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  // 处理全屏
  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // 处理设置
  const handleSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  // 计算学习统计信息
  const getLearningStats = useCallback(() => {
    const totalWords = learningState.wordQueue.length;
    const currentIndex = learningState.currentIndex;
    const completedWords = learningState.status === 'finished'
      ? totalWords
      : currentIndex;

    return {
      totalWords,
      completedWords,
      remainingWords: Math.max(0, totalWords - completedWords),
      mode: sessionMode === 'new' ? '新词学习' :
            sessionMode === 'review' ? '复习模式' : '测试模式'
    };
  }, [learningState.wordQueue, learningState.currentIndex, learningState.status, sessionMode]);

  // 获取启用的释义类型
  const getEnabledDefinitionTypes = useCallback(() => {
    return settings.definitionTypes.filter(type => type.enabled).sort((a, b) => a.order - b.order);
  }, [settings]);

  // 副作用处理
  // 如果用户未认证，重定向到令牌页面
  useEffect(() => {
    if (userState.status === 'idle' || (userState.status === 'error' && !userState.isAuthenticated)) {
      router.push('/token');
    }
  }, [userState.status, userState.isAuthenticated, router]);

  // 初始化学习会话
  useEffect(() => {
    const mode = searchParams.get('mode') as 'new' | 'review' | 'test' | null;
    const wlId = searchParams.get('wordlistId');
    
    if (mode && userState.isAuthenticated) {
      setSessionMode(mode);
      if (wlId) {
        setWordlistId(parseInt(wlId));
      }
      
      // 开始学习会话
      startLearningSession(mode, wlId ? parseInt(wlId) : undefined);
    }
  }, [searchParams, userState.isAuthenticated, startLearningSession]);

  // 当有新单词时，添加到卡片列表
  useEffect(() => {
    if (learningState.currentWordText && !isTransitioning) {
      // 检查是否已经添加过这个单词
      const wordAlreadyAdded = wordCards.some(card => card.text === learningState.currentWordText);

      if (!wordAlreadyAdded) {
        // 直接使用已有的单词数据，不再调用API
        addNewWordCard(
          learningState.currentWordText!,
          learningState.currentWordData,
          learningState.currentWordData?.pronunciationData
        );
      }
    }
  }, [learningState.currentWordText, isTransitioning, wordCards, addNewWordCard]);

  // 当学习完成时，自动显示完成提示
  useEffect(() => {
    if (learningState.status === 'finished' && !isExitModalOpen) {
      // 延迟显示完成提示，让用户看到最后一个单词
      const timer = setTimeout(() => {
        setIsExitModalOpen(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [learningState.status, isExitModalOpen]);

  // 当单词数据加载完成后，更新对应的卡片
  useEffect(() => {
    if (learningState.currentWordData && learningState.currentWordText) {
      setWordCards(prev =>
        prev.map(card =>
          card.text === learningState.currentWordText
            ? {
                ...card,
                definition: learningState.currentWordData,
                pronunciationData: learningState.currentWordData?.pronunciationData
              }
            : card
        )
      );
    }
  }, [learningState.currentWordData, learningState.currentWordText]);

  // 跟踪用户首次交互
  useEffect(() => {
    const handleFirstUserInteraction = () => {
      if (!hasUserInteraction) {
        setHasUserInteraction(true);
      }
    };

    // 监听各种用户交互事件
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleFirstUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFirstUserInteraction);
      });
    };
  }, [hasUserInteraction]);

  return {
    // 状态
    wordCards,
    definitionPanel,
    isSettingsModalOpen,
    isExitModalOpen,
    sessionMode,
    wordlistId,
    isTransitioning,
    collisionDetected,
    hasUserInteraction,
    containerRef,
    
    // 设置相关
    settings,
    settingsLoading,
    
    // 学习状态
    learningState,
    isLoading,
    error,
    
    // 方法
    setWordCards,
    setDefinitionPanel,
    setCollisionDetected,
    setDefinitionPanelWithLogging,
    getCardDimensions,
    handleWordCardClick,
    handleOutsideClick,
    handleExitLearning,
    handleBackToDashboard,
    confirmExitLearning,
    cancelExitLearning,
    shuffleWordCards,
    handleOpenSettings,
    handleCloseSettings,
    handleFullscreen,
    handleSettings,
    getLearningStats,
    getEnabledDefinitionTypes,
    toggleDefinitionType,
    reorderTypes,
    updateUI,
    reset,
    nextWord
  };
}