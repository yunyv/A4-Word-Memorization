'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLearning } from '@/hooks/useLearning';
import { WordDisplay } from '@/components/learning/WordDisplay';
import { InitializingProgress } from '@/components/learning/InitializingProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check, X, Home, Settings } from 'lucide-react';
import { authFetch } from '@/hooks/useAuth';

export default function LearningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userState, logout } = useAuth();
  const { 
    learningState, 
    isLoading, 
    error, 
    startLearningSession, 
    nextWord, 
    updateWordProgress,
    endLearningSession 
  } = useLearning();
  
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [wordId, setWordId] = useState<number | null>(null);
  const [sessionMode, setSessionMode] = useState<'new' | 'review' | 'test' | null>(null);
  const [wordlistId, setWordlistId] = useState<number | undefined>(undefined);

  // 如果用户未认证，重定向到令牌页面
  useEffect(() => {
    if (userState.status === 'idle' || (userState.status === 'error' && !userState.isAuthenticated)) {
      router.push('/token');
    }
  }, [userState.status, userState.isAuthenticated, router]);

  // 初始化学习会话
  useEffect(() => {
    const mode = searchParams.get('mode') as 'new' | 'review' | 'test' | null;
    const wlId = searchParams.get('wordlistId');
    
    if (mode && userState.isAuthenticated) {
      setSessionMode(mode);
      if (wlId) {
        setWordlistId(parseInt(wlId));
      }
      
      // 开始学习会话
      startLearningSession(mode, wlId ? parseInt(wlId) : undefined);
    }
  }, [searchParams, userState.isAuthenticated, startLearningSession]);

  // 获取单词ID
  useEffect(() => {
    if (learningState.currentWordText) {
      // 通过单词文本获取单词ID
      const fetchWordId = async () => {
        try {
          const response = await authFetch(`/api/words/by-text?text=${learningState.currentWordText}`);
          const data = await response.json();
          
          if (data.success && data.wordId) {
            setWordId(data.wordId);
          }
        } catch (error) {
          console.error('Error fetching word ID:', error);
        }
      };
      
      fetchWordId();
    }
  }, [learningState.currentWordText]);

  // 处理答案反馈
  const handleAnswer = (correct: boolean) => {
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // 更新学习进度
    if (wordId) {
      updateWordProgress(wordId, correct);
    }
    
    // 2秒后自动进入下一个单词
    setTimeout(() => {
      setShowFeedback(false);
      setIsCorrect(null);
      nextWord();
    }, 2000);
  };

  // 处理返回仪表盘
  const handleBackToDashboard = () => {
    endLearningSession();
    router.push('/dashboard');
  };

  // 处理设置
  const handleSettings = () => {
    router.push('/settings');
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

  // 如果正在初始化学习进度，显示初始化进度组件
  if (isLoading && error && error.includes('初始化')) {
    return <InitializingProgress message={error} />;
  }

  // 如果会话未开始或已结束
  if (learningState.status === 'idle' || learningState.status === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            {learningState.status === 'finished' ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">学习完成！</h2>
                <p className="text-gray-600 mb-6">
                  您已完成本次学习会话，共学习了 {learningState.wordQueue.length} 个单词。
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">准备学习</h2>
                <p className="text-gray-600 mb-6">
                  {isLoading ? '正在为您准备学习内容...' : '点击下方按钮开始学习'}
                </p>
              </>
            )}
            
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Button onClick={handleBackToDashboard} className="w-full">
                  返回仪表盘
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果有错误
  if (error) {
    // 检查是否是初始化相关的错误
    const isInitError = error.includes('初始化');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              {isInitError ? '初始化问题' : '出错了'}
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            {isInitError && (
              <p className="text-sm text-gray-500 mb-4">
                首次使用需要初始化学习进度，如果问题持续存在，请刷新页面重试。
              </p>
            )}
            
            <div className="space-y-2">
              {isInitError && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full mb-2"
                >
                  刷新页面
                </Button>
              )}
              <Button onClick={handleBackToDashboard} variant="outline" className="w-full">
                返回仪表盘
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
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
                {sessionMode === 'new' && '新模式'}
                {sessionMode === 'review' && '复习模式'}
                {sessionMode === 'test' && '测试模式'}
                {wordlistId && ` - 词书 ${wordlistId}`}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                {learningState.currentIndex + 1} / {learningState.wordQueue.length}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSettings}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          {learningState.currentWordText && (
            <WordDisplay
              wordText={learningState.currentWordText}
              wordDefinition={learningState.currentWordData}
              pronunciationData={learningState.currentWordData?.pronunciationData}
              sentences={learningState.currentWordData?.sentences}
              fontSize={32}
            />
          )}
        </div>
        
        {/* 反馈覆盖层 */}
        {showFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`p-8 rounded-lg ${isCorrect ? 'bg-green-500' : 'bg-red-500'} text-white`}>
              <div className="flex flex-col items-center">
                {isCorrect ? (
                  <Check className="h-16 w-16 mb-4" />
                ) : (
                  <X className="h-16 w-16 mb-4" />
                )}
                <p className="text-xl font-bold">
                  {isCorrect ? '正确！' : '再接再厉！'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 底部操作栏 */}
        <div className="bg-white border-t p-4">
          <div className="max-w-4xl mx-auto">
            {sessionMode === 'test' ? (
              // 测试模式：显示选项按钮
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleAnswer(false)}
                  variant="outline"
                  className="h-12 text-lg"
                  disabled={showFeedback}
                >
                  <X className="h-5 w-5 mr-2" />
                  不认识
                </Button>
                
                <Button 
                  onClick={() => handleAnswer(true)}
                  className="h-12 text-lg"
                  disabled={showFeedback}
                >
                  <Check className="h-5 w-5 mr-2" />
                  认识
                </Button>
              </div>
            ) : (
              // 学习模式：显示下一个按钮
              <div className="flex justify-center">
                <Button 
                  onClick={() => nextWord()}
                  className="h-12 px-8 text-lg"
                  disabled={showFeedback}
                >
                  下一个单词
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}