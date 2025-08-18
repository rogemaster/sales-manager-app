'use client';

import { useState } from 'react';
import { MOCK_PRODUCT_DATA } from '@/mock/MockProductsData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProductTableHeader } from '@/features/products/ui/list/components/productTable/ProductTableHeader';
import { ProductTableBody } from './components/productTable/ProductTableBody';
import { TablePagination } from '@/components/common/TablePagination';

export const ProductTableSection = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  return (
    <Card>
      <CardHeader>
        <ProductTableHeader total={MOCK_PRODUCT_DATA.length} />
      </CardHeader>
      <CardContent>
        <ProductTableBody />
        <TablePagination
          currentPage={currentPage}
          totalPages={MOCK_PRODUCT_DATA.length}
          onChangePage={(page) => setCurrentPage(page)}
        />
      </CardContent>
    </Card>
  );
};
