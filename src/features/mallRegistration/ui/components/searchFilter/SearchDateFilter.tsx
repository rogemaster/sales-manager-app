'use client';

import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { dateTypeAtom, endDateAtom, startDateAtom } from '@/features/mallRegistration/store/search.store';
import { PRODUCT_DATE_TYPE } from '@/features/products/constant/status.constants';
import { RangeDateFilter } from '@/components/common/RangeDateFilter';

export const MallRegistrationSearchDate = () => {
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
      dateType={{ value: dateType, options: PRODUCT_DATE_TYPE, onChange: setDateType }}
    />
  );
};
