'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function TokenInputForm() {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    const success = await login(token.trim());
    
    if (success) {
      // 登录成功，页面会自动重定向到仪表盘
      console.log('Token validated successfully');
    }
    
    setIsSubmitting(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50" style={{ backgroundColor: '#F8F5F1' }}>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl font-bold text-gray-900">
            欢迎使用 A4 Recite
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            创建或输入您的同步令牌，开始专注之旅。
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="例如: yunyv-gre-mastery-2025"
                value={token}
                onChange={handleInputChange}
                disabled={isLoading || isSubmitting}
                className="text-center text-lg h-12"
                style={{ fontSize: '16px' }}
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              disabled={!token.trim() || isLoading || isSubmitting}
              className="w-full h-12 text-base font-semibold"
              style={{ backgroundColor: '#4A69E2' }}
            >
              {isLoading || isSubmitting ? '验证中...' : '开始使用'}
            </Button>
          </form>
          
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p className="mb-2">令牌是您唯一的钥匙，它将同步所有数据至云端，无需账户。</p>
            <p>请选择一个容易记住且独特的令牌。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}