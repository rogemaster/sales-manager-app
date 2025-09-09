'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { Product } from '../../types/ProductTypes';

export const ProductCreateLayout = () => {
  const formData = useForm<Product>();

  const onSubmit: SubmitHandler<Product> = (data) => {
    console.log('상품등록 데이터:: ', data);
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
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 기본 정보 */}

            {/* 가격 및 수량 정보 */}
          </div>

          {/* 옵션 정보 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 기본 옵션 */}

            {/* 추가 옵션 */}
          </div>

          {/* 옵션 조합 관리 */}

          {/* 이미지 및 상세 정보 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 메인 이미지 */}

            {/* 상품 상세 설명 */}
          </div>

          {/* 저장 버튼 */}
        </form>
      </FormProvider>
    </div>
  );
};
