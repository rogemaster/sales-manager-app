'use client';

import { useAtom } from 'jotai';
import { accountMallCodeAtom } from '@/features/shoppingAccount/store/search.store';
import { SHOPPING_MALL_OPTIONS } from '@/shared/constant/shoppingMall.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { FilterSelect } from '@/components/common/FilterSelect';

export const AccountMallFilter = () => {
  const [mallCode, setMallCode] = useAtom(accountMallCodeAtom);

  return (
    <FilterSelect
      label="쇼핑몰"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={mallCode}
      onValueChange={setMallCode}
      options={SHOPPING_MALL_OPTIONS}
      allOption={ALL_FILTER_OPTION}
      triggerClassName="w-36"
    />
  );
};
