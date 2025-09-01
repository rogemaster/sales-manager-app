'use client';

import { useSession } from 'next-auth/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function Home() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">홈 페이지</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">사용자 정보</h2>
          {session?.user && (
            <div className="space-y-2">
              <p>
                <strong>사용자 ID:</strong> {session.user.id}
              </p>
              <p>
                <strong>이메일:</strong> {session.user.email}
              </p>
              <p>
                <strong>이름:</strong> {session.user.name}
              </p>
              {session.user.image && (
                <p>
                  <strong>프로필 이미지:</strong> {session.user.image}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
