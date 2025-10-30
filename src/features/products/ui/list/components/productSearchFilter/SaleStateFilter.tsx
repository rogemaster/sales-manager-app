'use client';

import { useAtom } from 'jotai';
import { saleTypeAtom } from '@/features/products/store/search.store';
import { ALL_PRODUCT_STATUS_OPTION, PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { FilterSelect } from '@/components/common/FilterSelect';

export const ProductSearchSaleState = () => {
  const [getSaleTypeAtom, setSaleTypeAtom] = useAtom(saleTypeAtom);

  const handleProductStatusChange = (value: string) => {
    setSaleTypeAtom(value);
  };

  return (
    <FilterSelect
      label="판매 상태"
      value={getSaleTypeAtom}
      onValueChange={handleProductStatusChange}
      options={PRODUCT_STATUS}
      allOption={ALL_PRODUCT_STATUS_OPTION}
    />
  );
};
