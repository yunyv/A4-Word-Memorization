import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface InitializingProgressProps {
  message?: string;
}

export function InitializingProgress({ message = '正在初始化学习进度...' }: InitializingProgressProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">首次使用准备</h2>
          
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          
          <div className="space-y-2 text-sm text-gray-500">
            <p>正在为您创建学习记录，这可能需要几秒钟时间。</p>
            <p>完成后您就可以开始学习单词了。</p>
          </div>
          
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}