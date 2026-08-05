'use client';

import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  accountDateTypeAtom,
  accountStartDateAtom,
  accountEndDateAtom,
} from '@/features/shoppingAccount/store/search.store';
import { ACCOUNT_DATE_TYPE } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { RangeDateFilter } from '@/components/common/RangeDateFilter';

export const AccountDateFilter = () => {
  const [dateType, setDateType] = useAtom(accountDateTypeAtom);
  const setStartDate = useSetAtom(accountStartDateAtom);
  const setEndDate = useSetAtom(accountEndDateAtom);

  const handleChangeDate = useCallback(
    (startDate: string, endDate: string) => {
      setStartDate(startDate);
      setEndDate(endDate);
    },
    [setStartDate, setEndDate],
  );

  return (
    <RangeDateFilter
      onChangeDate={handleChangeDate}
      dateType={{
        value: dateType,
        options: ACCOUNT_DATE_TYPE,
        onChange: (value) => setDateType(value as 'createdAt' | 'updatedAt'),
      }}
    />
  );
};
