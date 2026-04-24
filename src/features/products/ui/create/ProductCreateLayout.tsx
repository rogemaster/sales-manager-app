'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { Product } from '../../types/product.types';
import { useMutation } from '@tanstack/react-query';
import { createProduct } from '../../api/createProduct';
import { useAlert } from '@/hooks/useAlert';
import { ProductForm } from '../components/ProductForm';

export const ProductCreateLayout = () => {
  const { showAlert } = useAlert();
  const formData = useForm<Product>();
  const router = useRouter();

  const { mutate } = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      router.push('/products/list');
    },
    onError: () => {
      showAlert({
        type: 'error',
        message: '상품등록 실패',
      });
    },
  });

  const onSubmit: SubmitHandler<Product> = () => {
    if (formData.getValues('mainImage') == null) {
      formData.setError('mainImage', {
        type: 'manual',
        message: '메인이미지를 선택해 주세요.',
      });
    } else {
      mutate(formData.getValues());
    }
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
          <ProductForm />
        </form>
      </FormProvider>
    </div>
  );
};
