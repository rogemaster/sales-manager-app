'use client';

import { useAtom } from 'jotai';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { OrderListTableHeader } from './components/orderTable/OrderListTableHeader';
import { OrderListTable } from './components/orderTable/OrderListTable';
import { TablePagination } from '@/components/common/TablePagination';
import { currentPageAtom } from '@/features/order/store/search.store';
import { useGetOrders } from '@/features/order/api/useGetOrders';

export const OrderListTableSection = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const { data, isLoading } = useGetOrders();

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <Card>
      <CardHeader>
        <OrderListTableHeader total={isLoading ? undefined : total} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">불러오는 중...</div>
        ) : (
          <OrderListTable orders={orders} />
        )}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onChangePage={(page) => setCurrentPage(page)}
        />
      </CardContent>
    </Card>
  );
};
