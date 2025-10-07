'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { Product } from '../../types/ProductTypes';
import { ProductCreateBasicinfo } from './components/ProductBasicInfo';
import { ProductPriceAndQuantityInfo } from './components/ProductPriceAndQuantityInfo';
import { ProductOptionSection } from './options/ProductOptionSection';
import { ProductMainImageInfo } from './components/ProductMainImageInfo';
import { ProductDetailInfo } from './components/ProductDetailInfo';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { ProductInformationDisclosureSection } from './productDisclosure/ProductInformationDisclosureSection';

export const ProductCreateLayout = () => {
  const formData = useForm<Product>();
  const router = useRouter();

  const onBack = () => {
    router.back();
  };

  const onSubmit: SubmitHandler<Product> = () => {
    console.log('상품등록 데이터:: ');
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
            <ProductCreateBasicinfo />
            {/* 가격 및 수량 정보 */}
            <ProductPriceAndQuantityInfo />
          </div>

          {/* 옵션 정보 및 옵션 조합 관리 (섹션 내부 포함) */}
          <ProductOptionSection />

          {/* 이미지 및 상세 정보 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 메인 이미지 */}
            <ProductMainImageInfo />
            {/* 상품 상세 설명 */}
            <ProductDetailInfo />
          </div>

          {/* 상품정보고시 */}
          <ProductInformationDisclosureSection />

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onBack}>
              취소
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              상품 등록
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
