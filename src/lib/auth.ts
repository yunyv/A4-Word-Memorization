import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';
import { TokenValidationResponse, AuthError } from '@/types/auth';

// 从请求中提取用户令牌
export function extractTokenFromRequest(request: NextRequest): string | null {
  // 1. 从Authorization header中提取
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. 从cookie中提取（可选）
  const tokenCookie = request.cookies.get('auth-token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

// 验证用户令牌并返回用户信息
export async function validateUserToken(token: string): Promise<TokenValidationResponse | AuthError> {
  try {
    if (!token || token.trim() === '') {
      return {
        success: false,
        error: 'Token field is required.'
      };
    }

    // 查询数据库中是否存在该令牌
    const user = await db.user.findUnique({
      where: { token: token.trim() }
    });

    if (!user) {
      // 如果不存在，创建新用户
      const newUser = await db.user.create({
        data: {
          token: token.trim()
        }
      });

      return {
        success: true,
        message: 'Token created successfully.',
        is_new: true,
        user: {
          id: newUser.id,
          token: newUser.token,
          createdAt: newUser.createdAt
        }
      };
    }

    // 如果存在，返回现有用户信息
    return {
      success: true,
      message: 'Token is valid.',
      is_new: false,
      user: {
        id: user.id,
        token: user.token,
        createdAt: user.createdAt
      }
    };

  } catch (error) {
    console.error('Token validation error:', error);
    return {
      success: false,
      error: 'Internal server error during token validation.'
    };
  }
}

// API路由中间件：验证用户身份
export async function requireAuth(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authorization token is required.' },
      { status: 401 }
    );
  }
  
  const validation = await validateUserToken(token);
  
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: (validation as AuthError).error },
      { status: 401 }
    );
  }
  
  return validation.user;
}

// 检查用户是否存在
export async function getUserByToken(token: string) {
  try {
    const user = await db.user.findUnique({
      where: { token }
    });
    return user;
  } catch (error) {
    console.error('Error fetching user by token:', error);
    return null;
  }
}

// 创建新用户
export async function createUser(token: string) {
  try {
    const user = await db.user.create({
      data: { token }
    });
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

// 生成随机令牌（可选功能）
export function generateRandomToken(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}