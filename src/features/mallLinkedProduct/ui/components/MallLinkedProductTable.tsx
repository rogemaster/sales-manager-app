'use client';

import dayjs from 'dayjs';
import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductStatusBadge } from '@/components/common/ProductStatusBadge';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { MALL_LINKED_PRODUCT_TABLE_HEAD } from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { selectedLinkedIdsAtom } from '@/features/mallLinkedProduct/store/selection.store';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

type Props = {
  linkedProducts: MallLinkedProduct[];
};

const getMallName = (code: string) => SHOPPING_MALLS.find((mall) => mall.code === code)?.name ?? code;

export const MallLinkedProductTable = ({ linkedProducts }: Props) => {
  const router = useRouter();
  const [selectedLinkedIds, setSelectedLinkedIds] = useAtom(selectedLinkedIdsAtom);

  const handleSelect = (linkedId: string, checked: boolean) => {
    setSelectedLinkedIds((prev) => (checked ? [...prev, linkedId] : prev.filter((id) => id !== linkedId)));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedLinkedIds(checked ? linkedProducts.map((linked) => linked.id) : []);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
            <TableHead className="w-12">
              <Checkbox
                checked={
                  linkedProducts.length > 0 && linkedProducts.every((linked) => selectedLinkedIds.includes(linked.id))
                }
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            {MALL_LINKED_PRODUCT_TABLE_HEAD.map((item) => (
              <TableHead
                key={item.id}
                className={`text-center font-bold uppercase tracking-widest ${item.width ?? ''}`}
              >
                {item.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linkedProducts.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={MALL_LINKED_PRODUCT_TABLE_HEAD.length + 1}
                className="h-40 text-center text-sm text-muted-foreground"
              >
                조건에 맞는 연동 상품이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            linkedProducts.map((linked) => (
              <TableRow
                key={linked.id}
                className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedLinkedIds.includes(linked.id)}
                    onCheckedChange={(checked: boolean) => handleSelect(linked.id, checked)}
                  />
                </TableCell>
                <TableCell className="text-center font-mono text-sm text-muted-foreground">
                  {linked.sourceProductId}
                </TableCell>
                <TableCell className="font-medium">{linked.productSnapshot.name}</TableCell>
                <TableCell className="text-center">{getMallName(linked.mallCode)}</TableCell>
                <TableCell className="text-center">{linked.settingSnapshot.nickname}</TableCell>
                <TableCell className="text-center font-mono text-sm text-muted-foreground">
                  {linked.externalProductId ?? '-'}
                </TableCell>
                <TableCell className="text-center">{linked.productSnapshot.price.toLocaleString()}원</TableCell>
                <TableCell className="text-center">
                  <ProductStatusBadge status={linked.productSnapshot.state} />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant={linked.status === 'success' ? 'default' : 'destructive'}>
                      {linked.status === 'success' ? '성공' : '실패'}
                    </Badge>
                    {linked.errorMessage && (
                      <span className="text-xs text-muted-foreground">{linked.errorMessage}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">{dayjs(linked.lastSentAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell className="text-center">{dayjs(linked.updatedAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/shopping/linked-products/${linked.id}`)}
                  >
                    수정
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
