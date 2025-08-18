import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductSearchInput } from '@/features/products/ui/list/components/productSearchFilter/SearchInput';
import { ProductSearchButton } from '@/features/products/ui/list/components/productSearchFilter/SearchButton';
import { ProductSearchDate } from '@/features/products/ui/list/components/productSearchFilter/DateFilter';
import { ProductSearchSaleState } from '@/features/products/ui/list/components/productSearchFilter/SaleStateFilter';
import { ProductSearchCategory } from '@/features/products/ui/list/components/productSearchFilter/CategoryFilter';

export const ProductSearchFilterSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>검색 및 필터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* 왼쪽: 필터 항목들 */}
          <div className="flex-1 space-y-4">
            {/* 검색 일자 */}
            <ProductSearchDate />
            {/* 판매 상태 */}
            <ProductSearchSaleState />
            {/* 카테고리 */}
            <ProductSearchCategory />
            {/* 검색어 */}
            <ProductSearchInput />
          </div>
          {/* 오른쪽: 검색 버튼 */}
          <ProductSearchButton />
        </div>
      </CardContent>
    </Card>
  )
}