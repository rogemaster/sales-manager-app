'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProductTableHeader } from '@/features/products/ui/list/components/productTable/ProductTableHeader';
import { ProductTableBody } from './components/productTable/ProductTableBody';
import { ProductTablePagination } from './components/productTable/ProductTablePagination';
import { mockProducts } from '@/mock/TestProducts';
import { useState } from 'react';

export const ProductTableSection = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  return (
    <Card>
      <CardHeader>
        <ProductTableHeader total={mockProducts.length} />
      </CardHeader>
      <CardContent>
        <ProductTableBody />
        <ProductTablePagination
          currentPage={currentPage}
          totalPages={mockProducts.length}
          onChangePage={(page) => setCurrentPage(page)}
        />
      </CardContent>
    </Card>
  );
};
