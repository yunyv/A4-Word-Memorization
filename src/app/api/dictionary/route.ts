import { NextRequest, NextResponse } from 'next/server';
import { dictionaryScraper } from '@/lib/dictionary';

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
      const result = await dictionaryScraper.scrapeWord(word!, type);
      
      if (result.success) {
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