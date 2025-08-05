import { ProductHeaderSection, ProductSearchFilterSection, ProductTableSection } from '@/features/products/ui/list';

export const ProductListLayout = () => {
  return (
    <div className="max-w-[80%] mx-auto space-y-6">
      {/* 상품 목록 헤더 */}
      <ProductHeaderSection />
      {/* 검색 및 필터 */}
      <ProductSearchFilterSection />
      {/* 상품 목록 테이블 */}
      <ProductTableSection />
    </div>
  )
}