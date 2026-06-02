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
        <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
          <TableHead className="w-12">
            <Checkbox
              checked={products.length > 0 && products.every((p) => selectedSet.has(p.productId))}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {LIST_TABLE_HEAD.map((item) => (
            <TableHead className={`text-center font-bold uppercase tracking-widest ${item.width ?? ''}`} key={item.id}>
              {item.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.productId} className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30">
            <TableCell>
              <Checkbox
                checked={selectedSet.has(product.productId)}
                onCheckedChange={(checked: boolean) => handleSelectProduct(product.productId, checked)}
              />
            </TableCell>
            <TableCell className="text-center font-mono text-sm text-muted-foreground">{product.productId}</TableCell>
            <TableCell className="font-medium">
              <Link href={`/products/${product.productId}`}>{product.name}</Link>
            </TableCell>
            <TableCell className="text-center">{getCategoryName(product.categoryId)}</TableCell>
            <TableCell className="text-center">{product.price.toLocaleString()}원</TableCell>
            <TableCell className="text-center"><ProductStatusBadge status={product.state} /></TableCell>
            <TableCell className="text-center">{dayjs(product.createDate).format('YYYY-MM-DD')}</TableCell>
            <TableCell className="text-center">{dayjs(product.updateDate).format('YYYY-MM-DD')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
