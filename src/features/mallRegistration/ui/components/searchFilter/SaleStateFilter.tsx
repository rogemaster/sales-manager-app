'use client';

import { useAtom } from 'jotai';
import { saleTypeAtom } from '@/features/mallRegistration/store/search.store';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { FilterSelect } from '@/components/common/FilterSelect';

export const MallRegistrationSaleState = () => {
  const [saleType, setSaleType] = useAtom(saleTypeAtom);

  return (
    <FilterSelect
      label="판매 상태"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={saleType}
      onValueChange={setSaleType}
      options={PRODUCT_STATUS}
      allOption={ALL_FILTER_OPTION}
    />
  );
};
