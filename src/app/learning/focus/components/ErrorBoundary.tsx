'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 错误边界组件
 * 捕获并处理组件树中的错误
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 你可以将错误日志上报给服务器
    console.error('Focus Learning Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 你可以自定义降级后的 UI 并渲染
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-papyrus-white)' }}>
          <div className="text-center p-8">
            <div className="mb-4">
              <div className="text-6xl mb-4">😞</div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-ink-black)' }}>
                出现了一些问题
              </h1>
            </div>
            <p className="mb-6" style={{ color: 'var(--color-rock-gray)' }}>
              抱歉，学习页面遇到了意外错误。请刷新页面重试。
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
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
                onClick={() => this.setState({ hasError: false })}
                className="ml-3 px-6 py-2 rounded-lg font-medium transition-colors border"
                style={{
                  borderColor: 'var(--color-focus-blue)',
                  color: 'var(--color-focus-blue)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-focus-blue)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-focus-blue)';
                }}
              >
                重试
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium mb-2" style={{ color: 'var(--color-rock-gray)' }}>
                  错误详情 (仅开发环境可见)
                </summary>
                <pre className="text-xs p-3 rounded bg-gray-100 overflow-auto" style={{ 
                  maxHeight: '200px',
                  color: 'var(--color-rock-gray)'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;