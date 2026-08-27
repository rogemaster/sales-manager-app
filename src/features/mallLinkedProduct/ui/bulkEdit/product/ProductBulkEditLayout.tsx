'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { Product } from '@/features/products/types/product.types';
import { ProductOptionSection } from '@/features/products/ui/components/options/ProductOptionSection';
import { ProductInformationDisclosureSection } from '@/features/products/ui/components/productDisclosure/ProductInformationDisclosureSection';
import { selectedLinkedIdsAtom } from '@/features/mallLinkedProduct/store/selection.store';
import { useBulkUpdateMallLinkedProducts } from '@/features/mallLinkedProduct/api/useBulkUpdateMallLinkedProducts';
import {
  PRODUCT_BULK_EDIT_GROUPS,
  ProductBulkEditChecked,
  ProductBulkEditGroupKey,
  REQUIRED_BULK_EDIT_GROUPS,
} from '@/features/mallLinkedProduct/constant/productBulkEdit.constants';
import {
  buildProductBulkPatch,
  collectCheckedFieldNames,
  collectClearKeys,
} from '@/features/mallLinkedProduct/util/buildProductBulkPatch';
import { BulkEditProvider } from './BulkEditFieldWrapper';
import { BulkEditSectionWrapper } from './BulkEditSectionWrapper';
import { BulkBasicInfoSection } from './sections/BulkBasicInfoSection';
import { BulkPriceQuantitySection } from './sections/BulkPriceQuantitySection';
import { BulkBrandModelSection } from './sections/BulkBrandModelSection';
import { BulkComplianceSection } from './sections/BulkComplianceSection';
import { BulkDetailInfoSection } from './sections/BulkDetailInfoSection';

const LIST_PATH = '/shopping/linked-products';

export const ProductBulkEditLayout = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const selectedLinkedIds = useAtomValue(selectedLinkedIdsAtom);
  const { mutate: bulkUpdate, isPending } = useBulkUpdateMallLinkedProducts();

  // 값은 Product 그대로의 flat 폼으로 둔다 — 기존 옵션·정보고시 섹션이 이 구조를 전제로 만들어져 있다.
  const valuesForm = useForm<Product>();
  const [checked, setChecked] = useState<ProductBulkEditChecked>({});

  const goList = () => router.push(LIST_PATH);

  // 선택은 전역 Jotai에 있어 라우트 이동은 견디지만 새로고침에는 사라진다.
  useEffect(() => {
    if (selectedLinkedIds.length === 0) {
      // 이동은 alert의 onConfirm이 아니라 여기서 한다 — ESC로 alert를 닫아도
      // '선택 0건' 폼에 남아 ids: []를 전송하는 경로가 생기면 안 된다.
      showAlert({ message: '선택 정보가 없습니다. 목록에서 다시 선택해 주세요.', type: 'warning' });
      router.replace(LIST_PATH);
    }
    // 진입 시 1회만 판정한다. 이후 선택이 바뀌는 경로는 이 화면에 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (group: ProductBulkEditGroupKey, next: boolean) => setChecked((prev) => ({ ...prev, [group]: next }));

  const handleSubmit = async () => {
    const checkedFieldNames = collectCheckedFieldNames(checked);

    if (checkedFieldNames.length === 0) {
      showAlert({ message: '수정할 항목을 체크해주세요.', type: 'warning' });
      return;
    }

    // handleSubmit을 쓰지 않는다 — 재사용하는 정보고시 섹션에 required 규칙이 있어,
    // 전체 검증을 돌리면 체크하지 않은 정보고시 때문에 제출이 막힌다.
    if (!(await valuesForm.trigger(checkedFieldNames))) return;

    // 필수 필드가 undefined로 저장되면 목록·수정 화면이 곧바로 깨진다 (price.toLocaleString() 등).
    const values = valuesForm.getValues();
    const hasEmptyRequired = REQUIRED_BULK_EDIT_GROUPS.some(
      (group) =>
        checked[group] === true &&
        PRODUCT_BULK_EDIT_GROUPS[group].some((key) => values[key] === undefined || values[key] === ''),
    );
    if (hasEmptyRequired) {
      showAlert({ message: '체크한 필수 항목의 값을 입력해 주세요.', type: 'warning' });
      return;
    }

    const productSnapshot = buildProductBulkPatch(values, checked);
    const clearKeys = collectClearKeys(values, checked);

    // 체크만 하고 값을 하나도 건드리지 않은 경우 — 서버로 보내봐야 아무것도 바뀌지 않는데
    // successCount는 N으로 돌아와 "N건이 수정되었습니다"라고 거짓 보고하게 된다.
    if (Object.keys(productSnapshot).length === 0 && clearKeys.length === 0) {
      showAlert({ message: '체크한 항목의 값을 입력해 주세요.', type: 'warning' });
      return;
    }

    bulkUpdate(
      { ids: selectedLinkedIds, productSnapshot, clearKeys },
      {
        onSuccess: ({ totalCount, successCount, failCount }) => {
          // 선택은 유지한다 — 수정 직후 곧바로 '선택 재전송'을 누를 수 있어야 한다.
          if (failCount === 0) {
            showAlert({ message: `${successCount}건이 수정되었습니다.`, type: 'success', onConfirm: goList });
            return;
          }

          showAlert({
            message: `총 ${totalCount}건 중 ${successCount}건 수정, ${failCount}건 실패했습니다.`,
            type: 'warning',
            onConfirm: goList,
          });
        },
        onError: () => {
          showAlert({ message: '수정 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">상품정보 일괄수정</h1>
        <p className="text-muted-foreground">
          선택한 {selectedLinkedIds.length}건의 연동 상품 중, 체크한 항목만 입력한 값으로 바뀝니다.
        </p>
      </div>

      <BulkEditProvider value={{ checked, toggle }}>
        <FormProvider {...valuesForm}>
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <BulkBasicInfoSection />
              <BulkPriceQuantitySection />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <BulkBrandModelSection />
              <BulkComplianceSection />
            </div>

            {/* 옵션·정보고시는 기존 상품 폼 컴포넌트를 그대로 재사용하고 체크박스 카드로만 감싼다. */}
            <BulkEditSectionWrapper
              group="option"
              title="옵션"
              description="체크하면 선택한 연동 상품의 옵션 조합이 아래 값으로 통째 교체됩니다."
            >
              <ProductOptionSection />
            </BulkEditSectionWrapper>

            <BulkDetailInfoSection />

            <BulkEditSectionWrapper
              group="informationDisclosure"
              title="상품정보고시"
              description="체크하면 선택한 연동 상품의 고시 카테고리와 항목이 아래 값으로 통째 교체됩니다."
            >
              <ProductInformationDisclosureSection />
            </BulkEditSectionWrapper>
          </div>
        </FormProvider>
      </BulkEditProvider>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={goList} disabled={isPending}>
          취소
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          수정
        </Button>
      </div>
    </div>
  );
};
