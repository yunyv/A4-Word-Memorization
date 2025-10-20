'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLearning } from '@/hooks/useLearning';
import { Button } from '@/components/ui/button';
import { Settings, Maximize2, Volume2 } from 'lucide-react';
import { authFetch } from '@/hooks/useAuth';

// 单词卡片接口
interface WordCard {
  id: string;
  text: string;
  position: { x: number; y: number }; // 百分比位置
  definition?: any;
  pronunciationData?: any;
  isExpanded: boolean;
  isAnimating: boolean;
  isDragging?: boolean;
}

// 释义面板接口
interface DefinitionPanel {
  wordId: string;
  wordText: string;
  position: { x: number; y: number }; // 展开位置
  definition: any;
  pronunciationData?: any;
  isVisible: boolean;
  sourceCardPosition: { x: number; y: number }; // 源卡片位置
}

export default function FocusLearningPage() {
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
  
  const [wordCards, setWordCards] = useState<WordCard[]>([]);
  const [definitionPanel, setDefinitionPanel] = useState<DefinitionPanel | null>(null);
  const [sessionMode, setSessionMode] = useState<'new' | 'review' | 'test' | null>(null);
  const [wordlistId, setWordlistId] = useState<number | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [collisionDetected, setCollisionDetected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 生成不重叠的随机位置
  const generateRandomPosition = useCallback((existingCards: WordCard[]): { x: number; y: number } => {
    const margin = 5; // 边距百分比
    const cardWidth = 12; // 卡片宽度百分比 (140px / 1200px)
    const cardHeight = 7; // 卡片高度百分比 (48px / 700px)
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = margin + Math.random() * (100 - margin - cardWidth);
      const y = margin + Math.random() * (100 - margin - cardHeight);
      
      // 检查是否与现有卡片重叠
      const hasOverlap = existingCards.some(card => {
        const dx = Math.abs(card.position.x - x);
        const dy = Math.abs(card.position.y - y);
        return dx < (cardWidth + 2) && dy < (cardHeight + 2); // 添加一些间距
      });
      
      if (!hasOverlap) {
        return { x, y };
      }
    }
    
    // 如果找不到不重叠的位置，返回一个随机位置
    return {
      x: margin + Math.random() * (100 - margin - cardWidth),
      y: margin + Math.random() * (100 - margin - cardHeight)
    };
  }, []);

  // 检查两个位置是否重叠
  const checkOverlap = useCallback((pos1: { x: number; y: number }, pos2: { x: number; y: number }, cardWidth: number, cardHeight: number, margin: number = 2): boolean => {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return dx < (cardWidth + margin) && dy < (cardHeight + margin);
  }, []);

  // 检查位置是否与其他卡片重叠
  const checkCollisionWithOtherCards = useCallback((cardId: string, position: { x: number; y: number }): boolean => {
    const cardWidth = 12; // 卡片宽度百分比 (140px / 1200px)
    const cardHeight = 7; // 卡片高度百分比 (48px / 700px)
    
    return wordCards.some(card => {
      if (card.id === cardId) return false;
      return checkOverlap(position, card.position, cardWidth, cardHeight);
    });
  }, [wordCards, checkOverlap]);

  // 检查位置是否在屏幕边界内
  const checkPositionInBounds = useCallback((position: { x: number; y: number }): { x: number; y: number } => {
    const margin = 5; // 边距百分比
    const cardWidth = 12; // 卡片宽度百分比
    const cardHeight = 7; // 卡片高度百分比
    
    const boundedX = Math.max(margin, Math.min(100 - margin - cardWidth, position.x));
    const boundedY = Math.max(margin, Math.min(100 - margin - cardHeight, position.y));
    
    return { x: boundedX, y: boundedY };
  }, []);

  // 处理鼠标按下事件（开始拖动）
  const handleMouseDown = useCallback((e: React.MouseEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 如果有展开的释义面板，先关闭
    if (definitionPanel) {
      setDefinitionPanel(null);
    }
    
    const card = wordCards.find(c => c.id === cardId);
    if (!card) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    // 计算鼠标相对于卡片中心的偏移量（百分比）
    const cardCenterX = ((rect.left + rect.width / 2) - containerRect.left) / containerRect.width * 100;
    const cardCenterY = ((rect.top + rect.height / 2) - containerRect.top) / containerRect.height * 100;
    const mouseX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const mouseY = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    setDragOffset({
      x: mouseX - cardCenterX,
      y: mouseY - cardCenterY
    });
    
    setDraggedCard(cardId);
    setCollisionDetected(false);
    
    // 设置卡片为拖动状态
    setWordCards(prev =>
      prev.map(card =>
        card.id === cardId ? { ...card, isDragging: true } : card
      )
    );
  }, [wordCards, definitionPanel]);

  // 处理鼠标移动事件（拖动中）
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedCard || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // 计算鼠标位置（百分比）
    const mouseX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const mouseY = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    // 计算新位置（考虑偏移量）
    const newPosition = {
      x: mouseX - dragOffset.x,
      y: mouseY - dragOffset.y
    };
    
    // 检查边界
    const boundedPosition = checkPositionInBounds(newPosition);
    
    // 检查碰撞
    const hasCollision = checkCollisionWithOtherCards(draggedCard, boundedPosition);
    setCollisionDetected(hasCollision);
    
    // 如果没有碰撞，更新位置
    if (!hasCollision) {
      setWordCards(prev =>
        prev.map(card =>
          card.id === draggedCard ? { ...card, position: boundedPosition } : card
        )
      );
    }
  }, [draggedCard, dragOffset, checkPositionInBounds, checkCollisionWithOtherCards]);

  // 处理鼠标释放事件（结束拖动）
  const handleMouseUp = useCallback(() => {
    if (!draggedCard) return;
    
    // 移除拖动状态
    setWordCards(prev =>
      prev.map(card =>
        card.id === draggedCard ? { ...card, isDragging: false } : card
      )
    );
    
    setDraggedCard(null);
    setCollisionDetected(false);
  }, [draggedCard]);

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (draggedCard) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedCard, handleMouseMove, handleMouseUp]);

  // 添加新单词卡片
  const addNewWordCard = useCallback((wordText: string, definition?: any, pronunciationData?: any) => {
    const position = generateRandomPosition(wordCards);
    const newCard: WordCard = {
      id: `word-${Date.now()}-${Math.random()}`,
      text: wordText,
      position,
      definition,
      pronunciationData,
      isExpanded: false,
      isAnimating: true
    };
    
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

  // 当单词数据加载完成后，更新对应的卡片
  useEffect(() => {
    if (learningState.currentWordData && learningState.currentWordText) {
      setWordCards(prev =>
        prev.map(card =>
          card.text === learningState.currentWordText
            ? {
                ...card,
                definition: learningState.currentWordData,
                pronunciationData: learningState.currentWordData.pronunciationData
              }
            : card
        )
      );
    }
  }, [learningState.currentWordData, learningState.currentWordText]);

  // 处理单词卡片点击
  const handleWordCardClick = useCallback((cardId: string) => {
    const card = wordCards.find(c => c.id === cardId);
    if (!card || isTransitioning) return;

    // 调试日志
    console.log('点击的卡片:', card);
    console.log('卡片释义数据:', card.definition);

    // 如果有展开的释义面板，先关闭
    if (definitionPanel && definitionPanel.wordId !== cardId) {
      setDefinitionPanel(null);
      return;
    }

    // 如果点击的是已展开的卡片，关闭释义面板
    if (definitionPanel && definitionPanel.wordId === cardId) {
      setDefinitionPanel(null);
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
    
    console.log('即将设置的释义面板数据:', newDefinitionPanel);
    setDefinitionPanel(newDefinitionPanel);
  }, [wordCards, definitionPanel, isTransitioning]);

  // 处理点击外部区域
  const handleOutsideClick = useCallback((event: MouseEvent) => {
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
      // 关闭释义面板并添加新单词
      setDefinitionPanel(null);
      
      // 移动到下一个单词
      setTimeout(() => {
        nextWord();
      }, 300);
    }
  }, [definitionPanel, nextWord]);

  // 添加点击外部事件监听
  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [handleOutsideClick]);

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        // 关闭释义面板并添加新单词
        if (definitionPanel) {
          setDefinitionPanel(null);
          setTimeout(() => {
            nextWord();
          }, 300);
        }
      } else if (event.code === 'Escape') {
        // 关闭释义面板
        setDefinitionPanel(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [definitionPanel, nextWord]);

  // 处理返回仪表盘
  const handleBackToDashboard = () => {
    endLearningSession();
    router.push('/dashboard');
  };

  // 处理设置
  const handleSettings = () => {
    router.push('/settings');
  };

  // 处理全屏
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // 如果正在加载或未认证，显示加载状态
  if (userState.status === 'loading' || !userState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-papyrus-white)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-focus-blue)' }}></div>
          <p className="mt-4" style={{ color: 'var(--color-rock-gray)' }}>正在加载...</p>
        </div>
      </div>
    );
  }

  // 如果正在初始化或出错
  if (isLoading || error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-papyrus-white)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-focus-blue)' }}></div>
          <p className="mt-4" style={{ color: 'var(--color-rock-gray)' }}>
            {error || '正在准备学习内容...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="focus-learning-container"
      style={{ 
        backgroundColor: 'var(--color-papyrus-white)',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 单词卡片 */}
      {wordCards.map(card => (
        <div
          key={card.id}
          className={`word-card ${card.isAnimating ? 'word-card-appearing' : ''} ${definitionPanel?.wordId === card.id ? 'word-card-expanded' : ''} ${card.isDragging ? 'word-card-dragging' : ''}`}
          style={{
            position: 'absolute',
            left: `${card.position.x}%`,
            top: `${card.position.y}%`,
            width: '140px',
            height: '48px',
            backgroundColor: 'var(--color-pure-white)',
            border: card.isDragging ? '2px solid var(--color-focus-blue)' : (definitionPanel?.wordId === card.id ? '2px solid var(--color-focus-blue)' : '1px solid #E2E8F0'),
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: card.isDragging ? 'move' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--color-ink-black)',
            fontFamily: "'Inter', 'Source Han Sans CN', sans-serif",
            boxShadow: card.isDragging ? '0 8px 16px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
            transition: card.isDragging ? 'none' : 'all 0.2s ease',
            zIndex: card.isDragging ? 25 : (definitionPanel?.wordId === card.id ? 15 : 10),
            opacity: card.isAnimating ? 0 : (card.isDragging ? 0.8 : 1),
            transform: `translate(-50%, -50%) ${card.isAnimating ? 'scale(0.8)' : 'scale(1)'} ${card.isDragging ? 'scale(1.05)' : ''}`,
            userSelect: 'none',
            willChange: card.isDragging ? 'transform' : 'auto'
          }}
          onMouseDown={(e) => handleMouseDown(e, card.id)}
          onClick={(e) => {
            e.stopPropagation();
            !card.isDragging && handleWordCardClick(card.id);
          }}
        >
          {card.text}
          
          {/* 拖动指示器 */}
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            opacity: 0.6,
            pointerEvents: 'none'
          }}>
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-rock-gray)'
            }} />
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-rock-gray)'
            }} />
          </div>
        </div>
      ))}
      
      {/* 碰撞指示器 */}
      {collisionDetected && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 107, 107, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 30,
          pointerEvents: 'none'
        }}>
          禁止放置：单词不能重叠
        </div>
      )}
      
      {/* 释义面板 */}
      {definitionPanel && (
        <div
          className="definition-panel"
          onClick={(e) => e.stopPropagation()} // 防止点击事件冒泡
          style={{
            position: 'absolute',
            left: `${definitionPanel.position.x}%`,
            top: `${definitionPanel.position.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '600px',
            maxWidth: '80vw',
            maxHeight: '70vh',
            overflowY: 'auto',
            backgroundColor: 'var(--color-pure-white)',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 1000, // 提高z-index确保在最上层
            padding: '24px',
            fontFamily: "'Inter', 'Source Han Sans CN', sans-serif",
            animation: 'definitionPanelExpand 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* 调试信息 */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              fontSize: '10px',
              color: 'red',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '2px'
            }}>
              Debug: {definitionPanel.definition ? '有数据' : '无数据'}
            </div>
          )}
          {/* 单词标题 */}
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--color-ink-black)',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            {definitionPanel.wordText}
          </div>
          
          {/* 音标 */}
          {definitionPanel.pronunciationData && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '18px',
                fontWeight: '500',
                color: 'var(--color-ink-black)'
              }}>
                [{definitionPanel.pronunciationData.american?.phonetic || definitionPanel.pronunciationData.british?.phonetic || ''}]
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div style={{
            height: '1px',
            backgroundColor: '#E2E8F0',
            marginBottom: '16px'
          }} />
          
          {/* 释义内容 */}
          <div style={{
            fontSize: '16px',
            lineHeight: '1.8',
            color: 'var(--color-ink-black)'
          }}>
            {/* 调试信息 */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                fontSize: '12px',
                color: 'red',
                marginBottom: '8px',
                padding: '4px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px'
              }}>
                释义数据类型: {typeof definitionPanel.definition}<br/>
                释义数据: {JSON.stringify(definitionPanel.definition, null, 2).substring(0, 200)}...
              </div>
            )}
            
            {/* 基本释义 */}
            {definitionPanel.definition?.definitions?.basic && definitionPanel.definition.definitions.basic.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {definitionPanel.definition.definitions.basic.map((def: any, index: number) => (
                  <div key={index} style={{ marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600' }}>{def.partOfSpeech}</span> {def.meaning}
                  </div>
                ))}
              </div>
            )}
            
            {/* 如果没有结构化释义，尝试显示原始释义数据 */}
            {!definitionPanel.definition?.definitions?.basic && definitionPanel.definition && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-rock-gray)', marginBottom: '8px' }}>释义:</div>
                {typeof definitionPanel.definition === 'string' ? (
                  <div>{definitionPanel.definition}</div>
                ) : definitionPanel.definition.pronunciation ? (
                  <div>音标: {definitionPanel.definition.pronunciation}</div>
                ) : (
                  <div>释义数据已加载，但格式不匹配</div>
                )}
              </div>
            )}
            
            {/* 如果完全没有释义数据，显示提示 */}
            {!definitionPanel.definition && (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--color-rock-gray)',
                fontStyle: 'italic'
              }}>
                释义数据加载中...
              </div>
            )}
            
            {/* 权威英汉释义 */}
            {definitionPanel.definition?.authoritativeDefinitions && definitionPanel.definition.authoritativeDefinitions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-rock-gray)', marginBottom: '8px' }}>权威英汉释义:</div>
                {definitionPanel.definition.authoritativeDefinitions.map((authDef: any, index: number) => (
                  <div key={index} style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{authDef.partOfSpeech}</div>
                    {authDef.definitions.map((defItem: any, defIndex: number) => (
                      <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '500' }}>{defItem.number}.</span>
                        <span style={{ marginLeft: '4px' }}>{defItem.chineseMeaning}</span>
                        {defItem.englishMeaning && (
                          <span style={{ marginLeft: '4px', color: 'var(--color-rock-gray)' }}>({defItem.englishMeaning})</span>
                        )}
                        {defItem.examples && defItem.examples.length > 0 && (
                          <div style={{ marginTop: '4px', marginLeft: '16px' }}>
                            {defItem.examples.map((example: any, exIndex: number) => (
                              <div key={exIndex} style={{ fontStyle: 'italic', fontSize: '14px', color: 'var(--color-rock-gray)' }}>
                                {example.english} {example.chinese && `(${example.chinese})`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* 习语 */}
                    {authDef.idioms && authDef.idioms.length > 0 && (
                      <div style={{ marginTop: '8px', marginLeft: '16px' }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>习语:</div>
                        {authDef.idioms.map((idiom: any, idiomIndex: number) => (
                          <div key={idiomIndex} style={{ marginBottom: '6px' }}>
                            <span style={{ fontWeight: '500' }}>{idiom.number}. {idiom.title}</span> - {idiom.meaning}
                            {idiom.examples && idiom.examples.length > 0 && (
                              <div style={{ marginTop: '4px', marginLeft: '16px' }}>
                                {idiom.examples.map((example: any, exIndex: number) => (
                                  <div key={exIndex} style={{ fontStyle: 'italic', fontSize: '14px', color: 'var(--color-rock-gray)' }}>
                                    {example.english} {example.chinese && `(${example.chinese})`}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* 英汉释义 */}
            {definitionPanel.definition?.bilingualDefinitions && definitionPanel.definition.bilingualDefinitions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-rock-gray)', marginBottom: '8px' }}>英汉释义:</div>
                {definitionPanel.definition.bilingualDefinitions.map((bilDef: any, index: number) => (
                  <div key={index} style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{bilDef.partOfSpeech}</div>
                    {bilDef.definitions.map((defItem: any, defIndex: number) => (
                      <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>{defItem.number}.</span> {defItem.meaning}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            
            {/* 英文释义 */}
            {definitionPanel.definition?.englishDefinitions && definitionPanel.definition.englishDefinitions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-rock-gray)', marginBottom: '8px' }}>英英释义:</div>
                {definitionPanel.definition.englishDefinitions.map((engDef: any, index: number) => (
                  <div key={index} style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{engDef.partOfSpeech}</div>
                    {engDef.definitions.map((defItem: any, defIndex: number) => (
                      <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>{defItem.number}.</span> {defItem.meaning}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            
            {/* 例句 */}
            {definitionPanel.definition?.sentences && definitionPanel.definition.sentences.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-rock-gray)', marginBottom: '8px' }}>例句:</div>
                {definitionPanel.definition.sentences.slice(0, 3).map((sentence: any, index: number) => (
                  <div key={index} style={{ marginBottom: '8px', fontStyle: 'italic' }}>
                    <div style={{ color: 'var(--color-ink-black)' }}>{sentence.english}</div>
                    {sentence.chinese && (
                      <div style={{ color: 'var(--color-rock-gray)', marginTop: '2px' }}>{sentence.chinese}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      
      {/* 角落控件 */}
      <div className="corner-controls" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        gap: '12px',
        zIndex: 30
      }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSettings}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-rock-gray)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFullscreen}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-rock-gray)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </div>
      
      {/* 添加动画样式 */}
      <style jsx>{`
        @keyframes definitionPanelExpand {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        .word-card:hover:not(.word-card-dragging) {
          transform: translate(-50%, -50%) translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          border-color: var(--color-focus-blue);
        }
        
        .word-card-dragging {
          cursor: move !important;
        }
        
        .word-card-appearing {
          animation: wordCardAppear 0.2s ease-out forwards;
        }
        
        @keyframes wordCardAppear {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}