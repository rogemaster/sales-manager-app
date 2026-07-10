import { Suspense } from 'react';
import { ShoppingSettingCreateLayout } from '@/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout';

export default function ShoppingSettingCreatePage() {
  return (
    // useSearchParams를 쓰는 클라이언트 컴포넌트는 Next.js 빌드 요구사항상 Suspense로 감싸야 한다
    <Suspense
      fallback={<div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>}
    >
      <ShoppingSettingCreateLayout />
    </Suspense>
  );
}
