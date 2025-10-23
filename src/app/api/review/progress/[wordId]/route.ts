import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { clearWordlistRelatedCaches } from '@/lib/cacheUtils';
import { ReviewProgressRequest, ReviewProgressResponse, EBBINGHAUS_INTERVAL_MAP } from '@/types/learning';

// 更新单词复习进度
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
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
    const { wordId } = await params;
    const wordIdNum = parseInt(wordId);

    // 验证单词ID
    if (isNaN(wordIdNum)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid word ID' 
        } as ReviewProgressResponse,
        { status: 400 }
      );
    }

    // 解析请求体
    const body: ReviewProgressRequest = await request.json();
    const { isCorrect = true } = body;

    // 查找当前学习进度
    let userWordProgress = await db.userWordProgress.findUnique({
      where: {
        userId_wordId: {
          userId: user.id,
          wordId: wordIdNum
        }
      }
    });

    // 如果不存在学习进度记录，创建新记录
    if (!userWordProgress) {
      userWordProgress = await db.userWordProgress.create({
        data: {
          userId: user.id,
          wordId: wordIdNum,
          reviewStage: 0,
          nextReviewDate: new Date() // 新单词今天就可以复习
        }
      });
    }

    // 计算新的复习阶段和下次复习日期
    let newReviewStage: number;
    let nextReviewDate: Date;

    if (isCorrect) {
      // 回答正确，进入下一复习阶段
      newReviewStage = Math.min(userWordProgress.reviewStage + 1, 8); // 最高到第8阶段
      
      // 根据艾宾浩斯间隔计算下次复习日期
      const intervalDays = EBBINGHAUS_INTERVAL_MAP[newReviewStage as keyof typeof EBBINGHAUS_INTERVAL_MAP] || 120;
      nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
    } else {
      // 回答错误，重置到第0阶段
      newReviewStage = 0;
      nextReviewDate = new Date(); // 今天就可以重新复习
    }

    // 更新学习进度
    await db.userWordProgress.update({
      where: {
        userId_wordId: {
          userId: user.id,
          wordId: wordIdNum
        }
      },
      data: {
        reviewStage: newReviewStage,
        nextReviewDate: nextReviewDate,
        lastReviewedAt: new Date()
      }
    });

    // 清理相关缓存
    try {
      // 获取包含该单词的所有词书
      const wordlists = await db.wordlist.findMany({
        where: {
          wordlistEntries: {
            some: { wordId: wordIdNum }
          }
        }
      });

      // 清理每个相关词书的缓存
      for (const wordlist of wordlists) {
        await clearWordlistRelatedCaches(wordlist.id);
      }

      // 同时清理用户级别的缓存
      await clearWordlistRelatedCaches(0); // 使用0表示用户级别缓存
    } catch (cacheError) {
      console.error('清理缓存失败:', cacheError);
      // 缓存清理失败不影响主要功能，只记录错误
    }

    return NextResponse.json({
      success: true,
      word_id: wordIdNum,
      new_review_stage: newReviewStage,
      next_review_date: nextReviewDate.toISOString().split('T')[0] // 只返回日期部分
    } as ReviewProgressResponse);

  } catch (error) {
    console.error('Error updating review progress:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update review progress' 
      } as ReviewProgressResponse,
      { status: 500 }
    );
  }
}

// 获取单词学习进度
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
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
    const { wordId } = await params;
    const wordIdNum = parseInt(wordId);

    // 验证单词ID
    if (isNaN(wordIdNum)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid word ID' 
        },
        { status: 400 }
      );
    }

    // 查找学习进度
    const userWordProgress = await db.userWordProgress.findUnique({
      where: {
        userId_wordId: {
          userId: user.id,
          wordId: wordIdNum
        }
      },
      include: {
        word: {
          select: {
            wordText: true
          }
        }
      }
    });

    if (!userWordProgress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Word progress not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: {
        wordId: userWordProgress.wordId,
        wordText: userWordProgress.word.wordText,
        reviewStage: userWordProgress.reviewStage,
        nextReviewDate: userWordProgress.nextReviewDate.toISOString().split('T')[0],
        lastReviewedAt: userWordProgress.lastReviewedAt?.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error fetching word progress:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch word progress' 
      },
      { status: 500 }
    );
  }
}