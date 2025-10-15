import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { preloadWordlistCache, getWordlistCacheStatus, cleanupExpiredCache } from '@/lib/cacheUtils';

// 预加载词书缓存
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // 确保authResult不是NextResponse
    if (!authResult || typeof authResult !== 'object' || !('id' in authResult)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid user authentication' 
        },
        { status: 401 }
      );
    }

    const user = authResult as { id: number; token: string; createdAt: Date };

    // 解析请求体
    const body = await request.json();
    const { wordlistId, batchSize } = body;

    // 验证输入
    if (!wordlistId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wordlist ID is required' 
        },
        { status: 400 }
      );
    }

    // 验证用户是否有权限访问该词书
    const { db } = await import('@/lib/db');
    const wordlist = await db.wordlist.findUnique({
      where: { 
        id: wordlistId,
        userId: user.id 
      }
    });

    if (!wordlist) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wordlist not found or you do not have permission to access it' 
        },
        { status: 404 }
      );
    }

    // 开始预加载缓存
    const result = await preloadWordlistCache(wordlistId, batchSize || 10);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error preloading wordlist cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to preload wordlist cache' 
      },
      { status: 500 }
    );
  }
}

// 获取词书缓存状态
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // 确保authResult不是NextResponse
    if (!authResult || typeof authResult !== 'object' || !('id' in authResult)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid user authentication' 
        },
        { status: 401 }
      );
    }

    const user = authResult as { id: number; token: string; createdAt: Date };

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const wordlistId = searchParams.get('wordlistId');

    // 验证输入
    if (!wordlistId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wordlist ID is required' 
        },
        { status: 400 }
      );
    }

    // 验证用户是否有权限访问该词书
    const { db } = await import('@/lib/db');
    const wordlist = await db.wordlist.findUnique({
      where: { 
        id: parseInt(wordlistId),
        userId: user.id 
      }
    });

    if (!wordlist) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wordlist not found or you do not have permission to access it' 
        },
        { status: 404 }
      );
    }

    // 获取缓存状态
    const result = await getWordlistCacheStatus(parseInt(wordlistId));

    return NextResponse.json({
      success: true,
      wordlistId: parseInt(wordlistId),
      ...result
    });

  } catch (error) {
    console.error('Error getting wordlist cache status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get wordlist cache status' 
      },
      { status: 500 }
    );
  }
}

// 清理过期缓存（管理员功能）
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const daysOld = searchParams.get('daysOld') ? parseInt(searchParams.get('daysOld')!) : 30;

    // 清理过期缓存
    const result = await cleanupExpiredCache(daysOld);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clean up expired cache' 
      },
      { status: 500 }
    );
  }
}