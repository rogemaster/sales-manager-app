'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const { status } = useSession({
    required: true,

    // [로그인이 안된 경우 처리]: 권한이 없으면 로그인 페이지로 이동 
    onUnauthenticated: () => { 
      router.replace('/');
    },
  });

  // [로딩 중인 경우]
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  // [로그인이 된 경우]
  return <>{children}</>;
};
