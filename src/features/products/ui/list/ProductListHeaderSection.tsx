'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const ProductHeaderSection = () => {
  const router = useRouter();

  const handleRouter = () => {
    router.push('/products/create');
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">상품 목록</h1>
        <p className="text-muted-foreground">등록된 상품을 관리하세요.</p>
      </div>
      <Button className="cursor-pointer" onClick={handleRouter}>
        <Plus className="h-4 w-4 mr-2" />
        상품 등록
      </Button>
    </div>
  );
};
