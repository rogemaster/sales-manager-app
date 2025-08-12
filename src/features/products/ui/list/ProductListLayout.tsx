import { ProductHeaderSection, ProductSearchFilterSection, ProductTableSection } from '@/features/products/ui/list';

export const ProductListLayout = () => {
  return (
    <>
      {/* 상품 목록 헤더 */}
      <ProductHeaderSection />
      {/* 검색 및 필터 */}
      <ProductSearchFilterSection />
      {/* 상품 목록 테이블 */}
      <ProductTableSection />
    </>
  );
};
