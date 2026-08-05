'use client';

import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { dateTypeAtom, endDateAtom, startDateAtom } from '@/features/mallLinkedProduct/store/search.store';
import { MALL_LINKED_DATE_TYPE } from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { MallLinkedProductSearch } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { RangeDateFilter } from '@/components/common/RangeDateFilter';

export const MallLinkedDateFilter = () => {
  const [dateType, setDateType] = useAtom(dateTypeAtom);
  const setStartDate = useSetAtom(startDateAtom);
  const setEndDate = useSetAtom(endDateAtom);

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
        options: MALL_LINKED_DATE_TYPE,
        onChange: (value) => setDateType(value as MallLinkedProductSearch['dateType']),
      }}
    />
  );
};
