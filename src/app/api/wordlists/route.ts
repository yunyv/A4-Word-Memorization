import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { UploadWordlistResponse, WordlistWithCount } from '@/types/wordlist';

// 初始化用户学习进度的辅助函数
async function initializeUserProgress(wordlistId: number, userId: number) {
  // 获取词书中的所有单词
  const wordlistEntries = await db.wordlistEntry.findMany({
    where: { wordlistId },
    include: {
      word: {
        select: { id: true }
      }
    }
  });

  if (wordlistEntries.length === 0) {
    return; // 跳过空词书
  }

  // 获取用户在该词书中已有学习进度的单词
  const existingProgress = await db.userWordProgress.findMany({
    where: {
      userId,
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
    return; // 所有单词都已初始化
  }

  // 批量创建学习进度记录
  const progressData = wordsToInitialize.map(entry => ({
    userId,
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

  console.log(`初始化了 ${progressData.length} 个单词的学习进度`);
}

// 获取用户的所有词书
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

    // 查询用户的所有词书，并包含单词数量
    const wordlists = await db.wordlist.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { wordlistEntries: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 格式化返回数据
    const formattedWordlists: WordlistWithCount[] = wordlists.map((wordlist: {
      id: number;
      name: string;
      createdAt: Date;
      userId: number;
      _count: { wordlistEntries: number };
    }) => ({
      id: wordlist.id,
      name: wordlist.name,
      wordCount: wordlist._count.wordlistEntries,
      createdAt: wordlist.createdAt.toISOString(),
      userId: wordlist.userId,
      _count: {
        wordlistEntries: wordlist._count.wordlistEntries
      }
    }));

    return NextResponse.json({
      success: true,
      wordlists: formattedWordlists
    });

  } catch (error) {
    console.error('Error fetching wordlists:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch wordlists' 
      },
      { status: 500 }
    );
  }
}

// 上传新词书
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
    const userId = user.id;

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    // 验证输入
    if (!file || !name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File and name are required' 
        } as UploadWordlistResponse,
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileContent = await file.text();
    const wordsFromFile = fileContent
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0);

    // 去重
    const uniqueWords = [...new Set(wordsFromFile)];

    if (uniqueWords.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File is empty or contains no valid words' 
        } as UploadWordlistResponse,
        { status: 400 }
      );
    }

    // 开始事务
    const result = await db.$transaction(async (tx) => {
      // 批量查找现有单词
      const existingWords = await tx.word.findMany({
        where: {
          wordText: {
            in: uniqueWords
          }
        },
        select: {
          id: true,
          wordText: true
        }
      });

      // 创建现有单词的映射
      const existingWordMap = new Map(
        existingWords.map(word => [word.wordText, word.id])
      );

      // 找出需要创建的新单词
      const newWords = uniqueWords.filter(wordText => !existingWordMap.has(wordText));

      // 批量创建新单词
      if (newWords.length > 0) {
        const createdWords = await tx.word.createMany({
          data: newWords.map(wordText => ({
            wordText,
            definitionData: {}
          })),
          skipDuplicates: true
        });

        // 获取新创建的单词ID（需要重新查询以获取生成的ID）
        const newlyCreatedWords = await tx.word.findMany({
          where: {
            wordText: {
              in: newWords
            }
          },
          select: {
            id: true,
            wordText: true
          }
        });

        // 合并现有单词和新单词的ID
        const allWordIds = [
          ...existingWords.map(w => w.id),
          ...newlyCreatedWords.map(w => w.id)
        ];

        // 创建词书记录
        const newWordlist = await tx.wordlist.create({
          data: {
            userId: userId,
            name: name.trim()
          }
        });

        // 批量创建关联记录
        const entriesToCreate = allWordIds.map(wordId => ({
          wordlistId: newWordlist.id,
          wordId
        }));

        await tx.wordlistEntry.createMany({
          data: entriesToCreate
        });

        return {
          id: newWordlist.id,
          name: newWordlist.name,
          wordCount: allWordIds.length
        };
      } else {
        // 只有现有单词的情况
        const wordIds = existingWords.map(w => w.id);

        // 创建词书记录
        const newWordlist = await tx.wordlist.create({
          data: {
            userId: userId,
            name: name.trim()
          }
        });

        // 批量创建关联记录
        const entriesToCreate = wordIds.map(wordId => ({
          wordlistId: newWordlist.id,
          wordId
        }));

        await tx.wordlistEntry.createMany({
          data: entriesToCreate
        });

        return {
          id: newWordlist.id,
          name: newWordlist.name,
          wordCount: wordIds.length
        };
      }
    });

    // 词书创建成功后，立即初始化学习进度
    try {
      // 等待学习进度初始化完成
      await initializeUserProgress(result.id, userId);

      console.log(`词书 "${name}" 上传成功，已初始化 ${result.wordCount} 个单词的学习进度`);

      return NextResponse.json({
        success: true,
        ...result,
        initialized: true
      } as UploadWordlistResponse);
    } catch (initError) {
      console.error('初始化学习进度失败:', initError);
      // 即使初始化失败，也返回词书创建成功的结果
      return NextResponse.json({
        success: true,
        ...result,
        initialized: false,
        initError: 'Failed to initialize learning progress'
      } as UploadWordlistResponse);
    }

  } catch (error) {
    console.error('Error uploading wordlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload wordlist' 
      } as UploadWordlistResponse,
      { status: 500 }
    );
  }
}