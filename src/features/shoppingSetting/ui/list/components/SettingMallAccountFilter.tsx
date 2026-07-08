'use client';

import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { FilterSelect } from '@/components/common/FilterSelect';
import { settingMallAccountIdAtom, settingMallCodeAtom } from '@/features/shoppingSetting/store/search.store';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { FilterOption } from '@/types/common.type';

const ALL_MALL_ACCOUNT: FilterOption = { id: 'ALL', name: '전체' };

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
      allOption={ALL_MALL_ACCOUNT}
      triggerClassName="w-44"
    />
  );
};
