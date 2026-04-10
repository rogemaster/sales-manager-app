import { useState } from 'react';
import dayjs from 'dayjs';
import { Checkbox } from '@/components/ui/checkbox';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Table } from '@/components/ui/table';
import { getCategoryName } from '@/lib/utils';
import { LIST_TABLE_HEAD } from '@/features/products/constant/table.constants';
import { ProductStatusBadge } from '@/features/products/ui/components/ProductStatusBadge';
import { Product } from '@/features/products/types/product.types';

type props = {
  products: Product[];
};

export const ProductTableBody = ({ products }: props) => {
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
      setSelectedProducts(products.map((item) => item.categoryId));
    } else {
      setSelectedProducts([]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16">
          <TableHead className="w-12">
            <Checkbox checked={false} onCheckedChange={handleSelectAll} />
          </TableHead>
          {LIST_TABLE_HEAD.map((item) => (
            <TableHead className="w-32 text-center" key={item.id}>
              {item.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {products &&
          products.map((product) => (
            <TableRow key={product.productId} className="h-14">
              <TableCell>
                <Checkbox
                  checked={selectedProducts.includes(product.productId)}
                  onCheckedChange={(checked: boolean) => handleSelectProduct(product.productId, checked)}
                />
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{product.productId}</TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{getCategoryName(product.categoryId)}</TableCell>
              <TableCell>{product.price.toLocaleString()}원</TableCell>
              <TableCell>{<ProductStatusBadge status={product.state} />}</TableCell>
              <TableCell>{dayjs(product.createDate).format('YYYY-MM-DD')}</TableCell>
              <TableCell>{dayjs(product.updateDate).format('YYYY-MM-DD')}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
};
