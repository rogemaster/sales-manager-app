'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { idAtom } from '@/features/auth/store/auth.store';
import { usePermission } from '@/features/auth/hook/usePermission';
import { Permission } from '@/shared/utils/permission';

interface PermissionGateProps {
  permission: Permission;
  backHref: string;
  children: ReactNode;
}

export const PermissionGate = ({ permission, backHref, children }: PermissionGateProps) => {
  const router = useRouter();
  const userId = useAtomValue(idAtom);
  const allowed = usePermission(permission);

  // 세션을 읽기 전에는 gradeAtom이 초기값(operator)이라 판정하면 누구에게나 "권한 없음"이 보인다.
  if (!userId) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  if (!allowed) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>이 작업을 할 권한이 없습니다.</p>
        <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
          목록으로
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
