'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { WordlistsCard } from '@/components/dashboard/WordlistsCard';
import { ReviewCenterCard } from '@/components/dashboard/ReviewCenterCard';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, User } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { userState, logout } = useAuth();

  // 如果用户未认证，重定向到令牌页面
  useEffect(() => {
    if (userState.status === 'idle' || (userState.status === 'error' && !userState.isAuthenticated)) {
      router.push('/token');
    }
  }, [userState.status, userState.isAuthenticated, router]);

  // 处理登出
  const handleLogout = () => {
    logout();
    router.push('/token');
  };

  // 处理开始学习
  const handleStartLearning = (wordlistId: number) => {
        router.push(`/learning/focus?wordlistId=${wordlistId}&mode=new`);
  };

  // 处理开始复习
  const handleStartReview = (wordlistId?: number) => {
        const url = wordlistId
      ? `/learning/focus?wordlistId=${wordlistId}&mode=review`
      : '/learning/focus?mode=review';
    router.push(url);
  };

  // 处理开始测试
  const handleStartTest = (wordlistId: number) => {
        router.push(`/learning/test/${wordlistId}`);
  };

  // 处理设置
  const handleSettings = () => {
    router.push('/settings');
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
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">A4 Recite</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>用户: {userState.token}</span>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSettings}
                className="flex items-center gap-1"
              >
                <Settings className="h-4 w-4" />
                设置
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">仪表盘</h2>
          <p className="text-gray-600">管理您的词书并跟踪学习进度</p>
        </div>

        {/* Bento网格布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：复习中心 */}
          <div className="lg:col-span-1">
            <ReviewCenterCard
              onStartReview={handleStartReview}
              onStartTest={(wordlistId) => wordlistId ? handleStartTest(wordlistId) : handleStartTest(0)}
            />
          </div>
          
          {/* 右侧：词书管理 */}
          <div className="lg:col-span-2">
            <WordlistsCard
              onStartLearning={handleStartLearning}
              onStartTest={handleStartTest}
            />
          </div>
        </div>

        {/* 快速操作区域 */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">快速开始</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              onClick={() => handleStartReview()}
              className="flex items-center justify-center gap-2 h-12"
            >
              <div className="w-5 h-5 rounded-full bg-white opacity-80"></div>
              复习待学单词
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push('/learning/focus?mode=new')}
              className="flex items-center justify-center gap-2 h-12"
            >
              <div className="w-5 h-5 rounded-full bg-gray-400 opacity-80"></div>
              学习新单词
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // 找到第一个可用的词书进行测试
                const wordlists = document.querySelector('[data-wordlists-container]');
                if (wordlists) {
                  const firstWordlistButton = wordlists.querySelector('button[data-test-button]');
                  if (firstWordlistButton) {
                    (firstWordlistButton as HTMLButtonElement).click();
                  } else {
                    alert('请先上传词书才能进行测试');
                  }
                } else {
                  alert('请先上传词书才能进行测试');
                }
              }}
              className="flex items-center justify-center gap-2 h-12"
            >
              <div className="w-5 h-5 rounded-full bg-gray-400 opacity-80"></div>
              进入测试模式
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}