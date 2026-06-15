'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { gradeAtom } from '@/features/auth/store/auth.store';
import { selectedAccountsAtom } from '@/features/shoppingAccount/store/search.store';
import { useDeleteShoppingAccounts } from '@/features/shoppingAccount/api/useDeleteShoppingAccounts';
import { useUpdateShoppingAccountsStatus } from '@/features/shoppingAccount/api/useUpdateShoppingAccountsStatus';
import { ACCOUNT_STATUS_OPTIONS } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { useAlert } from '@/hooks/useAlert';

export const ShoppingAccountActionSection = () => {
  const grade = useAtomValue(gradeAtom);
  const [selectedAccounts, setSelectedAccounts] = useAtom(selectedAccountsAtom);
  const { mutate: deleteAccounts, isPending: isDeleting } = useDeleteShoppingAccounts();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateShoppingAccountsStatus();
  const { showAlert } = useAlert();
  const [statusValue, setStatusValue] = useState<string>('true');

  const canDelete = grade === 'super_admin';
  const canChangeStatus = grade === 'super_admin' || grade === 'admin';

  if (!canDelete && !canChangeStatus) return null;

  const handleDelete = () => {
    if (selectedAccounts.length === 0) {
      showAlert({ message: '삭제할 계정을 선택해주세요.', type: 'warning' });
      return;
    }
    const snapshotIds = [...selectedAccounts];
    const count = snapshotIds.length;
    showAlert({
      title: '계정 삭제',
      message: `선택한 ${count}개의 계정을 삭제하시겠습니까?`,
      showCancel: true,
      onConfirm: () => {
        deleteAccounts(snapshotIds, {
          onSuccess: () => {
            setSelectedAccounts([]);
            showAlert({ message: `${count}개의 계정이 삭제되었습니다.`, type: 'success' });
          },
        });
      },
    });
  };

  const handleChangeStatus = () => {
    if (selectedAccounts.length === 0) {
      showAlert({ message: '변경할 계정을 선택해주세요.', type: 'warning' });
      return;
    }
    const snapshotIds = [...selectedAccounts];
    updateStatus(
      { ids: snapshotIds, isActive: statusValue === 'true' },
      {
        onSuccess: () => {
          setSelectedAccounts([]);
          showAlert({ message: '사용여부가 변경되었습니다.', type: 'success' });
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-muted-foreground min-w-16">
        선택 <span className="font-medium text-foreground">{selectedAccounts.length}</span>개
      </span>
      {canDelete && (
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
          <Trash2 className="h-4 w-4 mr-2" />
          계정삭제
        </Button>
      )}
      {canChangeStatus && (
        <>
          <Select value={statusValue} onValueChange={setStatusValue}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleChangeStatus} disabled={isUpdating}>
            사용변경
          </Button>
        </>
      )}
    </div>
  );
};
