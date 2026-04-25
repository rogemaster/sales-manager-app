'use client';

import { useRouter } from 'next/navigation';
import { ProductBasicinfo } from './form/ProductBasicInfo';
import { ProductPriceAndQuantityInfo } from './form/ProductPriceAndQuantityInfo';
import { ProductOptionSection } from './options/ProductOptionSection';
import { ProductMainImageInfo } from './form/ProductMainImageInfo';
import { ProductDetailInfo } from './form/ProductDetailInfo';
import { ProductInformationDisclosureSection } from './productDisclosure/ProductInformationDisclosureSection';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Product } from '../../types/product.types';

export const ProductForm = () => {
  const router = useRouter();

  const { getValues } = useFormContext<Product>();

  const onBack = () => {
    router.back();
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 기본 정보 */}
        <ProductBasicinfo />
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
      <ProductInformationDisclosureSection infoKey={getValues('infomationDisclosure.key')} />

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
    </>
  );
};
