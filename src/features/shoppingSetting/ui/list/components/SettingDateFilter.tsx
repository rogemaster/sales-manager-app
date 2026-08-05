'use client';

import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  settingDateTypeAtom,
  settingStartDateAtom,
  settingEndDateAtom,
} from '@/features/shoppingSetting/store/search.store';
import { SETTING_DATE_TYPE } from '@/features/shoppingSetting/constant/shoppingSetting.constants';
import { RangeDateFilter } from '@/components/common/RangeDateFilter';

export const SettingDateFilter = () => {
  const [dateType, setDateType] = useAtom(settingDateTypeAtom);
  const setStartDate = useSetAtom(settingStartDateAtom);
  const setEndDate = useSetAtom(settingEndDateAtom);

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
        options: SETTING_DATE_TYPE,
        onChange: (value) => setDateType(value as 'createdAt' | 'updatedAt'),
      }}
    />
  );
};
