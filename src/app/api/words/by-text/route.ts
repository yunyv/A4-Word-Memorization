import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// 通过单词文本获取单词ID
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

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text');

    // 验证输入
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Word text is required' 
        },
        { status: 400 }
      );
    }

    // 查找单词
    const word = await db.word.findUnique({
      where: { 
        wordText: text.trim().toLowerCase() 
      },
      select: {
        id: true
      }
    });

    if (!word) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Word not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wordId: word.id
    });

  } catch (error) {
    console.error('Error fetching word by text:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch word' 
      },
      { status: 500 }
    );
  }
}