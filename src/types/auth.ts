// 用户认证相关类型定义

export interface UserState {
  token: string | null; // e.g., "yunyv-gre-mastery-2025"
  isAuthenticated: boolean; // 根据 token 是否有效设置
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  user?: {
    id: number;
    token: string;
    createdAt: Date;
  };
}

export interface TokenValidationRequest {
  token: string;
}

export interface TokenValidationResponse {
  success: boolean;
  message?: string;
  is_new: boolean;
  user?: {
    id: number;
    token: string;
    createdAt: Date;
  };
}

export interface AuthError {
  success: false;
  error: string;
  message?: string;
}