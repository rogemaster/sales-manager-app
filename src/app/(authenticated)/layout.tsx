'use client';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useSetAtom } from 'jotai';
import { GlobalHeader } from '@/components/layout';
import { GlobalSidebar } from '@/components/layout/globalSidebar/GlobalSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@/shared/utils/appQueryClient';
import { setUserInfoAtom } from '@/features/auth/store/auth.store';
import { MSWProvider } from '@/components/providers/MSWProvider';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  // 서버가 세션을 거부하면(삭제·비활성 계정) 로그인 화면으로 보낸다.
  const [queryClient] = useState(() => createAppQueryClient(() => void signOut({ callbackUrl: '/login' })));
  const { data: session } = useSession();
  const setUserInfo = useSetAtom(setUserInfoAtom);

  useEffect(() => {
    if (session?.user) {
      setUserInfo(session.user);
    }
  }, [session, setUserInfo]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* 사이드바 영역 */}
        <GlobalSidebar />
        {/* 메인 콘텐츠 영역 */}
        <SidebarInset className="flex flex-col">
          {/* 상단 헤더 영역 */}
          <GlobalHeader />
          {/* 메인 콘텐츠 */}
          <main className="flex-1 p-6 pl-[15rem]">
            <QueryClientProvider client={queryClient}>
              <div className="max-w-[80%] mx-auto space-y-6">
                {/* 주문 영역(주문·수집·홈 주문 통계)만 MSW를 쓴다. 로그인·가입은 route라 여기 밖에 둔다 */}
                <MSWProvider>{children}</MSWProvider>
              </div>
            </QueryClientProvider>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
