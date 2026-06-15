'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { RangeTypeProps } from '@/types/common.type';
import { accountDateTypeAtom, accountStartDateAtom, accountEndDateAtom } from '@/features/shoppingAccount/store/search.store';
import { ACCOUNT_DATE_TYPE } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import dayjs from 'dayjs';

export const AccountDateFilter = () => {
  const [dateType, setDateType] = useAtom(accountDateTypeAtom);
  const setStartDate = useSetAtom(accountStartDateAtom);
  const setEndDate = useSetAtom(accountEndDateAtom);

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
      <Label className="w-20 shrink-0 text-right">검색 일자</Label>
      <Select value={dateType} onValueChange={(v) => setDateType(v as 'createdAt' | 'updatedAt')}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACCOUNT_DATE_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
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
