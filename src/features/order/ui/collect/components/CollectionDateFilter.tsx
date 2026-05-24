// src/features/order/ui/collect/components/CollectionDateFilter.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { RangeTypeProps } from '@/types/common.type';
import { collectStartDateAtom, collectEndDateAtom } from '@/features/order/store/collect.store';
import dayjs from 'dayjs';

export const CollectionDateFilter = () => {
  const setStartDate = useSetAtom(collectStartDateAtom);
  const setEndDate = useSetAtom(collectEndDateAtom);

  const defaultStartDate = useMemo(() => dayjs().subtract(7, 'day').format('YYYY-MM-DD'), []);
  const defaultEndDate = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const [pickerInitDate, setPickerInitDate] = useState({ startDate: defaultStartDate, endDate: defaultEndDate });
  const [resetKey, setResetKey] = useState(0);

  const handleChangeDate = useCallback(
    (startDate: string, endDate: string) => {
      setStartDate(startDate);
      setEndDate(endDate);
    },
    [setStartDate, setEndDate],
  );

  const handleChangeDateRange = useCallback(
    (value: RangeTypeProps) => {
      const [startDate, endDate] = calculatorRangeDate(value);
      const formatStartDate = dayjs(startDate).format('YYYY-MM-DD');
      const formatEndDate = dayjs(endDate).format('YYYY-MM-DD');
      setPickerInitDate({ startDate: formatStartDate, endDate: formatEndDate });
      setResetKey((prev) => prev + 1);
      setStartDate(formatStartDate);
      setEndDate(formatEndDate);
    },
    [setStartDate, setEndDate],
  );

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 shrink-0 text-right">검색 기간</Label>
      <RangeDatePicker
        initStartDate={pickerInitDate.startDate}
        initEndDate={pickerInitDate.endDate}
        resetKey={resetKey}
        onChangeDate={handleChangeDate}
      />
      <DatePickerRangeButton onChangeDateRange={handleChangeDateRange} />
    </div>
  );
};
