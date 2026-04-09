'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { calculatorRangeDate } from '@/lib/utils';
import dayjs from 'dayjs';
import { DateTypeAtom, endDateAtom, startDateAtom } from '@/features/products/store/search.store';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCT_DATE_TYPE } from '@/features/products/constant/status.constants';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { RangeTypeProps } from '@/types/common.type';

export const ProductSearchDate = () => {
  const [getDateTypeAtom, setDateTypeAtom] = useAtom(DateTypeAtom);
  const setStartDateAtom = useSetAtom(startDateAtom);
  const setEndDateAtom = useSetAtom(endDateAtom);

  const defaultStartDate = useMemo(() => dayjs().subtract(7, 'day').format('YYYY-MM-DD'), []);
  const defaultEndDate = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const [pickerInitDate, setPickerInitDate] = useState({ startDate: defaultStartDate, endDate: defaultEndDate });
  const [resetKey, setResetKey] = useState(0);

  const handleChangeDate = useCallback(
    (startDate: string, endDate: string) => {
      setStartDateAtom(startDate);
      setEndDateAtom(endDate);
    },
    [setStartDateAtom, setEndDateAtom],
  );

  const handleChangeDateRange = useCallback(
    (value: RangeTypeProps) => {
      const [startDate, endDate] = calculatorRangeDate(value);
      const formatStartDate = dayjs(startDate).format('YYYY-MM-DD');
      const formatEndDate = dayjs(endDate).format('YYYY-MM-DD');

      setPickerInitDate({ startDate: formatStartDate, endDate: formatEndDate });
      setResetKey((prev) => prev + 1);
      setStartDateAtom(formatStartDate);
      setEndDateAtom(formatEndDate);
    },
    [setStartDateAtom, setEndDateAtom],
  );

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색 일자</Label>
      <Select value={getDateTypeAtom} onValueChange={setDateTypeAtom}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_DATE_TYPE.map((value) => (
            <SelectItem key={value.id} value={value.id}>
              {value.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
