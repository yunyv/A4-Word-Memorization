import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DeleteWordlistResponse } from '@/types/wordlist';

// 删除指定ID的词书
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;
    const wordlistId = parseInt(id);

    // 验证词书ID
    if (isNaN(wordlistId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid wordlist ID' 
        } as DeleteWordlistResponse,
        { status: 400 }
      );
    }

    // 检查词书是否存在且属于当前用户
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
          error: 'Wordlist not found or you do not have permission to delete it' 
        } as DeleteWordlistResponse,
        { status: 404 }
      );
    }

    // 使用事务删除词书及其所有相关数据
    await db.$transaction(async (tx) => {
      // 删除词书条目关联
      await tx.wordlistEntry.deleteMany({
        where: { wordlistId }
      });

      // 删除用户单词进度（仅与该词书相关的）
      // 注意：这里我们可能需要更复杂的逻辑来处理用户学习进度
      // 暂时保留用户进度，因为用户可能从其他词书中学习相同的单词

      // 删除词书
      await tx.wordlist.delete({
        where: { id: wordlistId }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Wordlist deleted successfully'
    } as DeleteWordlistResponse);

  } catch (error) {
    console.error('Error deleting wordlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete wordlist' 
      } as DeleteWordlistResponse,
      { status: 500 }
    );
  }
}

// 获取指定词书的详细信息（可选功能）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;
    const wordlistId = parseInt(id);

    // 验证词书ID
    if (isNaN(wordlistId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid wordlist ID' 
        },
        { status: 400 }
      );
    }

    // 查询词书详情，包含单词列表
    const wordlist = await db.wordlist.findUnique({
      where: { 
        id: wordlistId,
        userId: user.id 
      },
      include: {
        wordlistEntries: {
          include: {
            word: true
          },
          orderBy: {
            word: {
              wordText: 'asc'
            }
          }
        }
      }
    });

    if (!wordlist) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wordlist not found' 
        },
        { status: 404 }
      );
    }

    // 格式化返回数据
    const formattedWordlist = {
      id: wordlist.id,
      name: wordlist.name,
      createdAt: wordlist.createdAt.toISOString(),
      words: wordlist.wordlistEntries.map((entry: {
        word: {
          id: number;
          wordText: string;
        };
      }) => ({
        id: entry.word.id,
        wordText: entry.word.wordText
      }))
    };

    return NextResponse.json({
      success: true,
      wordlist: formattedWordlist
    });

  } catch (error) {
    console.error('Error fetching wordlist details:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch wordlist details' 
      },
      { status: 500 }
    );
  }
}