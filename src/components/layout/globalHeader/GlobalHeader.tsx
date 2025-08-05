import { GlobalSearchInput } from '@/components/layout/globalHeader/GlobalSearchInput';
import { GlobalUserMenuButton } from '@/components/layout/globalHeader/GlobalUserMenuButton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';

export const GlobalHeader = () => {
  return (
    <header className="w-full h-16 border-b bg-background sticky top-0 z-10">
      <div className="flex h-16 items-center justify-between px-4">
        {/* 왼쪽: 로고 + 햄버거 버튼 */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="로고" width={32} height={32} className="rounded" />
            <span className="font-semibold text-lg hidden sm:block">SMP</span>
          </div>
        </div>
        {/* 가운데: 검색바 */}
        <GlobalSearchInput />
        {/* 오른쪽 사용자 메뉴 버튼 */}
        <GlobalUserMenuButton />
      </div>
    </header>
  );
};
