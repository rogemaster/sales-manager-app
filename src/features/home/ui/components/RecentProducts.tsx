'use client';

import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductStatusBadge } from '@/components/common/ProductStatusBadge';
import { RecentProduct } from '@/features/home/types/home.types';

type Props = {
  products: RecentProduct[];
};

export const RecentProducts = ({ products }: Props) => {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6 pb-4">
        <h2 className="text-base font-semibold">최근 등록 상품</h2>
        <hr className="mt-3" />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold text-foreground w-20">ID</TableHead>
            <TableHead className="font-semibold text-foreground">상품명</TableHead>
            <TableHead className="font-semibold text-foreground">가격</TableHead>
            <TableHead className="font-semibold text-foreground">상태</TableHead>
            <TableHead className="font-semibold text-foreground">등록일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.productId}>
              <TableCell className="font-bold">{product.productId}</TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="font-bold">{product.price.toLocaleString()}원</TableCell>
              <TableCell>
                <ProductStatusBadge status={product.state} />
              </TableCell>
              <TableCell className="text-muted-foreground">{product.createDate}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-center py-4 border-t">
        <Button variant="outline" size="sm" className="gap-1">
          모두 보기
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
