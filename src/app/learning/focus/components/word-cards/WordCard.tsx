'use client';

import React from 'react';
import { WordCard as WordCardType } from '../types';

interface WordCardProps {
  card: WordCardType;
  isExpanded: boolean;
  settings: {
    uiSettings: {
      cardSize: number;
    }
  };
  onMouseDown: (e: React.MouseEvent, cardId: string) => void;
  onClick: (cardId: string, event?: React.MouseEvent) => void;
}

const WordCard = React.memo<WordCardProps>(({
  card,
  isExpanded,
  settings,
  onMouseDown,
  onClick
}) => {
  return (
    <div
      key={card.id}
      className={`word-card ${card.isAnimating ? 'word-card-appearing' : ''} ${isExpanded ? 'word-card-expanded' : ''} ${card.isDragging ? 'word-card-dragging' : ''} ${card.isColliding ? 'word-card-colliding' : ''}`}
      style={{
        position: 'absolute',
        left: `${card.position.x}%`,
        top: `${card.position.y}%`,
        width: `${settings.uiSettings.cardSize}px`,
        height: '48px',
        backgroundColor: 'var(--color-pure-white)',
        border: card.isDragging ? '2px solid var(--color-focus-blue)' :
               (card.isColliding ? '2px solid #FF6B6B' :
               (isExpanded ? '2px solid var(--color-focus-blue)' : '1px solid #E2E8F0')),
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: card.isDragging ? 'move' : 'pointer',
        fontSize: `${Math.round(settings.uiSettings.cardSize * 0.16)}px`,
        fontWeight: '600',
        color: 'var(--color-ink-black)',
        fontFamily: "'Inter', 'Source Han Sans CN', sans-serif",
        boxShadow: card.isDragging ? '0 12px 24px rgba(0, 0, 0, 0.2)' :
                  (card.isColliding ? '0 6px 12px rgba(255, 107, 107, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.05)'),
        transition: card.isDragging || card.isColliding ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: card.isDragging ? 25 : (card.isColliding ? 20 : (isExpanded ? 15 : 10)),
        opacity: card.isAnimating ? 0 : (card.isDragging ? 0.8 : 1),
        transform: `translate(-50%, -50%) ${card.isAnimating ? 'scale(0.8)' : 'scale(1)'} ${card.isDragging ? 'scale(1.05)' : ''} ${card.collisionScale ? `scale(${card.collisionScale})` : ''}`,
        userSelect: 'none',
        willChange: card.isDragging || card.isColliding ? 'transform, box-shadow' : 'auto'
      }}
      onMouseDown={(e) => onMouseDown(e, card.id)}
      onClick={(e) => {
        e.stopPropagation();
        console.log('🃏 单词卡片被点击:', card.id, card.text, 'isDragging:', card.isDragging);
        onClick(card.id, e);
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
  );
});

WordCard.displayName = 'WordCard';

export default WordCard;