'use client';

import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { FilterOption, RangeTypeProps } from '@/types/common.type';

type DateTypeSelect = {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type Props = {
  onChangeDate: (startDate: string, endDate: string) => void;
  dateType?: DateTypeSelect;
  label?: string;
};

export const RangeDateFilter = ({ onChangeDate, dateType, label = '검색 일자' }: Props) => {
  const defaultStartDate = useMemo(() => dayjs().subtract(7, 'day').format('YYYY-MM-DD'), []);
  const defaultEndDate = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const [pickerInitDate, setPickerInitDate] = useState({ startDate: defaultStartDate, endDate: defaultEndDate });
  const [resetKey, setResetKey] = useState(0);

  const handleChangeDateRange = useCallback(
    (value: RangeTypeProps) => {
      const [startDate, endDate] = calculatorRangeDate(value);
      const formatStartDate = dayjs(startDate).format('YYYY-MM-DD');
      const formatEndDate = dayjs(endDate).format('YYYY-MM-DD');

      // RangeDatePicker는 init 날짜를 내부 state로 복사해두므로, 날짜와 resetKey를 함께 갱신해야 달력 표시가 따라온다.
      setPickerInitDate({ startDate: formatStartDate, endDate: formatEndDate });
      setResetKey((prev) => prev + 1);
      onChangeDate(formatStartDate, formatEndDate);
    },
    [onChangeDate],
  );

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 shrink-0 text-right">{label}</Label>
      {dateType && (
        <Select value={dateType.value} onValueChange={dateType.onChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateType.options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <RangeDatePicker
        initStartDate={pickerInitDate.startDate}
        initEndDate={pickerInitDate.endDate}
        resetKey={resetKey}
        onChangeDate={onChangeDate}
      />
      <DatePickerRangeButton onChangeDateRange={handleChangeDateRange} />
    </div>
  );
};
