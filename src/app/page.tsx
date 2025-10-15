'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { userState, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (userState.isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/token');
    }
  }, [userState.isAuthenticated, isLoading, router]);

  // 显示加载状态
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在加载...</p>
      </div>
    </div>
  );
}
