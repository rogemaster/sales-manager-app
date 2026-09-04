'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { ProductForm } from '../components/ProductForm';
import { ProductFormValues } from '../../types/product.types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getProduct } from '../../api/getProduct';
import { updateProduct } from '../../api/updateProduct';
import { useEffect } from 'react';
import { useAlert } from '@/hooks/useAlert';
import { useRouter } from 'next/navigation';
import { resolveMainImageKey } from '@/shared/api/uploadImage';

type Props = {
  productId: string;
};

export const ProductModifyLayout = ({ productId }: Props) => {
  const router = useRouter();

  const formData = useForm<ProductFormValues>();
  const { showAlert } = useAlert();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data: queryData, isSuccess } = useQuery({
    queryKey: ['productId', productId, workspaceOwnerId],
    queryFn: () => getProduct(productId, workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  const { mutate } = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const mainImage = await resolveMainImageKey(data.mainImage);
      return updateProduct(productId, { ...data, mainImage }, workspaceOwnerId);
    },
    onSuccess: () => {
      showAlert({
        type: 'success',
        message: '상품수정 완료',
        onConfirm: () => {
          router.push('/products/list');
        },
      });
    },
    onError: (error) => {
      showAlert({
        type: 'error',
        message: error instanceof Error && error.message ? error.message : '상품수정 실패',
      });
    },
  });

  useEffect(() => {
    if (isSuccess && queryData) {
      formData.reset(queryData);
    }
  }, [isSuccess, queryData]);

  // mainImage 필수는 ProductMainImageInfo가 useController로 등록해 handleSubmit이 막는다 — 화면별 수동 가드를 두지 않는다.
  const onSubmit: SubmitHandler<ProductFormValues> = (data) => {
    mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">상품 수정</h1>
          <p className="text-muted-foreground">상품을 수정하세요.</p>
        </div>
      </div>
      {formData && (
        <FormProvider {...formData}>
          <form onSubmit={formData.handleSubmit(onSubmit)} className="space-y-6">
            <ProductForm submitLabel="상품 수정" />
          </form>
        </FormProvider>
      )}
    </div>
  );
};
