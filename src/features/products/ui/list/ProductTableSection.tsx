import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TableBody } from '@/components/ui/table';
import { ProductListHeader } from '@/features/products/ui/list/components/productTable/TableHeader';

export const ProductTableSection = () => {
  return (
    <Card>
      <CardHeader>
        <ProductListHeader />
      </CardHeader>
      <CardContent>
        <TableBody />
      </CardContent>
    </Card>
  )
} 