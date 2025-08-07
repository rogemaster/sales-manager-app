import { Checkbox } from '@/components/ui/checkbox';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Table } from '@/components/ui/table';
import { LIST_TABLE_HEAD } from '@/features/products/constant/Table';
import { getCategoryName, getProductStatusName } from '@/lib/utils';
import { mockProducts } from '@/mock/TestProducts';
import dayjs from 'dayjs';
import { useState } from 'react';

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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
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
          <TableRow key={product.productCode}>
            <TableCell>
              <Checkbox
                checked={selectedProducts.includes(product.productCode)}
                onCheckedChange={(checked) => handleSelectProduct(product.productCode, checked)}
              />
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{product.code}</TableCell>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{getCategoryName(product.categoryCode)}</TableCell>
            <TableCell>{product.price.toLocaleString()}원</TableCell>
            <TableCell>{getProductStatusName(product.status)}</TableCell>
            <TableCell>{dayjs(product.createDate).format('YYYY-MM-DD')}</TableCell>
            <TableCell>{dayjs(product.updateDate).format('YYYY-MM-DD')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
