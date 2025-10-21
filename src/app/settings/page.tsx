'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Database, Info, RefreshCw } from 'lucide-react';
import { authFetch } from '@/hooks/useAuth';
import { Wordlist } from '@/types/wordlist';
import { CacheStatus } from '@/types/common';

export default function SettingsPage() {
  const router = useRouter();
  const { userState, logout } = useAuth();
  
  const [wordlists, setWordlists] = useState<Wordlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isPreloadingCache, setIsPreloadingCache] = useState(false);
  const [selectedWordlist, setSelectedWordlist] = useState<number | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 如果用户未认证，重定向到令牌页面
  useEffect(() => {
    if (userState.status === 'idle' || (userState.status === 'error' && !userState.isAuthenticated)) {
      router.push('/token');
    }
  }, [userState.status, userState.isAuthenticated, router]);

  // 获取词书列表
  useEffect(() => {
    if (userState.isAuthenticated) {
      fetchWordlists();
    }
  }, [userState.isAuthenticated]);

  // 获取词书列表
  const fetchWordlists = async () => {
    setIsLoading(true);
    
    try {
      const response = await authFetch('/api/wordlists');
      const data = await response.json();
      
      if (data.success) {
        setWordlists(data.wordlists || []);
      } else {
        showMessage('error', 'Failed to fetch wordlists');
      }
    } catch (error) {
      console.error('Error fetching wordlists:', error);
      showMessage('error', 'Network error while fetching wordlists');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取词书缓存状态
  const fetchCacheStatus = async (wordlistId: number) => {
    try {
      const response = await authFetch(`/api/cache?wordlistId=${wordlistId}`);
      const data = await response.json();
      
      if (data.success) {
        setCacheStatus(data);
      } else {
        showMessage('error', 'Failed to fetch cache status');
      }
    } catch (error) {
      console.error('Error fetching cache status:', error);
      showMessage('error', 'Network error while fetching cache status');
    }
  };

  // 预加载词书缓存
  const preloadWordlistCache = async () => {
    if (!selectedWordlist) return;
    
    setIsPreloadingCache(true);
    
    try {
      const response = await authFetch('/api/cache', {
        method: 'POST',
        body: JSON.stringify({
          wordlistId: selectedWordlist,
          batchSize: 10
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `预加载完成: 成功 ${data.processed} 个，失败 ${data.errors || 0} 个`);
        // 刷新缓存状态
        fetchCacheStatus(selectedWordlist);
      } else {
        showMessage('error', data.error || 'Failed to preload cache');
      }
    } catch (error) {
      console.error('Error preloading cache:', error);
      showMessage('error', 'Network error while preloading cache');
    } finally {
      setIsPreloadingCache(false);
    }
  };

  // 清理过期缓存
  const clearExpiredCache = async () => {
    setIsClearingCache(true);
    
    try {
      const response = await authFetch('/api/cache?daysOld=30', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `已清理 ${data.cleaned} 个过期的缓存数据`);
      } else {
        showMessage('error', data.error || 'Failed to clear expired cache');
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      showMessage('error', 'Network error while clearing expired cache');
    } finally {
      setIsClearingCache(false);
    }
  };

  // 显示消息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // 处理返回仪表盘
  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  // 处理登出
  const handleLogout = () => {
    logout();
    router.push('/token');
  };

  // 如果正在加载或未认证，显示加载状态
  if (userState.status === 'loading' || !userState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToDashboard}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
              </Button>
              
              <div className="text-sm text-gray-600">
                设置
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                用户: {userState.token}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              账户
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              缓存管理
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              关于
            </TabsTrigger>
          </TabsList>
          
          {/* 账户设置 */}
          <TabsContent value="account" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>账户设置</CardTitle>
                <CardDescription>
                  管理您的账户信息和认证令牌
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">认证令牌</h3>
                    <p className="text-sm text-gray-500">{userState.token}</p>
                  </div>
                  <Button variant="outline" onClick={handleLogout}>
                    更换令牌
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">账户创建时间</h3>
                    <p className="text-sm text-gray-500">
                      {userState.user?.createdAt 
                        ? new Date(userState.user.createdAt).toLocaleDateString()
                        : '未知'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 缓存管理 */}
          <TabsContent value="cache" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>缓存管理</CardTitle>
                <CardDescription>
                  管理词典API缓存，提高学习体验
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 词书选择 */}
                <div>
                  <h3 className="font-medium mb-2">选择词书</h3>
                  <select 
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => {
                      const wordlistId = parseInt(e.target.value);
                      setSelectedWordlist(wordlistId);
                      if (wordlistId) {
                        fetchCacheStatus(wordlistId);
                      }
                    }}
                    value={selectedWordlist || ''}
                  >
                    <option value="">请选择词书</option>
                    {wordlists.map((wordlist) => (
                      <option key={wordlist.id} value={wordlist.id}>
                        {wordlist.name} ({wordlist.wordCount} 个单词)
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* 缓存状态 */}
                {cacheStatus && (
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">缓存状态</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{cacheStatus.total}</div>
                        <div className="text-sm text-gray-500">总单词</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{cacheStatus.cached}</div>
                        <div className="text-sm text-gray-500">已缓存</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">{cacheStatus.uncached}</div>
                        <div className="text-sm text-gray-500">未缓存</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${cacheStatus.cachePercentage}%` }} // 保留这个动态样式，因为它依赖于数据计算
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        缓存完成度: {cacheStatus.cachePercentage}%
                      </p>
                    </div>
                  </div>
                )}
                
                {/* 缓存操作 */}
                <div className="space-y-2">
                  <Button 
                    onClick={preloadWordlistCache}
                    disabled={!selectedWordlist || isPreloadingCache}
                    className="w-full"
                  >
                    {isPreloadingCache ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        预加载中...
                      </>
                    ) : (
                      '预加载词书缓存'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={clearExpiredCache}
                    disabled={isClearingCache}
                    className="w-full"
                  >
                    {isClearingCache ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        清理中...
                      </>
                    ) : (
                      '清理过期缓存'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 关于 */}
          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>关于 A4 Recite</CardTitle>
                <CardDescription>
                  应用信息和版本详情
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">应用信息</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">名称:</span> A4 Recite</p>
                    <p><span className="font-medium">版本:</span> 1.0.0</p>
                    <p><span className="font-medium">描述:</span> 基于A4纸背单词法的数字化学习工具</p>
                    <p><span className="font-medium">技术栈:</span> Next.js, Prisma, TypeScript</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">功能特点</h3>
                  <ul className="text-sm space-y-1">
                    <li>• 令牌认证系统，无需注册账户</li>
                    <li>• 艾宾浩斯复习算法，科学记忆</li>
                    <li>• 词典API缓存，提高响应速度</li>
                    <li>• 多种学习模式：专注学习、复习、测试</li>
                    <li>• 词书管理：上传、列表、删除</li>
                    <li>• 学习进度跟踪和统计</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}