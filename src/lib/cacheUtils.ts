import { db } from './db';
import { dictionaryScraper } from './dictionary';

// 批量预加载词书中的单词释义到缓存
export async function preloadWordlistCache(wordlistId: number, batchSize: number = 10) {
  try {
    // 获取词书中的所有单词
    const wordlistEntries = await db.wordlistEntry.findMany({
      where: { wordlistId },
      include: {
        word: true
      }
    });

    if (wordlistEntries.length === 0) {
      console.log(`词书 ${wordlistId} 中没有单词`);
      return { success: true, message: '词书为空', processed: 0 };
    }

    // 筛选出没有释义数据的单词
    const wordsToCache = wordlistEntries.filter((entry: any) =>
      !entry.word.definitionData || Object.keys(entry.word.definitionData).length === 0
    );

    if (wordsToCache.length === 0) {
      console.log(`词书 ${wordlistId} 中的所有单词已缓存`);
      return { success: true, message: '所有单词已缓存', processed: 0 };
    }

    console.log(`开始预加载词书 ${wordlistId} 中的 ${wordsToCache.length} 个单词`);

    let processedCount = 0;
    let errorCount = 0;

    // 分批处理单词
    for (let i = 0; i < wordsToCache.length; i += batchSize) {
      const batch = wordsToCache.slice(i, i + batchSize);
      
      // 并行处理当前批次
      const batchPromises = batch.map(async (entry: any) => {
        try {
          console.log(`正在缓存单词: ${entry.word.wordText}`);
          const result = await dictionaryScraper.scrapeWord(entry.word.wordText, 'all');
          
          if (result.success && result.data) {
            // 更新数据库中的释义数据
            await db.word.update({
              where: { id: entry.word.id },
              data: {
                definitionData: result.data,
                updatedAt: new Date()
              }
            });
            
            console.log(`成功缓存单词: ${entry.word.wordText}`);
            return { success: true, word: entry.word.wordText };
          } else {
            console.error(`缓存单词失败: ${entry.word.wordText}, 错误: ${result.error}`);
            return { success: false, word: entry.word.wordText, error: result.error };
          }
        } catch (error) {
          console.error(`缓存单词时出错: ${entry.word.wordText}`, error);
          return { success: false, word: entry.word.wordText, error: String(error) };
        }
      });

      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);
      
      // 统计结果
      batchResults.forEach(result => {
        if (result.success) {
          processedCount++;
        } else {
          errorCount++;
        }
      });

      // 批次间延迟，避免请求过于频繁
      if (i + batchSize < wordsToCache.length) {
        console.log(`批次完成，已处理 ${processedCount + errorCount}/${wordsToCache.length} 个单词，等待 2 秒...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`词书 ${wordlistId} 预加载完成: 成功 ${processedCount} 个，失败 ${errorCount} 个`);
    
    return {
      success: true,
      message: `预加载完成`,
      processed: processedCount,
      errors: errorCount,
      total: wordsToCache.length
    };

  } catch (error) {
    console.error('预加载词书缓存时出错:', error);
    return {
      success: false,
      message: '预加载过程中出错',
      error: String(error)
    };
  }
}

// 获取词书缓存状态
export async function getWordlistCacheStatus(wordlistId: number) {
  try {
    const wordlistEntries = await db.wordlistEntry.findMany({
      where: { wordlistId },
      include: {
        word: true
      }
    });

    if (wordlistEntries.length === 0) {
      return {
        total: 0,
        cached: 0,
        uncached: 0,
        cachePercentage: 100
      };
    }

    const cachedCount = wordlistEntries.filter((entry: any) =>
      entry.word.definitionData && Object.keys(entry.word.definitionData).length > 0
    ).length;

    return {
      total: wordlistEntries.length,
      cached: cachedCount,
      uncached: wordlistEntries.length - cachedCount,
      cachePercentage: Math.round((cachedCount / wordlistEntries.length) * 100)
    };

  } catch (error) {
    console.error('获取词书缓存状态时出错:', error);
    return {
      total: 0,
      cached: 0,
      uncached: 0,
      cachePercentage: 0,
      error: String(error)
    };
  }
}

// 清理过期的缓存数据（可选功能）
export async function cleanupExpiredCache(daysOld: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // 查找长时间未更新的单词
    const oldWords = await db.word.findMany({
      where: {
        updatedAt: {
          lt: cutoffDate
        }
      },
      select: {
        id: true,
        wordText: true
      }
    });

    if (oldWords.length === 0) {
      console.log(`没有超过 ${daysOld} 天未更新的缓存数据`);
      return { success: true, message: '没有需要清理的缓存', cleaned: 0 };
    }

    // 清理释义数据，但保留单词记录
    const result = await db.word.updateMany({
      where: {
        id: {
          in: oldWords.map((word: any) => word.id)
        }
      },
      data: {
        definitionData: {},
        updatedAt: new Date()
      }
    });

    console.log(`已清理 ${result.count} 个过期的缓存数据`);
    
    return {
      success: true,
      message: `已清理 ${result.count} 个过期的缓存数据`,
      cleaned: result.count
    };

  } catch (error) {
    console.error('清理过期缓存时出错:', error);
    return {
      success: false,
      message: '清理过期缓存时出错',
      error: String(error)
    };
  }
}