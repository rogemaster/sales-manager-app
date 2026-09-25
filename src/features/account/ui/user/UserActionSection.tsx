'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Trash2 } from 'lucide-react';
import { selectedUsersAtom } from '@/features/account/store/userSearch.store';
import { useDeleteUsers } from '@/features/account/api/useDeleteUsers';
import { useApproveUsers } from '@/features/account/api/useApproveUsers';
import { usePermission } from '@/features/auth/hook/usePermission';
import { useAlert } from '@/hooks/useAlert';
import { getErrorMessage } from '@/shared/utils/errorMessage';

export const UserActionSection = () => {
  const [selectedUsers, setSelectedUsers] = useAtom(selectedUsersAtom);
  const { mutate: deleteUsers, isPending: isDeleting } = useDeleteUsers();
  const { mutate: approveUsers, isPending: isApproving } = useApproveUsers();
  const { showAlert } = useAlert();
  const router = useRouter();

  const canRegister = usePermission('user.create');
  const canApprove = usePermission('user.approve');
  const canDelete = usePermission('user.delete');

  if (!canRegister && !canApprove && !canDelete) return null;

  const handleApprove = () => {
    if (selectedUsers.length === 0) {
      showAlert({ message: '승인할 사용자를 선택해주세요.', type: 'warning' });
      return;
    }

    const snapshotIds = [...selectedUsers];
    approveUsers(snapshotIds, {
      onSuccess: ({ approvedCount }) => {
        setSelectedUsers([]);
        // 이미 활성인 사용자는 서버가 건너뛴다 — 실제로 승인된 인원만 알린다.
        if (approvedCount === 0) {
          showAlert({ message: '승인 대기 중인 사용자가 없습니다.', type: 'info' });
          return;
        }
        showAlert({ message: `${approvedCount}명의 사용자가 승인되었습니다.`, type: 'success' });
      },
      onError: (error) => {
        showAlert({
          message: getErrorMessage(error, '사용자 승인에 실패했습니다.'),
          type: 'error',
        });
      },
    });
  };

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
          // onError가 없으면 서버가 거절해도 화면에 아무 변화가 없어 삭제된 것처럼 보인다.
          onError: (error) => {
            showAlert({
              message: getErrorMessage(error, '사용자 삭제에 실패했습니다.'),
              type: 'error',
            });
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
      {canApprove && (
        <Button variant="outline" size="sm" onClick={handleApprove} disabled={isApproving}>
          <UserCheck className="h-4 w-4 mr-2" />
          승인
        </Button>
      )}
      {canDelete && (
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </Button>
      )}
    </div>
  );
};
