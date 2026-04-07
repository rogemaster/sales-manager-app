'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { OrderListTableHeader } from './components/orderTable/OrderListTableHeader';
import { MOCK_ORDERS_DATA } from '@/mocks/data/MockOrdersData';
import { OrderListTable } from './components/orderTable/OrderListTable';
import { TablePagination } from '@/components/common/TablePagination';
import { useState } from 'react';

export const OrderListTableSection = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);

  return (
    <Card>
      <CardHeader>
        <OrderListTableHeader total={MOCK_ORDERS_DATA.length} />
      </CardHeader>
      <CardContent>
        <OrderListTable />
        {/* 페이지네이션 */}
        <TablePagination
          currentPage={currentPage}
          totalPages={MOCK_ORDERS_DATA.length}
          onChangePage={(page) => setCurrentPage(page)}
        />
      </CardContent>
    </Card>
  );
};
