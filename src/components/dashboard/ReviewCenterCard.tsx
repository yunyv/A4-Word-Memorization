'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLearning } from '@/hooks/useLearning';
import { Calendar, Brain, BookOpen, FileText, TrendingUp } from 'lucide-react';

interface LearningStatsProps {
  wordlistId?: number;
  onStartReview: (wordlistId?: number) => void;
  onStartTest: (wordlistId?: number) => void;
}

export function ReviewCenterCard({ wordlistId, onStartReview, onStartTest }: LearningStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getLearningProgressStats } = useLearning();

  // 获取学习进度统计
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getLearningProgressStats(wordlistId);
        if (data) {
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching learning stats:', err);
        setError('Failed to fetch learning stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [wordlistId, getLearningProgressStats]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays === -1) return '昨天';
    if (diffDays > 0 && diffDays <= 7) return `${diffDays} 天后`;
    if (diffDays > 7) return date.toLocaleDateString();
    return `${Math.abs(diffDays)} 天前`;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            复习中心
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            复习中心
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            复习中心
          </CardTitle>
          <CardDescription>还没有学习记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">开始学习您的第一个单词</p>
            <Button onClick={() => onStartReview(wordlistId)}>
              开始学习
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              复习中心
            </CardTitle>
            <CardDescription>您的学习进度统计</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 待复习单词 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">待复习</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{stats.dueWords}</div>
            <div className="text-xs text-blue-700">个单词</div>
          </div>
          
          {/* 已学习单词 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <span className="text-xs text-green-600 font-medium">已学习</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{stats.learnedWords}</div>
            <div className="text-xs text-green-700">个单词</div>
          </div>
          
          {/* 总单词数 */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">总单词</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{stats.totalWords}</div>
            <div className="text-xs text-purple-700">个单词</div>
          </div>
          
          {/* 完成率 */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <span className="text-xs text-orange-600 font-medium">完成率</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">{stats.completionRate}%</div>
            <div className="text-xs text-orange-700">已完成</div>
          </div>
        </div>
        
        {/* 复习阶段分布 */}
        {stats.stageStats && Object.keys(stats.stageStats).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">复习阶段分布</h3>
            <div className="space-y-2">
              {Object.entries(stats.stageStats).map(([stage, count]: [string, any]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">阶段 {stage}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / stats.totalWords) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button 
            onClick={() => onStartReview(wordlistId)}
            disabled={stats.dueWords === 0}
            className="flex-1"
          >
            {stats.dueWords > 0 ? `复习 ${stats.dueWords} 个单词` : '没有待复习单词'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => onStartTest(wordlistId)}
            className="flex-1"
          >
            测试模式
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}