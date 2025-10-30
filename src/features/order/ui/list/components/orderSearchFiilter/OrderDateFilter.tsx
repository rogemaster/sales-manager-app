'use client';

import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCT_DATE_TYPE } from '@/features/products/constant/status.constants';
import { calculatorRangeDate } from '@/lib/utils';
import { RangeTypeProps } from '@/types/common.type';
import { useState } from 'react';

export const OrderDateFilter = () => {
  const [rangeValue, setRangeValue] = useState<RangeTypeProps>({ range: 7, uniq: 'day' });

  const dates = calculatorRangeDate(rangeValue);

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
      <RangeDatePicker date={dates} onChangeDate={handleChangeDate} />
      <DatePickerRangeButton onChangeDateRange={(value) => setRangeValue(value)} />
    </div>
  );
};
