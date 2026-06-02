'use client';

import { Plus, List, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export const QuickActions = () => {
  const router = useRouter();

  const actions = [
    { label: '상품 등록', Icon: Plus, onClick: () => router.push('/products/create'), variant: 'default' as const },
    { label: '상품 목록', Icon: List, onClick: () => router.push('/products/list'), variant: 'outline' as const },
    { label: '주문 목록', Icon: ClipboardList, onClick: () => router.push('/order/list'), variant: 'outline' as const },
  ];

  return (
    <div className="flex gap-3">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          className="flex-1 h-10 gap-2"
          onClick={action.onClick}
        >
          <action.Icon className="h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
};
