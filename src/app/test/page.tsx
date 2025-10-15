'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLearning } from '@/hooks/useLearning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check, X, Home, Settings } from 'lucide-react';
import { authFetch } from '@/hooks/useAuth';

interface TestWord {
  id: number;
  wordText: string;
  definition_data: any;
}

interface TestResult {
  wordId: number;
  wordText: string;
  isCorrect: boolean;
  userAnswer: boolean;
}

export default function TestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userState, logout } = useAuth();
  const { startLearningSession, endLearningSession } = useLearning();
  
  const [testWords, setTestWords] = useState<TestWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [userAnswers, setUserAnswers] = useState<TestResult[]>([]);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordlistId, setWordlistId] = useState<number | undefined>(undefined);

  // 如果用户未认证，重定向到令牌页面
  useEffect(() => {
    if (userState.status === 'idle' || (userState.status === 'error' && !userState.isAuthenticated)) {
      router.push('/token');
    }
  }, [userState.status, userState.isAuthenticated, router]);

  // 初始化测试
  useEffect(() => {
    const wlId = searchParams.get('wordlistId');
    
    if (wlId && userState.isAuthenticated) {
      setWordlistId(parseInt(wlId));
      initializeTest(parseInt(wlId));
    }
  }, [searchParams, userState.isAuthenticated]);

  // 初始化测试数据
  const initializeTest = async (wlId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // 获取词书详情
      const response = await authFetch(`/api/wordlists/${wlId}`);
      const data = await response.json();

      if (data.success && data.wordlist) {
        // 随机打乱单词顺序
        const shuffledWords = shuffleArray(data.wordlist.words);
        setTestWords(shuffledWords as TestWord[]);
      } else {
        setError('Failed to load wordlist');
      }
    } catch (err) {
      console.error('Error initializing test:', err);
      setError('Network error while loading wordlist');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理用户答案
  const handleAnswer = (isCorrect: boolean) => {
    const currentWord = testWords[currentIndex];
    const result: TestResult = {
      wordId: currentWord.id,
      wordText: currentWord.wordText,
      isCorrect,
      userAnswer: isCorrect
    };

    // 更新用户答案
    const updatedAnswers = [...userAnswers, result];
    setUserAnswers(updatedAnswers);

    // 显示释义
    setShowDefinition(true);

    // 2秒后进入下一个单词或结束测试
    setTimeout(() => {
      if (currentIndex < testWords.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowDefinition(false);
      } else {
        // 测试完成
        setTestCompleted(true);
        submitTestResults(updatedAnswers);
      }
    }, 2000);
  };

  // 提交测试结果
  const submitTestResults = async (results: TestResult[]) => {
    try {
      // 批量更新学习进度
      const updatePromises = results.map(result => {
        return authFetch(`/api/review/progress/${result.wordId}`, {
          method: 'POST',
          body: JSON.stringify({ isCorrect: result.isCorrect })
        });
      });

      await Promise.all(updatePromises);
      console.log('Test results submitted successfully');
    } catch (error) {
      console.error('Error submitting test results:', error);
    }
  };

  // 重新开始测试
  const restartTest = () => {
    if (wordlistId) {
      initializeTest(wordlistId);
    }
    setCurrentIndex(0);
    setShowDefinition(false);
    setUserAnswers([]);
    setTestCompleted(false);
  };

  // 返回仪表盘
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

  // 计算测试结果统计
  const calculateStats = () => {
    const correctCount = userAnswers.filter(answer => answer.isCorrect).length;
    const totalCount = userAnswers.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    
    return {
      correctCount,
      totalCount,
      accuracy
    };
  };

  // 工具函数：随机打乱数组
  function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

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

  // 如果正在加载测试数据
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在准备测试...</p>
        </div>
      </div>
    );
  }

  // 如果有错误
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">出错了</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            <div className="space-y-2">
              <Button onClick={handleBackToDashboard} variant="outline" className="w-full">
                返回仪表盘
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果测试完成，显示结果
  if (testCompleted) {
    const stats = calculateStats();
    
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
                  测试结果
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
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
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">测试完成！</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{stats.accuracy}%</div>
                <p className="text-gray-600">正确率</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.correctCount}</div>
                  <p className="text-sm text-green-700">答对</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{stats.totalCount - stats.correctCount}</div>
                  <p className="text-sm text-red-700">答错</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button onClick={restartTest} className="w-full">
                  重新测试
                </Button>
                
                <Button onClick={handleBackToDashboard} variant="outline" className="w-full">
                  返回仪表盘
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 如果没有测试单词
  if (testWords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">没有可测试的单词</h2>
            <p className="text-gray-600 mb-6">
              请先上传词书或选择包含单词的词书。
            </p>
            
            <div className="space-y-2">
              <Button onClick={handleBackToDashboard} className="w-full">
                返回仪表盘
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWord = testWords[currentIndex];
  const currentDefinition = currentWord?.definition_data;

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
                测试模式 - 词书 {wordlistId}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                {currentIndex + 1} / {testWords.length}
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
          <Card className="w-full max-w-2xl shadow-lg">
            <CardContent className="p-8 text-center">
              {/* 单词显示 */}
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                {currentWord.wordText}
              </h1>
              
              {/* 释义显示 */}
              {showDefinition && currentDefinition && (
                <div className="text-left mt-6 p-4 bg-gray-50 rounded-lg">
                  {currentDefinition.basicDefinition && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">基本释义</h3>
                      <p className="text-gray-700">{currentDefinition.basicDefinition}</p>
                    </div>
                  )}
                  
                  {/* 可以添加更多释义类型的显示 */}
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleAnswer(false)}
                  variant="outline"
                  className="h-12 text-lg"
                  disabled={showDefinition}
                >
                  <X className="h-5 w-5 mr-2" />
                  不认识
                </Button>
                
                <Button 
                  onClick={() => handleAnswer(true)}
                  className="h-12 text-lg"
                  disabled={showDefinition}
                >
                  <Check className="h-5 w-5 mr-2" />
                  认识
                </Button>
              </div>
              
              {!showDefinition && (
                <p className="text-sm text-gray-500 mt-4">
                  请选择您是否认识这个单词
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}