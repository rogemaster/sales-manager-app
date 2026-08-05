'use client';

import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { FilterSelect } from '@/components/common/FilterSelect';
import { settingMallAccountIdAtom, settingMallCodeAtom } from '@/features/shoppingSetting/store/search.store';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';

export const SettingMallAccountFilter = () => {
  const mallCode = useAtomValue(settingMallCodeAtom);
  const [mallAccountId, setMallAccountId] = useAtom(settingMallAccountIdAtom);
  const { data: accounts = [] } = useGetAvailableMallAccounts();

  const options = useMemo(
    () =>
      accounts
        .filter((account) => mallCode === 'ALL' || account.mallCode === mallCode)
        .map((account) => ({ id: account.id, name: account.mallId })),
    [accounts, mallCode],
  );

  return (
    <FilterSelect
      label="쇼핑몰아이디"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={mallAccountId}
      onValueChange={setMallAccountId}
      options={options}
      allOption={ALL_FILTER_OPTION}
      triggerClassName="w-44"
    />
  );
};
