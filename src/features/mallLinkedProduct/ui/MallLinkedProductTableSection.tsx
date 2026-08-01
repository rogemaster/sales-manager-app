import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MallLinkedProductTable } from './components/MallLinkedProductTable';

type Props = {
  linkedProducts: MallLinkedProduct[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
};

export const MallLinkedProductTableSection = ({
  linkedProducts,
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
            <MallLinkedProductTable linkedProducts={linkedProducts} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
