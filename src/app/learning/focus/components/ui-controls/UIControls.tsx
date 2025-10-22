'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Shuffle, LogOut } from 'lucide-react';
import { DefinitionSettingsButton } from '@/components/learning/DefinitionSettingsButton';

interface UIControlsProps {
  learningStatus: string;
  onShuffleWordCards: () => void;
  onFullscreen: () => void;
  onExitLearning: () => void;
  onOpenSettings: () => void;
}

const UIControls = React.memo<UIControlsProps>(({
  learningStatus,
  onShuffleWordCards,
  onFullscreen,
  onExitLearning,
  onOpenSettings
}) => {
  return (
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
        onClick={() => {
          console.log('🔀 打乱单词位置按钮被点击');
          onShuffleWordCards();
        }}
        title="打乱单词位置"
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
        <Shuffle className="h-5 w-5" />
      </Button>

      <DefinitionSettingsButton onClick={() => {
        console.log('⚙️ 释义设置按钮被点击');
        onOpenSettings();
      }} />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          console.log('🖥️ 全屏按钮被点击');
          onFullscreen();
        }}
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

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          console.log('🚪 退出学习按钮被点击，学习状态:', learningStatus);
          onExitLearning();
        }}
        title="退出学习 (ESC)"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: learningStatus === 'finished'
            ? '#FF6B6B'
            : 'rgba(255, 107, 107, 0.1)',
          border: learningStatus === 'finished'
            ? '2px solid #FF6B6B'
            : '1px solid rgba(255, 107, 107, 0.3)',
          color: learningStatus === 'finished'
            ? 'white'
            : '#FF6B6B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: learningStatus === 'finished'
            ? 'pulse 2s infinite'
            : 'none',
          boxShadow: learningStatus === 'finished'
            ? '0 4px 15px rgba(255, 107, 107, 0.4)'
            : 'none'
        }}
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
});

UIControls.displayName = 'UIControls';

export default UIControls;