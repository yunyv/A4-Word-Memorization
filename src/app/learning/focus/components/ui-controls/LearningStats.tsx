'use client';

import React from 'react';

interface LearningStatsProps {
  totalWords: number;
  completedWords: number;
  remainingWords: number;
  mode: string;
  learningStatus: string;
}

const LearningStats = React.memo<LearningStatsProps>(({
  totalWords,
  completedWords,
  remainingWords,
  mode,
  learningStatus
}) => {
  return (
    <>
      {learningStatus === 'finished' ? (
        <>
          <div style={{ marginBottom: '16px' }}>
            🎉 恭喜您完成了本次学习！
          </div>
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--color-ink-black)'
          }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>学习统计</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>完成单词数：</span>
              <span style={{ fontWeight: '600', color: 'var(--color-focus-blue)' }}>
                {completedWords} 个
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>学习模式：</span>
              <span style={{ fontWeight: '600' }}>
                {mode}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            是否要返回仪表盘？
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: '12px' }}>
            确定要退出当前的学习会话吗？
          </div>
          <div style={{
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--color-ink-black)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>已完成：</span>
              <span style={{ fontWeight: '600', color: '#FF6B6B' }}>
                {completedWords} / {totalWords} 个单词
              </span>
            </div>
            {remainingWords > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>剩余：</span>
                <span style={{ fontWeight: '600' }}>
                  {remainingWords} 个
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>学习模式：</span>
              <span style={{ fontWeight: '600' }}>
                {mode}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--color-rock-gray)' }}>
            您的学习进度已自动保存，可以稍后继续。
          </div>
        </>
      )}
    </>
  );
});

LearningStats.displayName = 'LearningStats';

export default LearningStats;