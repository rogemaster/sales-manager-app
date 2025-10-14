'use client';
import { AlertProvider } from '@/components/common/alert/AlertProvider';
import { GlobalHeader } from '@/components/layout';
import { GlobalSidebar } from '@/components/layout/globalSidebar/GlobalSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
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
            <AlertProvider>
              <div className="max-w-[80%] mx-auto space-y-6">{children}</div>
            </AlertProvider>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
