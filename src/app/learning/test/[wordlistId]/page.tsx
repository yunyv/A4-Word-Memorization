'use client';

import { useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DefinitionSettingsModal } from '@/components/learning/DefinitionSettingsModal';
import { usePhysicsLogic } from '@/app/learning/focus/components/physics';
import { useAudioPlayer } from '@/app/learning/focus/components/audio';
import { useDragLogic } from '@/app/learning/focus/components/drag-drop';
import { useTestLearningState } from './components/hooks/useTestLearningState';
import { WordCard as WordCardComponent } from '@/app/learning/focus/components/word-cards';
import { DefinitionPanel as DefinitionPanelComponent } from '@/app/learning/focus/components/definition-panel';
import { UIControls, ExitConfirmModal } from '@/app/learning/focus/components/ui-controls';
import ErrorBoundary from '@/app/learning/focus/components/ErrorBoundary';
import { LoadingState } from '@/app/learning/focus/components/LoadingState';
import { WordDefinitionData } from '@/app/learning/focus/components/types';

/**
 * Test Learning 主页面组件
 * 基于专注学习模式，专门用于测试模式
 */
function TestLearningContent({
  wordlistId
}: {
  wordlistId: Promise<{ wordlistId: string }>;
}) {
  // 使用测试模式专用的状态管理 Hook
  const state = useTestLearningState(wordlistId);
  const router = useRouter();

  // 添加调试信息到控制台 - 必须在所有条件性返回之前调用
  useEffect(() => {
    console.log('🎯 测试模式页面状态:', {
      wordlistId: state.wordlistId,
      learningStatus: state.learningState.status,
      sessionType: state.learningState.sessionType,
      wordQueueLength: state.learningState.wordQueue.length,
      wordCardsCount: state.wordCards.length,
      isLoading: state.isLoading,
      hasError: !!state.error
    });
  }, [state.wordlistId, state.learningState, state.wordCards.length, state.isLoading, state.error]);

  // 使用物理逻辑 Hook
  const physicsLogic = usePhysicsLogic({
    wordCards: state.wordCards,
    setWordCards: state.setWordCards,
    getCardDimensions: state.getCardDimensions
  });

  // 使用音频播放 Hook
  const { isAudioPlaying, isAudioLoading, playAutoAudio, stopAutoAudio } = useAudioPlayer({
    autoPlayAudio: state.settings.uiSettings.autoPlayAudio,
    hasUserInteraction: state.hasUserInteraction
  });

  // 使用拖拽逻辑 Hook
  const {
    handleMouseDown,
    handlePanelMouseDown
  } = useDragLogic({
    wordCards: state.wordCards,
    setWordCards: state.setWordCards,
    definitionPanel: state.definitionPanel,
    setDefinitionPanel: state.setDefinitionPanelWithLogging,
    containerRef: state.containerRef,
    checkPositionInBounds: physicsLogic.checkPositionInBounds,
    checkCollisionWithOtherCards: physicsLogic.checkCollisionWithOtherCards,
    handleCollisions: physicsLogic.handleCollisions,
    calculateDragVelocity: physicsLogic.calculateDragVelocity,
    setCollisionDetected: state.setCollisionDetected,
    setIsDragging: state.setIsDragging
  });

  // 根据设置渲染释义内容
  const renderDefinitionContent = useCallback((
    definition: WordDefinitionData | null | undefined
  ) => {
    if (!definition) return null;
    const enabledTypes = state.getEnabledDefinitionTypes();

    return enabledTypes.map((type: { id: string }) => {
      switch (type.id) {
        case 'authoritative':
          return definition?.authoritativeDefinitions && definition.authoritativeDefinitions.length > 0 ? (
            <div key="authoritative" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${state.settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>权威英汉释义</div>
              {definition.authoritativeDefinitions.map((authDef, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--color-focus-blue)' }}>{authDef.partOfSpeech}</div>
                  {authDef.definitions.map((defItem, defIndex: number) => (
                    <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '500' }}>{defItem.number}.</span>
                      <span style={{ marginLeft: '4px' }}>{defItem.chineseMeaning}</span>
                      {defItem.englishMeaning && (
                        <span style={{ marginLeft: '4px', color: 'var(--color-rock-gray)' }}>({defItem.englishMeaning})</span>
                      )}
                      {defItem.examples && defItem.examples.length > 0 && (
                        <div style={{ marginTop: '4px', marginLeft: '16px' }}>
                          {defItem.examples.map((example, exIndex: number) => (
                            <div key={exIndex} style={{ fontStyle: 'italic', fontSize: `${state.settings.uiSettings.fontSize - 2}px`, color: 'var(--color-rock-gray)', marginBottom: '4px' }}>
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
                      <div style={{ fontWeight: '500', marginBottom: '4px', color: 'var(--color-focus-blue)' }}>习语:</div>
                      {authDef.idioms.map((idiom, idiomIndex: number) => (
                        <div key={idiomIndex} style={{ marginBottom: '6px' }}>
                          <span style={{ fontWeight: '500' }}>{idiom.number}. {idiom.title}</span> - {idiom.meaning}
                          {idiom.examples && idiom.examples.length > 0 && (
                            <div style={{ marginTop: '4px', marginLeft: '16px' }}>
                              {idiom.examples.map((example, exIndex: number) => (
                                <div key={exIndex} style={{ fontStyle: 'italic', fontSize: `${state.settings.uiSettings.fontSize - 2}px`, color: 'var(--color-rock-gray)', marginBottom: '4px' }}>
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
          ) : null;

        case 'bilingual':
          return definition?.bilingualDefinitions && definition.bilingualDefinitions.length > 0 ? (
            <div key="bilingual" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${state.settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>英汉释义</div>
              {definition.bilingualDefinitions.map((bilDef, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--color-focus-blue)' }}>{bilDef.partOfSpeech}</div>
                  {bilDef.definitions.map((defItem, defIndex: number) => (
                    <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{defItem.number}.</span> {defItem.meaning}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null;

        case 'english':
          return definition?.englishDefinitions && definition.englishDefinitions.length > 0 ? (
            <div key="english" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${state.settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>英英释义</div>
              {definition.englishDefinitions.map((engDef, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--color-focus-blue)' }}>{engDef.partOfSpeech}</div>
                  {engDef.definitions.map((defItem, defIndex: number) => (
                    <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{defItem.number}.</span> {defItem.meaning}
                      {defItem.linkedWords && defItem.linkedWords.length > 0 && (
                        <div style={{ marginTop: '2px', marginLeft: '16px', fontSize: `${state.settings.uiSettings.fontSize - 2}px`, color: 'var(--color-rock-gray)' }}>
                          相关词: {defItem.linkedWords.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null;

        case 'basic':
          return definition?.definitions?.basic && definition.definitions.basic.length > 0 ? (
            <div key="basic" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${state.settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>基本释义</div>
              {definition.definitions.basic.map((def, index: number) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--color-focus-blue)' }}>{def.partOfSpeech}</span> {def.meaning}
                </div>
              ))}
            </div>
          ) : null;

        case 'web':
          return definition?.definitions?.web && definition.definitions.web.length > 0 ? (
            <div key="web" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${state.settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>网络释义</div>
              {definition.definitions.web.map((def, index: number) => (
                <div key={index} style={{ marginBottom: '8px', marginLeft: '16px' }}>
                  {def.meaning}
                </div>
              ))}
            </div>
          ) : null;

        default:
          return null;
      }
    }).filter(Boolean);
  }, [state]);

  // 测试模式专用键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        console.log('⌨️ 测试模式：空格键被按下');

        // 如果有释义面板，关闭它（不进入下一个单词）
        if (state.definitionPanel) {
          console.log('📖 关闭释义面板');
          stopAutoAudio();
          state.setDefinitionPanelWithLogging(null);
        } else {
          console.log('📝 测试模式：没有释义面板需要关闭');
        }
      } else if (event.code === 'Escape') {
        event.preventDefault();
        console.log('🚪 ESC键被按下，触发退出确认');
        // ESC键触发退出确认
        state.handleExitLearning();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.definitionPanel, stopAutoAudio, state.setDefinitionPanelWithLogging, state.handleExitLearning]);

  // 处理单词卡片点击（传入音频相关函数）
  const handleWordCardClick = useCallback((cardId: string, event?: React.MouseEvent) => {
    state.handleWordCardClick(cardId, event, playAutoAudio, stopAutoAudio);
  }, [state, playAutoAudio, stopAutoAudio]);

  // 处理点击外部区域（传入音频相关函数）
  const handleOutsideClick = useCallback((event: MouseEvent) => {
    state.handleOutsideClick(event, stopAutoAudio);
  }, [state, stopAutoAudio]);

  // 添加点击外部事件监听
  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [handleOutsideClick]);

  // 清理音频资源
  useEffect(() => {
    return () => {
      stopAutoAudio();
    };
  }, [stopAutoAudio]);

  // 如果正在加载，显示加载状态
  if (state.isLoading) {
    return <LoadingState message="正在准备测试内容..." />;
  }

  // 如果有错误，显示错误状态
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-papyrus-white)' }}>
        <div className="text-center p-8 max-w-lg">
          <div className="mb-4">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-ink-black)' }}>
              测试模式启动失败
            </h1>
          </div>
          <p className="mb-6" style={{ color: 'var(--color-rock-gray)' }}>
            {state.error}
          </p>

          {/* 添加详细的调试信息 */}
          <div className="mb-6 text-left p-4 rounded-lg bg-gray-100" style={{ fontSize: '14px', color: 'var(--color-rock-gray)' }}>
            <h3 className="font-semibold mb-2">调试信息:</h3>
            <div className="space-y-1">
              <p><strong>词书ID:</strong> {state.wordlistId || '未设置'}</p>
              <p><strong>学习状态:</strong> {state.learningState.status}</p>
              <p><strong>会话类型:</strong> {state.learningState.sessionType || '未设置'}</p>
              <p><strong>单词队列长度:</strong> {state.learningState.wordQueue.length}</p>
              <p><strong>单词卡片数量:</strong> {state.wordCards.length}</p>
              <p><strong>加载状态:</strong> {state.isLoading ? '加载中' : '已完成'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.refresh()}
              className="w-full px-6 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-focus-blue)',
                color: 'white'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-focus-blue)';
              }}
            >
              刷新页面
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-2 rounded-lg font-medium transition-colors border"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-rock-gray)',
                borderColor: 'var(--color-rock-gray)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              返回仪表盘
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={state.containerRef}
      className="test-learning-container"
      style={{
        backgroundColor: 'var(--color-papyrus-white)',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 单词卡片 */}
      {state.wordCards.map(card => (
        <WordCardComponent
          key={card.id}
          card={card}
          isExpanded={state.definitionPanel?.wordId === card.id}
          settings={state.settings}
          onMouseDown={handleMouseDown}
          onClick={handleWordCardClick}
        />
      ))}

      {/* 释义面板 */}
      {state.definitionPanel && (
        <DefinitionPanelComponent
          definitionPanel={state.definitionPanel}
          settings={state.settings}
          isAudioLoading={isAudioLoading}
          isAudioPlaying={isAudioPlaying}
          onPanelMouseDown={handlePanelMouseDown}
          playAutoAudio={playAutoAudio}
          renderDefinitionContent={renderDefinitionContent}
        />
      )}

      {/* 角落控件 */}
      <UIControls
        learningStatus={state.learningState.status}
        onShuffleWordCards={state.shuffleWordCards}
        onFullscreen={state.handleFullscreen}
        onExitLearning={state.handleExitLearning}
        onOpenSettings={state.handleOpenSettings}
      />

      {/* 释义设置模态框 */}
      <DefinitionSettingsModal
        isOpen={state.isSettingsModalOpen}
        settings={state.settings}
        onClose={state.handleCloseSettings}
        onToggleDefinitionType={state.toggleDefinitionType}
        onReorderDefinitionTypes={state.reorderTypes}
        onUpdateUISettings={state.updateUI}
        onReset={state.reset}
      />

      {/* 退出测试确认对话框 - 测试模式特化 */}
      <ExitConfirmModal
        isOpen={state.isExitModalOpen}
        learningStatus={state.learningState.status}
        learningStats={state.getLearningStats()}
        onCancelExit={state.cancelExitLearning}
        onConfirmExit={state.confirmExitLearning}
      />

      {/* 添加动画样式 - 复用专注学习模式的样式 */}
      <style jsx>{`
        @keyframes modalFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes definitionPanelExpand {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
            visibility: hidden;
          }
          1% {
            visibility: visible;
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            visibility: visible;
          }
        }

        .definition-panel {
          /* 确保释义面板始终可见，不会被动画影响 */
          animation-fill-mode: forwards !important;
          /* 防止动画结束后元素消失 */
          visibility: visible !important;
          opacity: 1 !important;
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

        .word-card-colliding {
          animation: collisionBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .word-card-ripple {
          animation: rippleEffect 0.6s ease-out;
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

        @keyframes collisionBounce {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          30% {
            transform: translate(-50%, -50%) scale(0.85);
          }
          60% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes rippleEffect {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
          }
        }
      `}</style>
    </div>
  );
}

export default function TestLearningPage({
  params
}: {
  params: Promise<{ wordlistId: string }>;
}) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingState message="正在加载..." />}>
        <TestLearningContent wordlistId={params} />
      </Suspense>
    </ErrorBoundary>
  );
}