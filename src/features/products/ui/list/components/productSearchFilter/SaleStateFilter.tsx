'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { saleTypeAtom } from '@/features/products/store/productSearch.store';
import { ALL_PRODUCT_STATUS_OPTION, PRODUCT_STATUS } from '@/constant/Product';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ProductSearchSaleState = () => {
  const [getSaleTypeAtom, setSaleTypeAtom] = useAtom(saleTypeAtom);

  // 상품상태 옵션을 메모이제이션
  const productStatusOptions = useMemo(() => {
    return [ALL_PRODUCT_STATUS_OPTION, ...PRODUCT_STATUS];
  }, []);

  // 현재 선택된 상품상태 정보를 메모이제이션
  const selectedProductStatusInfo = useMemo(() => {
    if (getSaleTypeAtom === 'ALL') {
      return ALL_PRODUCT_STATUS_OPTION;
    }
    return PRODUCT_STATUS.find((status) => status.id === getSaleTypeAtom) || ALL_PRODUCT_STATUS_OPTION;
  }, [getSaleTypeAtom]);

  const handleProductStatusChange = (value: string) => {
    setSaleTypeAtom(value);
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">판매 상태</Label>
      <Select value={getSaleTypeAtom} onValueChange={handleProductStatusChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder={selectedProductStatusInfo.name} />
        </SelectTrigger>
        <SelectContent>
          {productStatusOptions.map((state) => (
            <SelectItem key={state.id} value={state.id}>
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
