import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DueWordsResponse } from '@/types/learning';

// 获取用户待复习的单词
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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    // 构建查询条件
    const whereCondition: any = {
      userId: user.id,
      nextReviewDate: {
        lte: new Date() // 小于或等于今天的日期
      }
    };
    
    // 检查是否是新学习模式（通过查询参数判断）
    const isNewMode = searchParams.get('newMode') === 'true';
    
    // 如果是新学习模式，优先获取复习阶段为0的单词
    if (isNewMode) {
      // 首先尝试获取复习阶段为0的单词，不限制nextReviewDate
      const newWordsCondition: any = {
        userId: user.id,
        reviewStage: 0
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

        const wordIds = wordlistEntries.map((entry: any) => entry.wordId);
        newWordsCondition.wordId = { in: wordIds };
      }
      
      // 查询复习阶段为0的单词
      const newWords = await db.userWordProgress.findMany({
        where: newWordsCondition,
        include: {
          word: {
            select: {
              wordText: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc' // 按创建时间升序排列，先创建的先学习
        },
        take: limit
      });
      
      // 如果有新单词，直接返回
      if (newWords.length > 0) {
        const words = newWords.map((progress: any) => progress.word.wordText);
        return NextResponse.json({
          success: true,
          words,
          count: words.length
        } as DueWordsResponse);
      }
      
      // 如果没有新单词，继续执行原有逻辑获取其他待复习单词
    }

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

      const wordIds = wordlistEntries.map((entry: any) => entry.wordId);
      whereCondition.wordId = { in: wordIds };
    }

    // 查询待复习的单词
    const dueWords = await db.userWordProgress.findMany({
      where: whereCondition,
      include: {
        word: {
          select: {
            wordText: true
          }
        }
      },
      orderBy: {
        nextReviewDate: 'asc' // 按复习日期升序排列，最优先的排在前面
      },
      take: limit
    });

    // 提取单词文本
    const words = dueWords.map((progress: any) => progress.word.wordText);

    return NextResponse.json({
      success: true,
      words,
      count: words.length
    } as DueWordsResponse);

  } catch (error) {
    console.error('Error fetching due words:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch due words' 
      } as DueWordsResponse,
      { status: 500 }
    );
  }
}

// 获取用户学习进度统计
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

    // 构建查询条件
    const whereCondition: any = {
      userId: user.id
    };

    // 如果指定了词书ID，添加到查询条件
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

      // 获取词书中的所有单词ID
      const wordlistEntries = await db.wordlistEntry.findMany({
        where: { wordlistId },
        select: { wordId: true }
      });

      const wordIds = wordlistEntries.map((entry: any) => entry.wordId);
      whereCondition.wordId = { in: wordIds };
    }

    // 获取学习进度统计
    const [
      totalWords,
      dueWords,
      learnedWords
    ] = await Promise.all([
      // 总单词数
      db.userWordProgress.count({
        where: whereCondition
      }),
      
      // 待复习单词数
      db.userWordProgress.count({
        where: {
          ...whereCondition,
          nextReviewDate: {
            lte: new Date()
          }
        }
      }),
      
      // 已学习单词数（复习阶段大于0）
      db.userWordProgress.count({
        where: {
          ...whereCondition,
          reviewStage: {
            gt: 0
          }
        }
      })
    ]);

    // 按复习阶段分组统计
    const progressByStage = await db.userWordProgress.groupBy({
      by: ['reviewStage'],
      where: whereCondition,
      _count: {
        reviewStage: true
      }
    });

    // 格式化按阶段统计的数据
    const stageStats = progressByStage.reduce((acc: any, item: any) => {
      acc[item.reviewStage] = item._count.reviewStage;
      return acc;
    }, {});

    // 计算学习完成率
    const completionRate = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalWords,
        dueWords,
        learnedWords,
        completionRate,
        stageStats
      }
    });

  } catch (error) {
    console.error('Error fetching learning progress stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch learning progress stats' 
      },
      { status: 500 }
    );
  }
}