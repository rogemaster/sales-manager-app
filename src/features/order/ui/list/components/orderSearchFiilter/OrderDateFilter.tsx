'use client';

import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { dateTypeAtom, startDateAtom, endDateAtom } from '@/features/order/store/search.store';
import { ORDER_DATE_TYPE } from '@/features/order/constant/status.constants';
import { RangeDateFilter } from '@/components/common/RangeDateFilter';

export const OrderDateFilter = () => {
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
      dateType={{ value: dateType, options: ORDER_DATE_TYPE, onChange: setDateType }}
    />
  );
};
