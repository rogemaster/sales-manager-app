'use client';

import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { collectStartDateAtom, collectEndDateAtom } from '@/features/order/store/collect.store';
import { RangeDateFilter } from '@/components/common/RangeDateFilter';

export const CollectionDateFilter = () => {
  const setStartDate = useSetAtom(collectStartDateAtom);
  const setEndDate = useSetAtom(collectEndDateAtom);

  const handleChangeDate = useCallback(
    (startDate: string, endDate: string) => {
      setStartDate(startDate);
      setEndDate(endDate);
    },
    [setStartDate, setEndDate],
  );

  // 주문수집은 기준일이 수집일 하나뿐이라 dateType Select를 두지 않는다.
  return <RangeDateFilter label="검색 기간" onChangeDate={handleChangeDate} />;
};
