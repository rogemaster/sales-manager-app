import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProductTableHeader } from '@/features/products/ui/list/components/productTable/ProductTableHeader';
import { ProductTableBody } from './components/productTable/ProductTableBody';
import { TablePagination } from '@/components/common/TablePagination';
import { Product } from '../../types/product.types';

const PAGE_SIZE = 10;

type Props = {
  products: Product[];
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
  searchCount: number;
};

export const ProductListTableSection = ({ products, currentPage, onChangePage, isLoading, searchCount }: Props) => {
  const totalPages = Math.ceil(products.length / PAGE_SIZE) || 1;
  const paginatedProducts = products.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <ProductTableHeader total={isLoading ? undefined : products.length} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <ProductTableBody key={searchCount} products={paginatedProducts} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
