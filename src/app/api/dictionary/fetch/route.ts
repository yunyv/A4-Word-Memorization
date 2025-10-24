import { NextRequest, NextResponse } from 'next/server';
import { dictionaryScraper, validateWordDataCompleteness } from '@/lib/dictionary';
import { db } from '@/lib/db';

/**
 * 内部爬虫端点
 * 用于后台执行爬虫任务，不直接暴露给前端
 * 可以被其他服务或定时任务调用
 */

function convertToPrismaJson(data: unknown) {
  if (data === null || data === undefined) {
    return null;
  }

  try {
    const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        return null;
      }
      if (typeof value === 'function') {
        return undefined;
      }
      if (typeof value === 'object' && value !== null) {
        if (value.constructor === Object || Array.isArray(value)) {
          return value;
        }
        return value.toString();
      }
      return value;
    }));

    return sanitizedData;
  } catch (error) {
    console.error('[FETCH] 转换对象为 Prisma JSON 时出错:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { words, type = 'all' } = body;

    // 验证请求
    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { error: '请提供要爬取的单词列表' },
        { status: 400 }
      );
    }

    // 限制批量处理数量
    const maxBatchSize = 10;
    if (words.length > maxBatchSize) {
      return NextResponse.json(
        { error: `批量处理最多支持 ${maxBatchSize} 个单词` },
        { status: 400 }
      );
    }

    console.log(`[FETCH] 开始批量爬取 ${words.length} 个单词，类型: ${type}`);

    const results = [];

    // 处理每个单词
    for (const word of words) {
      if (!word || typeof word !== 'string') {
        results.push({
          word,
          success: false,
          error: '无效的单词'
        });
        continue;
      }

      const wordText = word.toLowerCase();
      console.log(`[FETCH] 处理单词: ${wordText}`);

      try {
        // 检查单词状态
        const existingWord = await db.word.findUnique({
          where: { wordText }
        });

        // 如果单词已完成且有有效数据，跳过
        if (existingWord && existingWord.status === 'COMPLETED') {
          console.log(`[FETCH] 单词 ${wordText} 已完成，跳过`);
          results.push({
            word: wordText,
            success: true,
            skipped: true,
            reason: 'already_completed'
          });
          continue;
        }

        // 如果单词正在处理中，跳过
        if (existingWord && existingWord.status === 'PROCESSING') {
          console.log(`[FETCH] 单词 ${wordText} 正在处理中，跳过`);
          results.push({
            word: wordText,
            success: true,
            skipped: true,
            reason: 'already_processing'
          });
          continue;
        }

        // 确保单词记录存在
        await db.word.upsert({
          where: { wordText },
          update: { status: 'PROCESSING' },
          create: {
            wordText,
            status: 'PROCESSING'
          }
        });

        console.log(`[FETCH] 开始爬取单词: ${wordText}`);
        const scrapeResult = await dictionaryScraper.scrapeWord(wordText, type);

        if (scrapeResult.success && scrapeResult.data) {
          // 验证数据完整性
          const validation = validateWordDataCompleteness(scrapeResult.data);

          if (validation.isPartiallyValid || validation.isComplete) {
            // 保存到数据库
            try {
              // 保存到JSON字段
              await db.word.update({
                where: { wordText },
                data: {
                  definitionData: convertToPrismaJson(scrapeResult.data),
                  status: 'COMPLETED'
                }
              });

              // 保存到新表结构
              await dictionaryScraper.saveWordDataToTables(wordText, scrapeResult.data);

              console.log(`[FETCH] 单词 ${wordText} 爬取并保存成功`);
              results.push({
                word: wordText,
                success: true,
                status: 'completed',
                isComplete: validation.isComplete,
                issues: validation.issues
              });
            } catch (saveError) {
              console.error(`[FETCH] 保存单词 ${wordText} 时出错:`, saveError);
              await db.word.update({
                where: { wordText },
                data: { status: 'FAILED' }
              });
              results.push({
                word: wordText,
                success: false,
                error: '保存失败',
                details: saveError instanceof Error ? saveError.message : 'Unknown error'
              });
            }
          } else {
            // 数据无效
            await db.word.update({
              where: { wordText },
              data: { status: 'FAILED' }
            });
            results.push({
              word: wordText,
              success: false,
              error: '爬取的数据无效',
              validation: validation
            });
          }
        } else {
          // 爬取失败
          await db.word.update({
            where: { wordText },
            data: { status: 'FAILED' }
          });
          results.push({
            word: wordText,
            success: false,
            error: scrapeResult.error || '爬取失败'
          });
        }

      } catch (error) {
        console.error(`[FETCH] 处理单词 ${wordText} 时出错:`, error);

        // 标记为失败
        try {
          await db.word.update({
            where: { wordText },
            data: { status: 'FAILED' }
          });
        } catch (updateError) {
          console.error(`[FETCH] 更新失败状态时出错:`, updateError);
        }

        results.push({
          word: wordText,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[FETCH] 批量爬取完成，成功: ${results.filter(r => r.success).length}, 失败: ${results.filter(r => !r.success).length}`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('[FETCH] 批量处理请求时出错:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量处理失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET 方法：获取处理状态
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const words = searchParams.get('words')?.split(',').filter(Boolean);

  if (!words || words.length === 0) {
    return NextResponse.json(
      { error: '请提供要查询的单词列表（通过 words 参数）' },
      { status: 400 }
    );
  }

  try {
    const statusPromises = words.map(async (word) => {
      const wordRecord = await db.word.findUnique({
        where: { wordText: word.toLowerCase() },
        select: {
          wordText: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });
      return {
        word: word,
        status: wordRecord?.status || 'not_found',
        exists: !!wordRecord,
        lastUpdated: wordRecord?.updatedAt
      };
    });

    const statuses = await Promise.all(statusPromises);

    return NextResponse.json({
      success: true,
      count: statuses.length,
      statuses
    });

  } catch (error) {
    console.error('[FETCH] 查询状态时出错:', error);
    return NextResponse.json(
      {
        success: false,
        error: '查询状态失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}