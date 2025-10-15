'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TokenInputForm } from '@/components/auth/TokenInputForm';
import { useAuth } from '@/hooks/useAuth';

export default function TokenPage() {
  const router = useRouter();
  const { userState } = useAuth();

  // 如果用户已经认证，重定向到仪表盘
  useEffect(() => {
    if (userState.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [userState.isAuthenticated, router]);

  // 如果正在加载，显示加载状态
  if (userState.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50" style={{ backgroundColor: '#F8F5F1' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证令牌...</p>
        </div>
      </div>
    );
  }

  // 如果已经认证，不显示任何内容（等待重定向）
  if (userState.isAuthenticated) {
    return null;
  }

  return <TokenInputForm />;
}