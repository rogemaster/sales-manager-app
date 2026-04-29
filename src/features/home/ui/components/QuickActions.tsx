'use client';

import { Plus, List, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export const QuickActions = () => {
  const router = useRouter();

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-base font-semibold mb-1">빠른 작업</h2>
      <hr className="mb-4" />
      <div className="flex flex-col gap-3">
        <Button
          className="w-full h-12 text-base font-semibold bg-[#2196F3] hover:bg-[#1976D2] text-white"
          onClick={() => router.push('/products/create')}
        >
          <Plus className="mr-2 h-5 w-5" />
          상품 등록
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-base font-semibold"
          onClick={() => router.push('/products/list')}
        >
          <List className="mr-2 h-5 w-5" />
          상품 목록 보기
        </Button>
        <Button variant="outline" className="w-full h-12 text-base font-semibold">
          <Tag className="mr-2 h-5 w-5" />
          판매중 상품 관리
        </Button>
      </div>
    </div>
  );
};
