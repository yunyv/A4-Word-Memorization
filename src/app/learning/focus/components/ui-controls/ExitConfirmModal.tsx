'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import LearningStats from './LearningStats';

interface ExitConfirmModalProps {
  isOpen: boolean;
  learningStatus: string;
  learningStats: {
    totalWords: number;
    completedWords: number;
    remainingWords: number;
    mode: string;
  };
  onCancelExit: () => void;
  onConfirmExit: () => void;
}

const ExitConfirmModal = React.memo<ExitConfirmModalProps>(({
  isOpen,
  learningStatus,
  learningStats,
  onCancelExit,
  onConfirmExit
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onClick={onCancelExit}
    >
      <div
        style={{
          backgroundColor: 'var(--color-pure-white)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          fontFamily: "'Inter', 'Source Han Sans CN', sans-serif",
          animation: 'modalFadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px'
          }}>
            <LogOut style={{ width: '24px', height: '24px', color: '#FF6B6B' }} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--color-ink-black)'
            }}>
              确认退出学习
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: 'var(--color-rock-gray)'
            }}>
              学习进度将会自动保存
            </p>
          </div>
        </div>

        <div style={{
          fontSize: '16px',
          color: 'var(--color-ink-black)',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          <LearningStats
            totalWords={learningStats.totalWords}
            completedWords={learningStats.completedWords}
            remainingWords={learningStats.remainingWords}
            mode={learningStats.mode}
            learningStatus={learningStatus}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <Button
            variant="ghost"
            onClick={() => {
              console.log('❌ 取消退出学习');
              onCancelExit();
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--color-rock-gray)',
              backgroundColor: 'transparent',
              border: '1px solid #E2E8F0'
            }}
          >
            取消
          </Button>
          <Button
            onClick={() => {
              console.log('✅ 确认退出学习，学习状态:', learningStatus);
              onConfirmExit();
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#FF6B6B',
              color: 'white',
              border: 'none'
            }}
          >
            {learningStatus === 'finished' ? '返回仪表盘' : '确认退出'}
          </Button>
        </div>
      </div>
    </div>
  );
});

ExitConfirmModal.displayName = 'ExitConfirmModal';

export default ExitConfirmModal;