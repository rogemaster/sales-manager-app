'use client';

import { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { calculatorRangeDate } from '@/lib/utils';
import { DateTypeAtom, searchDateAtom } from '@/features/products/store/productSearch.store';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCT_DATE_TYPE } from '@/constant/Product';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { RangeTypeProps } from '@/types/CommonInterface';

export const ProductSearchDate = () => {
  const [rangeValue, setRangeValue] = useState<RangeTypeProps>({ range: 7, uniq: 'day' });

  const [getDateTypeAtom, setDateTypeAtom] = useAtom(DateTypeAtom);
  const setSearchDateAtom = useSetAtom(searchDateAtom);

  const dates = calculatorRangeDate(rangeValue);

  const handleChangeDate = (date: Date[]) => {
    setSearchDateAtom(date);
  };

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
