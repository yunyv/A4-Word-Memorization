'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  // 从localStorage恢复认证状态
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      validateToken(token);
    } else {
      setUserState(prev => ({ ...prev, status: 'idle' }));
    }
  }, []);

  // 验证令牌
  const validateToken = async (token: string) => {
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
        localStorage.setItem('auth-token', token);
        setUserState({
          token,
          isAuthenticated: true,
          status: 'authenticated',
          user: data.user
        });
        return true;
      } else {
        // 验证失败
        localStorage.removeItem('auth-token');
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
      localStorage.removeItem('auth-token');
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
  };

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
    localStorage.removeItem('auth-token');
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
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth-token');
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  return {
    'Content-Type': 'application/json'
  };
}

// 带认证的fetch请求辅助函数
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = getAuthHeaders();
  
  const defaultOptions: RequestInit = {
    headers: {
      ...authHeaders,
      ...options.headers
    },
    ...options
  };

  const response = await fetch(url, defaultOptions);
  
  // 如果返回401，说明认证失效，清除本地存储
  if (response.status === 401) {
    localStorage.removeItem('auth-token');
    window.location.href = '/token';
  }
  
  return response;
}
