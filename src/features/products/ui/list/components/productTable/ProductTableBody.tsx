import { useState } from 'react';
import dayjs from 'dayjs';
import { mockProducts } from '@/mock/TestProducts';
import { Checkbox } from '@/components/ui/checkbox';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getCategoryName, getProductStatusName } from '@/lib/utils';
import { LIST_TABLE_HEAD } from '@/features/products/constant/Table';

export const ProductTableBody = () => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleSelectProduct = (code: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts((prev) => [...prev, code]);
    } else {
      setSelectedProducts((prev) => prev.filter((value) => value !== code));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(mockProducts.map((item) => item.categoryCode));
    } else {
      setSelectedProducts([]);
    }
  };

  const productStatusName = (status: string) => {
    const { id, name } = getProductStatusName(status);

    switch (id) {
      case 'ON_SALE':
        return <Badge variant="default">{name}</Badge>;
      case 'WAIT_SALE':
        return <Badge variant="waiting">{name}</Badge>;
      case 'SOLD_OUT':
        return <Badge variant="destructive">{name}</Badge>;
      case 'SALE_DIS':
        return <Badge variant="destructive">{name}</Badge>;
      default:
        return;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16">
          <TableHead className="w-12">
            <Checkbox
              checked={selectedProducts.length === mockProducts.length && mockProducts.length > 0}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {LIST_TABLE_HEAD.map((item) => (
            <TableHead className="w-32" key={item.id}>
              {item.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {mockProducts.map((product) => (
          <TableRow key={product.productCode} className="h-14">
            <TableCell>
              <Checkbox
                checked={selectedProducts.includes(product.productCode)}
                onCheckedChange={(checked: boolean) => handleSelectProduct(product.productCode, checked)}
              />
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{product.productCode}</TableCell>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{getCategoryName(product.categoryCode)}</TableCell>
            <TableCell>{product.price.toLocaleString()}원</TableCell>
            <TableCell>{productStatusName(product.status)}</TableCell>
            <TableCell>{dayjs(product.createDate).format('YYYY-MM-DD')}</TableCell>
            <TableCell>{dayjs(product.updateDate).format('YYYY-MM-DD')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
