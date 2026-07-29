'use client';

import dayjs from 'dayjs';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCategoryName } from '@/lib/utils';
import { MALL_REGISTRATION_TABLE_HEAD } from '@/features/mallRegistration/constant/mallRegistration.constants';
import { ProductStatusBadge } from '@/components/common/ProductStatusBadge';
import { Product } from '@/features/products/types/product.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import {
  selectedProductIdsAtom,
  stagedRegistrationsAtom,
  removeStagedRegistrationAtom,
} from '@/features/mallRegistration/store/mallRegistration.store';

type Props = {
  products: Product[];
};

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const MallRegistrationTable = ({ products }: Props) => {
  const [selectedProductIds, setSelectedProductIds] = useAtom(selectedProductIdsAtom);
  const stagedRegistrations = useAtomValue(stagedRegistrationsAtom);
  const removeStagedRegistration = useSetAtom(removeStagedRegistrationAtom);

  const handleSelect = (productId: string, checked: boolean) => {
    setSelectedProductIds((prev) => (checked ? [...prev, productId] : prev.filter((id) => id !== productId)));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProductIds(checked ? products.map((p) => p.productId) : []);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
          <TableHead className="w-12">
            <Checkbox
              checked={products.length > 0 && products.every((p) => selectedProductIds.includes(p.productId))}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {MALL_REGISTRATION_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className={`text-center font-bold uppercase tracking-widest ${item.width ?? ''}`}>
              {item.title}
            </TableHead>
          ))}
          <TableHead className="text-center font-bold uppercase tracking-widest">등록예정 쇼핑몰</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={MALL_REGISTRATION_TABLE_HEAD.length + 2}
              className="h-40 text-center text-sm text-muted-foreground"
            >
              조건에 맞는 상품이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          products.map((product) => {
            const badges = stagedRegistrations[product.productId] ?? [];
            return (
              <TableRow
                key={product.productId}
                className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedProductIds.includes(product.productId)}
                    onCheckedChange={(checked: boolean) => handleSelect(product.productId, checked)}
                  />
                </TableCell>
                <TableCell className="text-center font-mono text-sm text-muted-foreground">
                  {product.productId}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-center">{getCategoryName(product.categoryId)}</TableCell>
                <TableCell className="text-center">{product.price.toLocaleString()}원</TableCell>
                <TableCell className="text-center">
                  <ProductStatusBadge status={product.state} />
                </TableCell>
                <TableCell className="text-center">{dayjs(product.createDate).format('YYYY-MM-DD')}</TableCell>
                <TableCell className="text-center">{dayjs(product.updateDate).format('YYYY-MM-DD')}</TableCell>
                <TableCell>
                  {badges.length === 0 ? (
                    <span className="text-xs text-muted-foreground">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {badges.map((badge) => (
                        <Badge
                          key={`${badge.mallCode}-${badge.shoppingSettingId}`}
                          variant="secondary"
                          className="gap-1"
                        >
                          {getMallName(badge.mallCode)} - {badge.nickname}
                          <button
                            type="button"
                            onClick={() =>
                              removeStagedRegistration({
                                productId: product.productId,
                                mallCode: badge.mallCode,
                                shoppingSettingId: badge.shoppingSettingId,
                              })
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};
