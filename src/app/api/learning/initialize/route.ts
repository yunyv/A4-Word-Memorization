import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// 初始化用户学习进度的API端点
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
    const { wordlistId } = body;

    // 如果没有提供词书ID，获取用户的所有词书
    let wordlists;
    if (wordlistId) {
      // 验证用户是否有权限访问该词书
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

      wordlists = [wordlist];
    } else {
      // 获取用户的所有词书
      wordlists = await db.wordlist.findMany({
        where: { userId: user.id }
      });
    }

    if (wordlists.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No wordlists found for this user' 
        },
        { status: 404 }
      );
    }

    let totalInitialized = 0;

    // 为每个词书初始化学习进度
    for (const wordlist of wordlists) {
      // 获取词书中的所有单词
      const wordlistEntries = await db.wordlistEntry.findMany({
        where: { wordlistId: wordlist.id },
        include: {
          word: {
            select: { id: true }
          }
        }
      });

      if (wordlistEntries.length === 0) {
        continue; // 跳过空词书
      }

      // 获取用户在该词书中已有学习进度的单词
      const existingProgress = await db.userWordProgress.findMany({
        where: {
          userId: user.id,
          wordId: {
            in: wordlistEntries.map(entry => entry.word.id)
          }
        },
        select: { wordId: true }
      });

      const existingWordIds = new Set(existingProgress.map(progress => progress.wordId));

      // 筛选出需要初始化的单词
      const wordsToInitialize = wordlistEntries.filter(
        entry => !existingWordIds.has(entry.word.id)
      );

      if (wordsToInitialize.length === 0) {
        continue; // 所有单词都已初始化
      }

      // 批量创建学习进度记录
      const progressData = wordsToInitialize.map(entry => ({
        userId: user.id,
        wordId: entry.word.id,
        reviewStage: 0, // 初始复习阶段为0
        nextReviewDate: new Date(), // 立即可学习
        lastReviewedAt: null
      }));

      // 使用事务批量插入
      await db.$transaction(async (tx) => {
        await tx.userWordProgress.createMany({
          data: progressData,
          skipDuplicates: true
        });
      });

      totalInitialized += progressData.length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully initialized learning progress for ${totalInitialized} words`,
      initializedCount: totalInitialized
    });

  } catch (error) {
    console.error('Error initializing learning progress:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize learning progress' 
      },
      { status: 500 }
    );
  }
}

// 获取用户学习进度初始化状态
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

    // 构建查询条件
    const whereCondition: {
      userId: number;
      wordId?: { in: number[] };
    } = {
      userId: user.id
    };

    // 如果指定了词书ID，添加到查询条件
    if (wordlistId) {
      // 验证用户是否有权限访问该词书
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

      // 获取词书中的所有单词ID
      const wordlistEntries = await db.wordlistEntry.findMany({
        where: { wordlistId: parseInt(wordlistId) },
        select: { wordId: true }
      });

      const wordIds = wordlistEntries.map((entry: { wordId: number }) => entry.wordId);
      whereCondition.wordId = { in: wordIds };
    }

    // 获取用户的学习进度统计
    const [
      totalWords,
      initializedWords,
      newWords
    ] = await Promise.all([
      // 总单词数（词书中的单词）
      db.wordlistEntry.count({
        where: wordlistId ? { wordlistId: parseInt(wordlistId) } : {
          wordlist: {
            userId: user.id
          }
        }
      }),
      
      // 已初始化的单词数
      db.userWordProgress.count({
        where: whereCondition
      }),
      
      // 新单词数（复习阶段为0）
      db.userWordProgress.count({
        where: {
          ...whereCondition,
          reviewStage: 0
        }
      })
    ]);

    // 计算初始化状态
    const isFullyInitialized = totalWords > 0 && totalWords === initializedWords;
    const initializationRate = totalWords > 0 ? Math.round((initializedWords / totalWords) * 100) : 0;

    return NextResponse.json({
      success: true,
      status: {
        totalWords,
        initializedWords,
        newWords,
        isFullyInitialized,
        initializationRate
      }
    });

  } catch (error) {
    console.error('Error checking initialization status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check initialization status' 
      },
      { status: 500 }
    );
  }
}