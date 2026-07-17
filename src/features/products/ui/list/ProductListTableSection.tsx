import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProductTableHeader } from '@/features/products/ui/list/components/productTable/ProductTableHeader';
import { ProductTableBody } from './components/productTable/ProductTableBody';
import { TablePagination } from '@/components/common/TablePagination';
import { Product } from '../../types/product.types';

type Props = {
  products: Product[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
  searchCount: number;
};

export const ProductListTableSection = ({
  products,
  total,
  totalPages,
  currentPage,
  onChangePage,
  isLoading,
  searchCount,
}: Props) => {
  return (
    <Card>
      <CardHeader>
        <ProductTableHeader total={isLoading ? undefined : total} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <ProductTableBody key={searchCount} products={products} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
