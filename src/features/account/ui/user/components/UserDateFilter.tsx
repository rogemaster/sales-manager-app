'use client';

import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { userDateTypeAtom, userStartDateAtom, userEndDateAtom } from '@/features/account/store/userSearch.store';
import { USER_DATE_TYPE } from '@/features/account/constant/user.constants';
import { RangeDateFilter } from '@/components/common/RangeDateFilter';
import { UserSearchType } from '@/features/account/types/user.types';

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
      dateType={{
        value: dateType,
        options: USER_DATE_TYPE,
        // 선택지는 USER_DATE_TYPE에서만 나온다
        onChange: (value) => setDateType(value as UserSearchType['dateType']),
      }}
    />
  );
};
