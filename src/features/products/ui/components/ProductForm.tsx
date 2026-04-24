'use client';

import { useRouter } from 'next/router';
import { ProductCreateBasicinfo } from '../create/components/ProductBasicInfo';
import { ProductPriceAndQuantityInfo } from '../create/components/ProductPriceAndQuantityInfo';
import { ProductOptionSection } from '../create/options/ProductOptionSection';
import { ProductMainImageInfo } from '../create/components/ProductMainImageInfo';
import { ProductDetailInfo } from '../create/components/ProductDetailInfo';
import { ProductInformationDisclosureSection } from '../create/productDisclosure/ProductInformationDisclosureSection';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export const ProductForm = () => {
  const router = useRouter();
  const onBack = () => {
    router.back();
  };

  return (
    <>
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
    </>
  );
};
