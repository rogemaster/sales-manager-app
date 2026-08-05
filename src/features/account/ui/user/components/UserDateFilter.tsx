'use client';

import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { userDateTypeAtom, userStartDateAtom, userEndDateAtom } from '@/features/account/store/userSearch.store';
import { USER_DATE_TYPE } from '@/features/account/constant/user.constants';
import { RangeDateFilter } from '@/components/common/RangeDateFilter';

export const UserDateFilter = () => {
  const [dateType, setDateType] = useAtom(userDateTypeAtom);
  const setStartDate = useSetAtom(userStartDateAtom);
  const setEndDate = useSetAtom(userEndDateAtom);

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
      dateType={{ value: dateType, options: USER_DATE_TYPE, onChange: setDateType }}
    />
  );
};
