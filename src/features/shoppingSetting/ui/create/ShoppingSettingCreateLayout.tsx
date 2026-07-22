'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { useAlert } from '@/hooks/useAlert';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { useCreateShoppingSetting } from '@/features/shoppingSetting/api/useCreateShoppingSetting';
import {
  ShoppingSettingFormValues,
  CreateShoppingSettingBody,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { buildMallSettingsPayload } from '@/features/shoppingSetting/util/buildMallSettingsPayload';
import { ShoppingSettingForm } from '../components/ShoppingSettingForm';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const ShoppingSettingCreateLayout = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mallCode = searchParams.get('mallCode') as ShoppingMalls | null;
  const mallId = searchParams.get('mallId');
  const { showAlert } = useAlert();

  const { data: accounts, isLoading: isAccountsLoading } = useGetAvailableMallAccounts();
  const { mutate: createSetting, isPending } = useCreateShoppingSetting();

  const formData = useForm<ShoppingSettingFormValues>();
  const matchedAccount = accounts?.find((account) => account.mallCode === mallCode && account.mallId === mallId);

  useEffect(() => {
    if (matchedAccount) {
      formData.reset({
        mallAccountId: matchedAccount.id,
        mallCode: matchedAccount.mallCode,
        mallId: matchedAccount.mallId,
        isActive: true,
      });
    }
  }, [matchedAccount, formData]);

  useEffect(() => {
    if (!isAccountsLoading && accounts && !matchedAccount) {
      showAlert({
        message: '잘못된 접근입니다.',
        type: 'error',
        onConfirm: () => router.push('/shopping/settings'),
      });
    }
  }, [isAccountsLoading, accounts, matchedAccount, router, showAlert]);

  const onSubmit = (data: ShoppingSettingFormValues) => {
    if (!matchedAccount) return;
    const common = {
      mallAccountId: matchedAccount.id,
      mallId: matchedAccount.mallId,
      nickname: data.nickname,
      isActive: true as const,
      productCondition: data.productCondition,
      salesPeriod: data.salesPeriod,
      shippingAddress: data.shippingAddress,
      returnAddress: data.returnAddress,
    };
    let body: CreateShoppingSettingBody;
    if (matchedAccount.mallCode === 'NSST') {
      body = { ...common, mallCode: 'NSST', mallSettings: buildMallSettingsPayload('NSST', data.mallSettings) };
    } else if (matchedAccount.mallCode === 'KAKAOS') {
      body = { ...common, mallCode: 'KAKAOS', mallSettings: buildMallSettingsPayload('KAKAOS', data.mallSettings) };
    } else {
      body = { ...common, mallCode: matchedAccount.mallCode };
    }
    createSetting(body, {
      onSuccess: () => {
        showAlert({
          message: '설정이 등록되었습니다.',
          type: 'success',
          onConfirm: () => router.push('/shopping/settings'),
        });
      },
    });
  };

  if (isAccountsLoading || !matchedAccount) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 정보설정 등록</h1>
        <p className="text-muted-foreground">
          {getMallName(matchedAccount.mallCode)} · {matchedAccount.mallId}
        </p>
      </div>
      <FormProvider {...formData}>
        <form onSubmit={formData.handleSubmit(onSubmit)}>
          <ShoppingSettingForm submitLabel="등록" isSubmitting={isPending} />
        </form>
      </FormProvider>
    </div>
  );
};
