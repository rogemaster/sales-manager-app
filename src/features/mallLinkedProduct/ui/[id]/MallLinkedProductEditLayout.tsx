'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { getShoppingMallName } from '@/utils/shoppingMallGenerator';
import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting, ShoppingSettingFormValues } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { buildMallSettingsPayload } from '@/features/shoppingSetting/util/buildMallSettingsPayload';
import { ProductBasicinfo } from '@/features/products/ui/components/form/ProductBasicInfo';
import { ProductPriceAndQuantityInfo } from '@/features/products/ui/components/form/ProductPriceAndQuantityInfo';
import { ProductComplianceSection } from '@/features/products/ui/components/form/ProductComplianceSection';
import { ProductBrandModelSection } from '@/features/products/ui/components/form/ProductBrandModelSection';
import { ProductOptionSection } from '@/features/products/ui/components/options/ProductOptionSection';
import { ProductMainImageInfo } from '@/features/products/ui/components/form/ProductMainImageInfo';
import { ProductDetailInfo } from '@/features/products/ui/components/form/ProductDetailInfo';
import { ProductInformationDisclosureSection } from '@/features/products/ui/components/productDisclosure/ProductInformationDisclosureSection';
import { ShoppingSettingBasicInfoSection } from '@/features/shoppingSetting/ui/components/form/ShoppingSettingBasicInfoSection';
import { ShoppingSettingAddressSection } from '@/features/shoppingSetting/ui/components/form/ShoppingSettingAddressSection';
import { ShoppingSettingMallInfoSection } from '@/features/shoppingSetting/ui/components/form/ShoppingSettingMallInfoSection';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { useGetMallLinkedProduct } from '../../api/useGetMallLinkedProduct';
import { MallLinkedProductSnapshots, useUpdateMallLinkedProduct } from '../../api/useUpdateMallLinkedProduct';
import { useResendMallLinkedProducts } from '../../api/useResendMallLinkedProducts';
import { MallLinkedProductInfoCard } from './MallLinkedProductInfoCard';

type Props = {
  id: string;
};

const LIST_PATH = '/shopping/linked-products';

export const MallLinkedProductEditLayout = ({ id }: Props) => {
  const router = useRouter();
  const { showAlert } = useAlert();

  const { data: linked, isPending } = useGetMallLinkedProduct(id);
  const { mutateAsync: save, isPending: isSaving } = useUpdateMallLinkedProduct(id);
  const { mutateAsync: resend, isPending: isResending } = useResendMallLinkedProducts();

  // 상품 폼과 설정 폼을 따로 둔다. 두 폼의 값 타입이 다르고, 기존 섹션 컴포넌트들이 register('name') 같은 flat 경로를 쓰고 있어 하나로 합치려면 전 섹션을 고쳐야 한다.
  const productForm = useForm<Product>();
  const settingForm = useForm<ShoppingSettingFormValues>();

  useEffect(() => {
    if (!linked) return;
    productForm.reset(linked.productSnapshot);
    settingForm.reset(linked.settingSnapshot);
  }, [linked, productForm, settingForm]);

  const goList = () => router.push(LIST_PATH);

  const buildSnapshots = (record: MallLinkedProduct): MallLinkedProductSnapshots => {
    const settingValues = settingForm.getValues();
    const { id: settingId, ownerId: settingOwnerId, mallAccountId, mallId } = record.settingSnapshot;
    const mallCode = record.mallCode;

    let mallSettings: ShoppingSetting['mallSettings'];
    if (mallCode === 'NSST') {
      mallSettings = buildMallSettingsPayload('NSST', settingValues.mallSettings);
    } else if (mallCode === 'KAKAOS') {
      mallSettings = buildMallSettingsPayload('KAKAOS', settingValues.mallSettings);
    } else {
      mallSettings = undefined;
    }

    return {
      productSnapshot: productForm.getValues(),
      settingSnapshot: {
        ...settingValues,
        id: settingId,
        ownerId: settingOwnerId,
        mallAccountId,
        mallId,
        mallCode,
        mallSettings,
      } as ShoppingSetting,
    };
  };

  // 한쪽 폼만 통과한 상태로 저장하면 상품은 저장되고 설정은 안 된 반쪽 상태가 된다.
  const validateBothForms = async () => {
    const [isProductValid, isSettingValid] = await Promise.all([productForm.trigger(), settingForm.trigger()]);
    return isProductValid && isSettingValid;
  };

  const handleSave = async () => {
    if (!linked || !(await validateBothForms())) return;

    try {
      await save(buildSnapshots(linked));
      showAlert({ message: '저장되었습니다.', type: 'success', onConfirm: goList });
    } catch {
      showAlert({ message: '저장 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
    }
  };

  const handleSaveAndResend = async () => {
    if (!linked || !(await validateBothForms())) return;

    try {
      await save(buildSnapshots(linked));
    } catch {
      // 저장이 실패하면 전송하지 않는다. 고치지 못한 값을 몰로 보내는 셈이 되기 때문이다.
      showAlert({ message: '저장 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
      return;
    }

    try {
      const { successCount } = await resend([id]);
      if (successCount === 1) {
        showAlert({ message: '저장 후 쇼핑몰로 전송되었습니다.', type: 'success', onConfirm: goList });
        return;
      }
      // 저장은 됐다는 사실을 반드시 함께 알린다. 안 그러면 사용자가 같은 수정을 다시 하게 된다.
      showAlert({
        message: '저장은 완료되었으나 전송에 실패했습니다. 목록에서 실패 사유를 확인해주세요.',
        type: 'warning',
        onConfirm: goList,
      });
    } catch {
      showAlert({
        message: '저장은 완료되었으나 전송 중 오류가 발생했습니다. 목록에서 다시 시도해주세요.',
        type: 'warning',
        onConfirm: goList,
      });
    }
  };

  if (isPending) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  if (!linked) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        연동 데이터를 찾을 수 없습니다.
      </div>
    );
  }

  const isBusy = isSaving || isResending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 연동 상품 수정</h1>
        <p className="text-muted-foreground">
          {getShoppingMallName(linked.mallCode)} · {linked.settingSnapshot.nickname}
        </p>
      </div>

      <MallLinkedProductInfoCard linked={linked} />

      <FormProvider {...productForm}>
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductBasicinfo />
            <ProductPriceAndQuantityInfo />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductBrandModelSection />
            <ProductComplianceSection />
          </div>
          <ProductOptionSection />
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductMainImageInfo />
            <ProductDetailInfo />
          </div>
          <ProductInformationDisclosureSection />
        </div>
      </FormProvider>

      <FormProvider {...settingForm}>
        <div className="space-y-6">
          <ShoppingSettingBasicInfoSection />
          <ShoppingSettingAddressSection />
          <ShoppingSettingMallInfoSection />
        </div>
      </FormProvider>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={goList} disabled={isBusy}>
          취소
        </Button>
        <Button type="button" variant="outline" onClick={handleSave} disabled={isBusy}>
          저장
        </Button>
        <Button type="button" onClick={handleSaveAndResend} disabled={isBusy}>
          저장 후 재전송
        </Button>
      </div>
    </div>
  );
};
