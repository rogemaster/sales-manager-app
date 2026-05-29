'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserPlus, Trash2 } from 'lucide-react';
import { gradeAtom } from '@/features/auth/store/auth.store';
import { selectedUsersAtom } from '@/features/account/store/userSearch.store';
import { useDeleteUsers } from '@/features/account/api/useDeleteUsers';
import { useAlert } from '@/hooks/useAlert';

export const UserActionSection = () => {
  const grade = useAtomValue(gradeAtom);
  const [selectedUsers, setSelectedUsers] = useAtom(selectedUsersAtom);
  const { mutate: deleteUsers, isPending } = useDeleteUsers();
  const { showAlert } = useAlert();
  const router = useRouter();

  const canRegister = grade === 'super_admin' || grade === 'admin';
  const canDelete = grade === 'super_admin';

  const handleDelete = () => {
    if (selectedUsers.length === 0) {
      showAlert({ message: '삭제할 사용자를 선택해주세요.', type: 'warning' });
      return;
    }

    const snapshotIds = [...selectedUsers];
    const count = snapshotIds.length;

    showAlert({
      title: '사용자 삭제',
      message: `선택한 ${count}명의 사용자를 삭제하시겠습니까?`,
      showCancel: true,
      onConfirm: () => {
        deleteUsers(snapshotIds, {
          onSuccess: () => {
            setSelectedUsers([]);
            showAlert({ message: `${count}명의 사용자가 삭제되었습니다.`, type: 'success' });
          },
        });
      },
    });
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-muted-foreground min-w-16">
        선택 <span className="font-medium text-foreground">{selectedUsers.length}</span>명
      </span>
      {canRegister && (
        <Button variant="outline" size="sm" onClick={() => router.push('/account/user/create')}>
          <UserPlus className="h-4 w-4 mr-2" />
          사용자 등록
        </Button>
      )}
      {canDelete && (
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </Button>
      )}
    </div>
  );
};
