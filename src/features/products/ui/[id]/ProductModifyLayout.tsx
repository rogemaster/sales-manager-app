'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { ProductForm } from '../components/ProductForm';
import { Product } from '../../types/product.types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getProduct } from '../../api/getProduct';
import { updateProduct } from '../../api/updateProduct';
import { useEffect } from 'react';
import { useAlert } from '@/hooks/useAlert';
import { useRouter } from 'next/navigation';

type Props = {
  productId: string;
};

export const ProductModifyLayout = ({ productId }: Props) => {
  const formData = useForm<Product>();
  const { showAlert } = useAlert();
  const router = useRouter();

  const { data: queryData, isSuccess } = useQuery({
    queryKey: ['productId', productId],
    queryFn: () => getProduct(productId),
  });

  const { mutate } = useMutation({
    mutationFn: (data: Product) => updateProduct(productId, data),
    onSuccess: () => {
      showAlert({
        type: 'success',
        message: '상품수정 완료',
        onConfirm: () => {
          router.push('/products/list');
        },
      });
    },
    onError: () => {
      showAlert({
        type: 'error',
        message: '상품수정 실패',
      });
    },
  });

  useEffect(() => {
    if (isSuccess && queryData) {
      console.log('상품정보', queryData);
      formData.reset(queryData);
    }
  }, [isSuccess, queryData]);

  const onSubmit: SubmitHandler<Product> = (data) => {
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
            <ProductForm />
          </form>
        </FormProvider>
      )}
    </div>
  );
};
