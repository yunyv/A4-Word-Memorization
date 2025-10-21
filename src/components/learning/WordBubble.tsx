'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { WordDefinitionData } from '@/types/learning';

interface WordBubbleProps {
  word: {
    id: number;
    text: string;
    definition?: WordDefinitionData;
    pronunciationData?: WordDefinitionData['pronunciationData'];
    isAnimating?: boolean;
  };
  isCentral: boolean;
  position?: { x: number; y: number };
  onClick: (wordId: number) => void;
  onAnimationComplete?: () => void;
}

export function WordBubble({ 
  word, 
  isCentral, 
  position, 
  onClick, 
  onAnimationComplete 
}: WordBubbleProps) {
  const [showDefinition, setShowDefinition] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // 处理点击事件
  const handleClick = () => {
    if (isAnimating) return;
    
    onClick(word.id);
    
    if (!isCentral) {
      // 如果是分散的单词，显示/隐藏释义
      setShowDefinition(!showDefinition);
    }
  };

  // 处理动画完成
  const handleTransitionEnd = () => {
    if (isAnimating && onAnimationComplete) {
      setIsAnimating(false);
      onAnimationComplete();
    }
  };

  // 开始动画
  const startAnimation = () => {
    setIsAnimating(true);
  };

  // 格式化音标
  const formatPhonetic = (phonetic: string) => {
    return phonetic
      .replace(/\//g, '') // 移除斜杠
      .replace(/,/g, ', '); // 在逗号后添加空格
  };

  // 获取随机位置
  const getRandomPosition = () => {
    if (position) return position;
    
    const margin = 100; // 距离边缘的最小距离
    const x = margin + Math.random() * (window.innerWidth - 2 * margin);
    const y = margin + Math.random() * (window.innerHeight - 2 * margin);
    return { x, y };
  };

  const wordPosition = isCentral ? { x: '50%', y: '50%' } : getRandomPosition();

  return (
    <div
      ref={bubbleRef}
      className={`
        ${isCentral ? 'central-word' : 'scattered-word'}
        ${isAnimating ? 'word-scatter-animation' : ''}
        ${word.isAnimating ? 'word-scatter-animation' : ''}
      `}
      style={{
        left: typeof wordPosition.x === 'string' ? wordPosition.x : `${wordPosition.x}px`,
        top: typeof wordPosition.y === 'string' ? wordPosition.y : `${wordPosition.y}px`,
        transform: isCentral
          ? 'translate(-50%, -50%)'
          : 'translate(-50%, -50%)',
      }}
      onClick={handleClick}
      onTransitionEnd={handleTransitionEnd}
    >
      {word.text}
      
      {/* 释义面板 */}
      {showDefinition && !isCentral && word.definition && (
        <Card 
          className="definition-panel visible"
          style={{
            left: typeof wordPosition.x === 'string' ? '50%' : `${wordPosition.x}px`,
            top: typeof wordPosition.y === 'string' ? 'calc(50% + 80px)' : `${wordPosition.y + 40}px`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <div className="p-4">
            {/* 音标 */}
            {word.pronunciationData && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600">
                  [{formatPhonetic(word.pronunciationData.american?.phonetic || word.pronunciationData.british?.phonetic || '')}]
                </span>
              </div>
            )}
            
            <div className="border-t pt-3">
              {/* 基本释义 */}
              {word.definition.definitions && word.definition.definitions.basic && word.definition.definitions.basic.length > 0 && (
                <div className="mb-3">
                  {word.definition.definitions.basic.map((def, index: number) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{def.partOfSpeech}</span> {def.meaning}
                    </div>
                  ))}
                </div>
              )}
              
              {/* 英文释义 */}
              {word.definition.englishDefinitions && word.definition.englishDefinitions.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-600 mb-1">English Definition:</div>
                  {word.definition.englishDefinitions?.map((engDef, index: number) => (
                    <div key={index} className="text-xs text-gray-700 mb-1">
                      <span className="font-medium">{engDef.partOfSpeech}</span>
                      {engDef.definitions?.map((defItem, defIndex: number) => (
                        <div key={defIndex} className="ml-2">
                          {defIndex + 1}. {defItem.meaning}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}