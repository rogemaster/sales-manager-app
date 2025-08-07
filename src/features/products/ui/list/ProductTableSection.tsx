import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProductListHeader } from '@/features/products/ui/list/components/productTable/ProductListHeader';
import { ProductTableBody } from './components/productTable/ProductTableBody';

export const ProductTableSection = () => {
  return (
    <Card>
      <CardHeader>
        <ProductListHeader />
      </CardHeader>
      <CardContent>
        <ProductTableBody />
      </CardContent>
    </Card>
  );
};
