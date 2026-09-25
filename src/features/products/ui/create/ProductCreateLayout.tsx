'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { ProductFormValues } from '../../types/product.types';
import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { createProduct } from '../../api/createProduct';
import { useAlert } from '@/hooks/useAlert';
import { getErrorMessage } from '@/shared/utils/errorMessage';
import { ProductForm } from '../components/ProductForm';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { resolveMainImageKey } from '@/shared/api/uploadImage';
import { useCustomerCodeAvailability } from '../hooks/useCustomerCodeAvailability';

export const ProductCreateLayout = () => {
  const { showAlert } = useAlert();
  // 원산지는 상품마다 달라 기본값을 두지 않는다.
  const formData = useForm<ProductFormValues>({
    defaultValues: {
      taxType: 'TAXABLE',
      adultProductType: 'GENERAL',
    },
  });
  const router = useRouter();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const ensureCustomerCodeAvailable = useCustomerCodeAvailability(formData);

  const { mutate } = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // 업로드는 제출 시점에만 일어난다. 파일만 고르고 이탈하면 R2에 아무것도 남지 않는다.
      const mainImage = await resolveMainImageKey(data.mainImage);
      return createProduct({ ...data, mainImage }, workspaceOwnerId);
    },
    onSuccess: () => {
      showAlert({
        type: 'success',
        message: '상품등록 완료',
        onConfirm: () => {
          router.push('/products/list');
        },
      });
    },
    // 이미지 업로드 단계는 인증·형식·용량·R2 설정 등 저장 실패와 별개의 원인으로 실패할 수 있다.
    // 메시지를 고정하면 이 둘을 구분할 수 없으므로, 서버가 준 메시지를 그대로 보여준다.
    onError: (error) => {
      showAlert({
        type: 'error',
        message: getErrorMessage(error, '상품등록 실패'),
      });
    },
  });

  // mainImage 필수는 ProductMainImageInfo가 useController로 등록해 handleSubmit이 막는다 — 화면별 수동 가드를 두지 않는다.
  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    if (!(await ensureCustomerCodeAvailable(data.customerCode))) return;
    mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">상품 등록</h1>
          <p className="text-muted-foreground">새로운 상품을 등록하세요.</p>
        </div>
      </div>
      <FormProvider {...formData}>
        <form onSubmit={formData.handleSubmit(onSubmit)} className="space-y-6">
          <ProductForm submitLabel="상품 등록" />
        </form>
      </FormProvider>
    </div>
  );
};
