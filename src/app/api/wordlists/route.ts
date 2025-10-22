import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { UploadWordlistResponse, WordlistWithCount } from '@/types/wordlist';

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
      // 查找或创建单词记录
      const wordIds: number[] = [];
      
      for (const wordText of uniqueWords) {
        // 尝试查找现有单词
        let word = await tx.word.findUnique({
          where: { wordText }
        });

        // 如果不存在，创建新单词（先使用空的释义数据）
        if (!word) {
          word = await tx.word.create({
            data: {
              wordText,
              definitionData: {}
            }
          });
        }

        wordIds.push(word.id);
      }

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
        wordCount: uniqueWords.length
      };
    });

    return NextResponse.json({
      success: true,
      ...result
    } as UploadWordlistResponse);

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