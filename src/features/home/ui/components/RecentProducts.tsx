'use client';

import { ArrowRight } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductStatusBadge } from '@/components/common/ProductStatusBadge';
import { RecentProduct } from '@/features/home/types/home.types';

type Props = {
  products: RecentProduct[];
};

export const RecentProducts = ({ products }: Props) => {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <h2 className="text-base font-bold tracking-tight">최근 등록 상품</h2>
        </div>
        <span className="text-xs text-muted-foreground">최근 5건</span>
      </div>

      {/* 테이블 */}
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/40 bg-muted/30 hover:bg-muted/30">
            <TableHead className="h-9 w-28 text-center text-sm font-bold uppercase tracking-widest text-foreground/60">
              ID
            </TableHead>
            <TableHead className="h-9 text-sm font-bold uppercase tracking-widest text-foreground/60">
              상품명
            </TableHead>
            <TableHead className="h-9 text-center text-sm font-bold uppercase tracking-widest text-foreground/60">
              가격
            </TableHead>
            <TableHead className="h-9 text-center text-sm font-bold uppercase tracking-widest text-foreground/60">
              상태
            </TableHead>
            <TableHead className="h-9 text-center text-sm font-bold uppercase tracking-widest text-foreground/60">
              등록일
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.productId}
              className="group border-b border-border/30 transition-colors last:border-0 hover:bg-muted/20"
            >
              <TableCell className="py-3 text-center font-mono text-xs text-muted-foreground">
                {product.productId}
              </TableCell>
              <TableCell className="py-3">
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  {product.name}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center tabular-nums">
                <span className="text-sm font-semibold">{product.price.toLocaleString()}</span>
                <span className="ml-0.5 text-xs text-muted-foreground">원</span>
              </TableCell>
              <TableCell className="py-3 text-center">
                <ProductStatusBadge status={product.state} />
              </TableCell>
              <TableCell className="py-3 text-center font-mono text-xs text-muted-foreground tabular-nums">
                {product.createDate}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 푸터 */}
      <div className="flex items-center justify-center border-t border-border/40 bg-muted/10 py-3">
        <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          전체 상품 보기
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
