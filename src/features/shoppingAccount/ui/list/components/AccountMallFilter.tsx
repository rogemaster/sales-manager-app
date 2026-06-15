'use client';

import { useAtom } from 'jotai';
import { accountMallCodeAtom } from '@/features/shoppingAccount/store/search.store';
import { MALL_NAME_OPTIONS, ALL_MALL_NAME } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
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
      options={MALL_NAME_OPTIONS}
      allOption={ALL_MALL_NAME}
      triggerClassName="w-36"
    />
  );
};
