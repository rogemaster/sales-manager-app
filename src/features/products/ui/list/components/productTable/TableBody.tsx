import { Checkbox } from '@/components/ui/checkbox';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Table } from '@/components/ui/table';

export const TableBody = () => {
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
          <TableHead className="w-32">상품코드</TableHead>
          <TableHead>상품명</TableHead>
          <TableHead>카테고리</TableHead>
          <TableHead>가격</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>등록일</TableHead>
          <TableHead>수정일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {currentProducts.map((product) => (
          <TableRow key={product.id}>
            <TableCell>
              <Checkbox
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={(checked) => handleSelectProduct(product.id, checked)}
              />
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{product.code}</TableCell>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{product.category}</TableCell>
            <TableCell>{product.price.toLocaleString()}원</TableCell>
            <TableCell>{getStatusBadge(product.status)}</TableCell>
            <TableCell>{product.createdAt}</TableCell>
            <TableCell>{product.modifiedAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
