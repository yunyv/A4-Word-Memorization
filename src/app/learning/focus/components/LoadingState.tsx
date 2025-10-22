'use client';

import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * 加载状态组件
 * 显示统一的加载界面
 */
export function LoadingState({ 
  message = '正在加载...', 
  size = 'medium' 
}: LoadingStateProps) {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-papyrus-white)' }}>
      <div className="text-center">
        <div 
          className={`animate-spin rounded-full border-b-2 mx-auto ${sizeClasses[size]}`}
          style={{ borderColor: 'var(--color-focus-blue)' }}
        ></div>
        <p 
          className={`mt-4 ${textSizeClasses[size]}`}
          style={{ color: 'var(--color-rock-gray)' }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

export default LoadingState;