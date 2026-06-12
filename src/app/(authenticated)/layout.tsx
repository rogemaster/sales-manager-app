'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSetAtom } from 'jotai';
import { GlobalHeader } from '@/components/layout';
import { GlobalSidebar } from '@/components/layout/globalSidebar/GlobalSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setUserInfoAtom } from '@/features/auth/store/auth.store';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient());
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
              <div className="max-w-[80%] mx-auto space-y-6">{children}</div>
            </QueryClientProvider>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
