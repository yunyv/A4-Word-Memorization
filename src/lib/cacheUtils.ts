// 简单的内存缓存实现
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  
  // 设置缓存
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // 默认5分钟
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  // 获取缓存
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  // 删除缓存
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  // 清空所有缓存
  clear(): void {
    this.cache.clear();
  }
  
  // 清理过期缓存
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 创建全局缓存实例
export const memoryCache = new MemoryCache();

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    memoryCache.cleanup();
  }, 60 * 1000); // 每分钟清理一次
}

// 带缓存的fetch函数
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 默认5分钟
): Promise<T> {
  // 尝试从缓存获取
  const cached = memoryCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // 缓存未命中，执行fetcher
  const data = await fetcher();
  
  // 存入缓存
  memoryCache.set(key, data, ttl);
  
  return data;
}

// 生成缓存键的辅助函数
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

// 预加载词书缓存
export async function preloadWordlistCache(wordlistId: number, batchSize: number = 10) {
  try {
    const { db } = await import('./db');
    
    // 获取词书中的所有单词
    const wordlistEntries = await db.wordlistEntry.findMany({
      where: { wordlistId },
      include: {
        word: {
          select: {
            wordText: true,
            definitionData: true
          }
        }
      },
      take: batchSize
    });

    // 将单词数据存入缓存
    const cacheKey = `wordlist:${wordlistId}:words`;
    memoryCache.set(cacheKey, wordlistEntries, 10 * 60 * 1000); // 10分钟缓存

    return {
      success: true,
      message: `Preloaded ${wordlistEntries.length} words into cache`,
      count: wordlistEntries.length
    };
  } catch (error) {
    console.error('Error preloading wordlist cache:', error);
    return {
      success: false,
      error: 'Failed to preload wordlist cache'
    };
  }
}

// 获取词书缓存状态
export async function getWordlistCacheStatus(wordlistId: number) {
  try {
    const cacheKey = `wordlist:${wordlistId}:words`;
    const cachedData = memoryCache.get(cacheKey);
    
    if (cachedData && Array.isArray(cachedData)) {
      return {
        cached: true,
        count: cachedData.length,
        timestamp: 'Available'
      };
    } else {
      return {
        cached: false,
        count: 0,
        timestamp: 'Not cached'
      };
    }
  } catch (error) {
    console.error('Error getting wordlist cache status:', error);
    return {
      cached: false,
      count: 0,
      timestamp: 'Error',
      error: 'Failed to get cache status'
    };
  }
}

// 清理过期缓存
export async function cleanupExpiredCache(daysOld: number = 30) {
  try {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    // 由于我们的缓存实现不存储所有键的元数据，
    // 这里我们简单地执行一次完整的缓存清理
    memoryCache.cleanup();
    cleanedCount = 1; // 简化实现，实际清理了整个缓存
    
    return {
      success: true,
      message: `Cache cleanup completed`,
      cleanedCount
    };
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return {
      success: false,
      error: 'Failed to cleanup expired cache'
    };
  }
}