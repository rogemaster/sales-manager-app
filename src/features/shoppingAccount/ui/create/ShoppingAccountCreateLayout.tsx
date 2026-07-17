'use client';

import { useRouter } from 'next/navigation';
import { useCreateShoppingAccount } from '@/features/shoppingAccount/api/useCreateShoppingAccount';
import { CreateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { ShoppingAccountForm, ShoppingAccountFormData } from '../form/ShoppingAccountForm';
import { useAlert } from '@/hooks/useAlert';

export const ShoppingAccountCreateLayout = () => {
  const router = useRouter();
  const { mutate: createAccount, isPending } = useCreateShoppingAccount();
  const { showAlert } = useAlert();

  const handleSubmit = (data: ShoppingAccountFormData) => {
    const body: CreateShoppingAccountBody = {
      mallCode: data.mallCode,
      mallId: data.mallId,
      password: data.password,
      isActive: data.isActive,
      nickname: data.nickname ?? '',
      managerMd: data.managerMd,
      phone: data.phone ?? '',
      email: data.email ?? '',
      domain: data.domain ?? '',
      category: data.category,
      apiKey: data.apiKey ?? '',
    };
    createAccount(body, {
      onSuccess: () => {
        showAlert({
          message: '계정이 등록되었습니다.',
          type: 'success',
          onConfirm: () => router.push('/shopping/accounts'),
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">계정 등록</h1>
          <p className="text-muted-foreground">새로운 쇼핑몰 계정을 등록하세요.</p>
        </div>
      </div>
      <ShoppingAccountForm mode="create" onSubmit={handleSubmit} isSubmitting={isPending} />
    </div>
  );
};
