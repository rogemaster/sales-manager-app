'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { useAlert } from '@/hooks/useAlert';
import { useGetShoppingSetting } from '@/features/shoppingSetting/api/useGetShoppingSetting';
import { useUpdateShoppingSetting } from '@/features/shoppingSetting/api/useUpdateShoppingSetting';
import { ShoppingSetting, UpdateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { ShoppingSettingForm } from '../components/ShoppingSettingForm';

interface Props {
  id: string;
}

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const ShoppingSettingModifyLayout = ({ id }: Props) => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { data: setting, isLoading } = useGetShoppingSetting(id);
  const { mutate: updateSetting, isPending } = useUpdateShoppingSetting(id);

  const formData = useForm<ShoppingSetting>();

  useEffect(() => {
    if (setting) {
      formData.reset(setting);
    }
  }, [setting, formData]);

  const onSubmit = (data: ShoppingSetting) => {
    const body: UpdateShoppingSettingBody = {
      nickname: data.nickname,
      productCondition: data.productCondition,
      salesPeriod: data.salesPeriod,
      shippingAddress: data.shippingAddress,
      returnAddress: data.returnAddress,
    };
    updateSetting(body, {
      onSuccess: () => {
        showAlert({
          message: '설정이 수정되었습니다.',
          type: 'success',
          onConfirm: () => router.push('/shopping/settings'),
        });
      },
    });
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  if (!setting) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">설정을 찾을 수 없습니다.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 정보설정 수정</h1>
        <p className="text-muted-foreground">
          {getMallName(setting.mallCode)} · {setting.mallId}
        </p>
      </div>
      <FormProvider {...formData}>
        <form onSubmit={formData.handleSubmit(onSubmit)}>
          <ShoppingSettingForm submitLabel="저장" isSubmitting={isPending} />
        </form>
      </FormProvider>
    </div>
  );
};
