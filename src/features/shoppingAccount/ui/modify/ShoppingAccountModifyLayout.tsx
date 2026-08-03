'use client';

import { useRouter } from 'next/navigation';
import { useGetShoppingAccount } from '@/features/shoppingAccount/api/useGetShoppingAccount';
import { useUpdateShoppingAccount } from '@/features/shoppingAccount/api/useUpdateShoppingAccount';
import { UpdateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { ShoppingAccountForm, ShoppingAccountFormData } from '../form/ShoppingAccountForm';
import { useAlert } from '@/hooks/useAlert';

interface Props {
  id: string;
}

export const ShoppingAccountModifyLayout = ({ id }: Props) => {
  const router = useRouter();
  // workspaceOwnerId는 세션 하이드레이션 전 ''이라 useGetShoppingAccount가 enabled:false로 시작한다.
  // TanStack Query v5에서 disabled 쿼리는 status:'pending' + fetchStatus:'idle'이라 isLoading(=isPending && isFetching)이
  // false가 되어, isLoading으로 분기하면 하이드레이션 완료 전 "찾을 수 없습니다"가 먼저 노출된다. isPending을 써야
  // "데이터가 아직 없다"(로딩 중이든 비활성 상태든)를 하나로 묶어 로딩 문구로 처리할 수 있다.
  const { data: account, isPending: isAccountPending } = useGetShoppingAccount(id);
  const { mutate: updateAccount, isPending } = useUpdateShoppingAccount(id);
  const { showAlert } = useAlert();

  const handleSubmit = (data: ShoppingAccountFormData) => {
    const body: UpdateShoppingAccountBody = {
      mallCode: data.mallCode,
      mallId: data.mallId,
      password: data.password,
      isActive: data.isActive,
      nickname: data.nickname ?? '',
      managerMd: data.managerMd,
      phone: data.phone ?? '',
      email: data.email ?? '',
      domain: data.domain,
      category: data.category,
      apiKey: data.apiKey,
    };
    updateAccount(body, {
      onSuccess: () => {
        showAlert({
          message: '계정이 수정되었습니다.',
          type: 'success',
          onConfirm: () => router.push('/shopping/accounts'),
        });
      },
    });
  };

  if (isAccountPending) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  if (!account) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">계정을 찾을 수 없습니다.</div>
    );
  }

  const defaultValues: ShoppingAccountFormData = {
    mallCode: account.mallCode,
    mallId: account.mallId,
    password: account.password,
    isActive: account.isActive,
    nickname: account.nickname,
    managerMd: account.managerMd,
    phone: account.phone,
    email: account.email,
    domain: account.domain,
    category: account.category,
    apiKey: account.apiKey,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">계정 수정</h1>
          <p className="text-muted-foreground">쇼핑몰 계정 정보를 수정하세요.</p>
        </div>
      </div>
      <ShoppingAccountForm mode="edit" defaultValues={defaultValues} onSubmit={handleSubmit} isSubmitting={isPending} />
    </div>
  );
};
