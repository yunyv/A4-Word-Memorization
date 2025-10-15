import { NextRequest, NextResponse } from 'next/server';
import { validateUserToken } from '@/lib/auth';
import { TokenValidationRequest, TokenValidationResponse, AuthError } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: TokenValidationRequest = await request.json();
    const { token } = body;

    // 验证请求体
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token field is required and must be a non-empty string.' 
        } as AuthError,
        { status: 400 }
      );
    }

    // 验证令牌
    const result = await validateUserToken(token.trim());

    if (!result.success) {
      return NextResponse.json(result as AuthError, { status: 400 });
    }

    // 返回成功响应
    return NextResponse.json(result as TokenValidationResponse);

  } catch (error) {
    console.error('Token validation API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error.' 
      } as AuthError,
      { status: 500 }
    );
  }
}

// 支持GET请求用于查询令牌状态（可选）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token || token.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token query parameter is required.' 
        } as AuthError,
        { status: 400 }
      );
    }

    const result = await validateUserToken(token.trim());

    if (!result.success) {
      return NextResponse.json(result as AuthError, { status: 400 });
    }

    return NextResponse.json(result as TokenValidationResponse);

  } catch (error) {
    console.error('Token validation API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error.' 
      } as AuthError,
      { status: 500 }
    );
  }
}