'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { useAlert } from '@/hooks/useAlert';
import { useGetShoppingSetting } from '@/features/shoppingSetting/api/useGetShoppingSetting';
import { useUpdateShoppingSetting } from '@/features/shoppingSetting/api/useUpdateShoppingSetting';
import {
  ShoppingSettingFormValues,
  UpdateShoppingSettingBody,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { buildMallSettingsPayload } from '@/features/shoppingSetting/util/buildMallSettingsPayload';
import { ShoppingSettingForm } from '../components/ShoppingSettingForm';

interface Props {
  id: string;
}

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const ShoppingSettingModifyLayout = ({ id }: Props) => {
  const router = useRouter();
  const { showAlert } = useAlert();
  // workspaceOwnerId는 세션 하이드레이션 전 ''이라 useGetShoppingSetting이 enabled:false로 시작한다.
  // TanStack Query v5에서 disabled 쿼리는 status:'pending' + fetchStatus:'idle'이라 isLoading(=isPending && isFetching)이
  // false가 되어, isLoading으로 분기하면 하이드레이션 완료 전 "찾을 수 없습니다"가 먼저 노출된다. isPending을 써야
  // "데이터가 아직 없다"(로딩 중이든 비활성 상태든)를 하나로 묶어 로딩 문구로 처리할 수 있다.
  const { data: setting, isPending: isSettingPending } = useGetShoppingSetting(id);
  const { mutate: updateSetting, isPending } = useUpdateShoppingSetting(id);

  const formData = useForm<ShoppingSettingFormValues>();

  useEffect(() => {
    if (setting) {
      formData.reset(setting);
    }
  }, [setting, formData]);

  const onSubmit = (data: ShoppingSettingFormValues) => {
    const common = {
      nickname: data.nickname,
      productCondition: data.productCondition,
      salesPeriod: data.salesPeriod,
      shippingAddress: data.shippingAddress,
      returnAddress: data.returnAddress,
    };
    let body: UpdateShoppingSettingBody;
    if (data.mallCode === 'NSST') {
      body = { ...common, mallSettings: buildMallSettingsPayload('NSST', data.mallSettings) };
    } else if (data.mallCode === 'KAKAOS') {
      body = { ...common, mallSettings: buildMallSettingsPayload('KAKAOS', data.mallSettings) };
    } else {
      body = common;
    }
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

  if (isSettingPending) {
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
