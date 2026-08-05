'use client';

import { useAtom } from 'jotai';
import { accountIsActiveAtom } from '@/features/shoppingAccount/store/search.store';
import { ACCOUNT_STATUS_OPTIONS } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { FilterSelect } from '@/components/common/FilterSelect';

export const AccountStatusFilter = () => {
  const [isActive, setIsActive] = useAtom(accountIsActiveAtom);

  return (
    <FilterSelect
      label="사용여부"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={isActive}
      onValueChange={(v) => setIsActive(v as 'true' | 'false' | 'ALL')}
      options={ACCOUNT_STATUS_OPTIONS}
      allOption={ALL_FILTER_OPTION}
      triggerClassName="w-32"
    />
  );
};
