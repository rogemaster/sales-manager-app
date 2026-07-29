import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { Product } from '@/features/products/types/product.types';
import { MallRegistrationTable } from './components/MallRegistrationTable';

type Props = {
  products: Product[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
};

export const MallRegistrationTableSection = ({
  products,
  total,
  totalPages,
  currentPage,
  onChangePage,
  isLoading,
}: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">전체 {isLoading ? '-' : total}건</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <MallRegistrationTable products={products} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
