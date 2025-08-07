'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCT_STATUS } from '@/constant/Product';
import { useAtom } from 'jotai';
import { saleTypeAtom } from '@/features/products/store/productSearch.store';

export const ProductSearchSaleState = () => {
  const [getSaleTypeAtom, setSaleTypeAtom] = useAtom(saleTypeAtom);

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">판매 상태</Label>
      <Select value={getSaleTypeAtom} onValueChange={setSaleTypeAtom}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="전체" />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_STATUS.map((state) => (
            <SelectItem key={state.id} value={state.id}>
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
