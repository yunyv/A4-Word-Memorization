'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wordlist, WordlistWithCount, UploadWordlistResponse, DeleteWordlistResponse } from '@/types/wordlist';
import { authFetch } from './useAuth';
import { cachedFetch, generateCacheKey } from '@/lib/cacheUtils';

export function useWordlists() {
  const [wordlists, setWordlists] = useState<WordlistWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取词书列表
  const fetchWordlists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await cachedFetch('wordlists', async () => {
        const response = await authFetch('/api/wordlists');
        const result = await response.json();
        return result;
      }, 5 * 60 * 1000); // 5分钟缓存

      if (data.success) {
        setWordlists(data.wordlists || []);
      } else {
        setError(data.error || 'Failed to fetch wordlists');
      }
    } catch (err) {
      console.error('Error fetching wordlists:', err);
      setError('Network error while fetching wordlists');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 上传新词书
  const uploadWordlist = useCallback(async (name: string, file: File): Promise<UploadWordlistResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('file', file);

      const response = await authFetch('/api/wordlists', {
        method: 'POST',
        body: formData,
        // 注意：不要设置Content-Type，让浏览器自动设置multipart/form-data边界
      });

      const data: UploadWordlistResponse = await response.json();

      if (data.success) {
        // 清除词书列表缓存
        const { memoryCache } = await import('@/lib/cacheUtils');
        memoryCache.delete('wordlists');
        
        // 刷新词书列表
        await fetchWordlists();
      } else {
        setError(data.error || 'Failed to upload wordlist');
      }

      return data;
    } catch (err) {
      console.error('Error uploading wordlist:', err);
      const errorMessage = 'Network error while uploading wordlist';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      } as UploadWordlistResponse;
    } finally {
      setIsLoading(false);
    }
  }, [fetchWordlists]);

  // 删除词书
  const deleteWordlist = useCallback(async (id: number): Promise<DeleteWordlistResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/wordlists/${id}`, {
        method: 'DELETE'
      });

      const data: DeleteWordlistResponse = await response.json();

      if (data.success) {
        // 清除词书列表缓存
        const { memoryCache } = await import('@/lib/cacheUtils');
        memoryCache.delete('wordlists');
        
        // 从本地状态中移除已删除的词书
        setWordlists(prev => prev.filter(wordlist => wordlist.id !== id));
      } else {
        setError(data.error || 'Failed to delete wordlist');
      }

      return data;
    } catch (err) {
      console.error('Error deleting wordlist:', err);
      const errorMessage = 'Network error while deleting wordlist';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      } as DeleteWordlistResponse;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 获取词书详情
  const getWordlistDetails = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = generateCacheKey('wordlistDetails', { id });
      const data = await cachedFetch(cacheKey, async () => {
        const response = await authFetch(`/api/wordlists/${id}`);
        const result = await response.json();
        return result;
      }, 5 * 60 * 1000); // 5分钟缓存

      if (data.success) {
        return data.wordlist;
      } else {
        setError(data.error || 'Failed to fetch wordlist details');
        return null;
      }
    } catch (err) {
      console.error('Error fetching wordlist details:', err);
      setError('Network error while fetching wordlist details');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化时获取词书列表
  useEffect(() => {
    fetchWordlists();
  }, []);

  return {
    wordlists,
    isLoading,
    error,
    fetchWordlists,
    uploadWordlist,
    deleteWordlist,
    getWordlistDetails
  };
}

// 文件处理辅助函数
export function validateWordlistFile(file: File): { isValid: boolean; error?: string } {
  // 检查文件类型
  const validTypes = ['text/plain', 'text/csv', 'application/vnd.ms-excel'];
  if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
    return {
      isValid: false,
      error: '请上传 .txt 或 .csv 格式的文件'
    };
  }

  // 检查文件大小（限制为5MB）
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: '文件大小不能超过 5MB'
    };
  }

  return { isValid: true };
}

// 解析词书文件内容
export async function parseWordlistFile(file: File): Promise<{ words: string[]; error?: string }> {
  try {
    const text = await file.text();
    
    // 按行分割并清理
    const lines = text.split('\n');
    const words = lines
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0)
      .filter(line => /^[a-zA-Z]+$/.test(line)); // 只保留纯英文单词

    if (words.length === 0) {
      return {
        words: [],
        error: '文件中没有找到有效的英文单词'
      };
    }

    return { words };
  } catch (error) {
    console.error('Error parsing wordlist file:', error);
    return {
      words: [],
      error: '解析文件时出错'
    };
  }
}