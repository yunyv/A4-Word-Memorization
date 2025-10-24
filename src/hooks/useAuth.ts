'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { UserState, TokenValidationResponse, AuthError } from '@/types/auth';

interface AuthContextType {
  userState: UserState;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [userState, setUserState] = useState<UserState>({
    token: null,
    isAuthenticated: false,
    status: 'idle'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 验证令牌
  const validateToken = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    setUserState(prev => ({ ...prev, status: 'loading' }));

    try {
      const response = await fetch('/api/token/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data: TokenValidationResponse | AuthError = await response.json();

      if (data.success && 'user' in data) {
        // 成功验证
        if (isMounted) {
          localStorage.setItem('auth-token', token);
        }
        setUserState({
          token,
          isAuthenticated: true,
          status: 'authenticated',
          user: data.user
        });
        return true;
      } else {
        // 验证失败
        if (isMounted) {
          localStorage.removeItem('auth-token');
        }
        setUserState({
          token: null,
          isAuthenticated: false,
          status: 'error'
        });
        setError((data as AuthError).error || 'Authentication failed');
        return false;
      }
    } catch (err) {
      console.error('Token validation error:', err);
      if (isMounted) {
        localStorage.removeItem('auth-token');
      }
      setUserState({
        token: null,
        isAuthenticated: false,
        status: 'error'
      });
      setError('Network error during authentication');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isMounted, setUserState, setIsLoading, setError]);

  // 确保组件只在客户端挂载后才执行
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 从localStorage恢复认证状态
  useEffect(() => {
    if (!isMounted) return;

    const token = localStorage.getItem('auth-token');
    if (token) {
      validateToken(token);
    } else {
      setUserState(prev => ({ ...prev, status: 'idle' }));
    }
  }, [isMounted, validateToken]);

  // 登录函数
  const login = async (token: string): Promise<boolean> => {
    if (!token || token.trim() === '') {
      setError('Token is required');
      return false;
    }

    return await validateToken(token.trim());
  };

  // 登出函数
  const logout = () => {
    if (isMounted) {
      localStorage.removeItem('auth-token');
    }
    setUserState({
      token: null,
      isAuthenticated: false,
      status: 'idle'
    });
    setError(null);
  };

  const value: AuthContextType = {
    userState,
    login,
    logout,
    isLoading,
    error
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
}

// 使用认证状态的Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 获取认证头的辅助函数
export function getAuthHeaders(options: RequestInit = {}): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // 如果body是FormData，不要设置Content-Type，让浏览器自动设置
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // 只在客户端环境中添加认证头
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('auth-token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('无法访问 localStorage:', error);
    }
  }
  
  return headers;
}

// 带认证的fetch请求辅助函数
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = getAuthHeaders(options);

  const defaultOptions: RequestInit = {
    headers: {
      ...authHeaders,
      ...options.headers
    },
    ...options
  };

  const response = await fetch(url, defaultOptions);

  // 如果返回401，说明认证失效，清除本地存储
  if (response.status === 401 && typeof window !== 'undefined') {
    try {
      localStorage.removeItem('auth-token');
      // 使用客户端导航而不是强制刷新
      window.location.replace('/token');
    } catch (error) {
      console.warn('无法访问 localStorage 或重定向:', error);
    }
  }

  return response;
}
