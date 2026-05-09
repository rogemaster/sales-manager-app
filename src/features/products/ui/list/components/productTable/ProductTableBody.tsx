'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCategoryName } from '@/lib/utils';
import { LIST_TABLE_HEAD } from '@/features/products/constant/table.constants';
import { ProductStatusBadge } from '@/components/common/ProductStatusBadge';
import { Product } from '@/features/products/types/product.types';
import Link from 'next/link';

type Props = {
  products: Product[];
};

export const ProductTableBody = ({ products }: Props) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectedProducts), [selectedProducts]);

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts((prev) => [...prev, productId]);
    } else {
      setSelectedProducts((prev) => prev.filter((value) => value !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map((item) => item.productId));
    } else {
      setSelectedProducts([]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16">
          <TableHead className="w-12">
            <Checkbox
              checked={products.length > 0 && products.every((p) => selectedSet.has(p.productId))}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {LIST_TABLE_HEAD.map((item) => (
            <TableHead className="w-32 text-center" key={item.id}>
              {item.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.productId} className="h-14">
            <TableCell>
              <Checkbox
                checked={selectedSet.has(product.productId)}
                onCheckedChange={(checked: boolean) => handleSelectProduct(product.productId, checked)}
              />
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{product.productId}</TableCell>
            <TableCell className="font-medium">
              <Link href={`/products/${product.productId}`}>{product.name}</Link>
            </TableCell>
            <TableCell>{getCategoryName(product.categoryId)}</TableCell>
            <TableCell>{product.price.toLocaleString()}원</TableCell>
            <TableCell><ProductStatusBadge status={product.state} /></TableCell>
            <TableCell>{dayjs(product.createDate).format('YYYY-MM-DD')}</TableCell>
            <TableCell>{dayjs(product.updateDate).format('YYYY-MM-DD')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
