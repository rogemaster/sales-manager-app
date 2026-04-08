'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProductTableHeader } from '@/features/products/ui/list/components/productTable/ProductTableHeader';
import { ProductTableBody } from './components/productTable/ProductTableBody';
import { TablePagination } from '@/components/common/TablePagination';
import { Product } from '../../types/product.types';

type Props = {
  products: Product[];
};

export const ProductListTableSection = ({ products }: Props) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  return (
    <Card>
      <CardHeader>
        <ProductTableHeader total={products.length} />
      </CardHeader>
      <CardContent>
        <ProductTableBody />
        <TablePagination
          currentPage={currentPage}
          totalPages={products.length}
          onChangePage={(page) => setCurrentPage(page)}
        />
      </CardContent>
    </Card>
  );
};
