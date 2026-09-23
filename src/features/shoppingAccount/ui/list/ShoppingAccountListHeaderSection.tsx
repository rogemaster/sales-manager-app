'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePermission } from '@/features/auth/hook/usePermission';

export const ShoppingAccountListHeaderSection = () => {
  const router = useRouter();
  const canRegister = usePermission('shoppingAccount.create');

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 계정관리</h1>
        <p className="text-muted-foreground">외부 쇼핑 플랫폼 연동 계정을 관리하세요.</p>
      </div>
      {canRegister && (
        <Button onClick={() => router.push('/shopping/accounts/create')}>
          <Plus className="h-4 w-4 mr-2" />
          계정 등록
        </Button>
      )}
    </div>
  );
};
