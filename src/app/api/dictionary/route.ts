import { NextRequest, NextResponse } from 'next/server';
import { dictionaryScraper } from '@/lib/dictionary';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const word = searchParams.get('word');
  const type = searchParams.get('type') as 'all' | 'authoritative' | 'bilingual' | 'english' || 'all';
  const test = searchParams.get('test') === 'true'; // 测试模式，分析网站结构

  if (!word && !test) {
    return NextResponse.json(
      { error: '请提供要查询的单词' },
      { status: 400 }
    );
  }

  // 验证type参数
  const validTypes = ['all', 'authoritative', 'bilingual', 'english'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: '无效的释义类型，支持的类型: all, authoritative, bilingual, english' },
      { status: 400 }
    );
  }

  try {
    if (test) {
      // 测试模式：分析网站结构
      const structure = await dictionaryScraper.testWebsiteStructure(word || undefined);
      return NextResponse.json({
        success: true,
        mode: 'test',
        word: word || 'hello',
        data: structure
      });
    } else {
      // 正常模式：爬取单词数据
      // 首先检查数据库缓存
      try {
        const cachedWord = await db.word.findUnique({
          where: { wordText: word!.toLowerCase() }
        });

        if (cachedWord && cachedWord.definitionData) {
          // 如果缓存存在且不为空，直接返回缓存数据
          console.log(`从缓存中获取单词: ${word}`);
          return NextResponse.json({
            success: true,
            word: word!,
            requestedType: type,
            data: cachedWord.definitionData
          });
        }
      } catch (dbError) {
        console.error('查询数据库缓存时出错:', dbError);
        // 继续执行爬虫逻辑，不中断请求
      }

      // 如果缓存不存在或为空，执行爬虫
      const result = await dictionaryScraper.scrapeWord(word!, type);
      
      if (result.success && result.data) {
        // 将爬取结果存储到数据库缓存
        try {
          await db.word.upsert({
            where: { wordText: word!.toLowerCase() },
            update: {
              definitionData: result.data,
              updatedAt: new Date()
            },
            create: {
              wordText: word!.toLowerCase(),
              definitionData: result.data
            }
          });
          console.log(`单词 ${word} 已缓存到数据库`);
        } catch (cacheError) {
          console.error('缓存单词数据时出错:', cacheError);
          // 不影响返回结果，只记录错误
        }
        
        return NextResponse.json(result);
      } else {
        return NextResponse.json(
          result,
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('API路由处理错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        word
      },
      { status: 500 }
    );
  }
}