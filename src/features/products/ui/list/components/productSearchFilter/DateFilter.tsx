'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAtom } from 'jotai';
import { DateTypeAtom, searchDateAtom } from '@/features/products/store/productSearch.store';
import { PRODUCT_DATE_TYPE } from '@/constant/Product';
import { CommonDatePicker } from '@/components/common/CommonDatePicker';

export const ProductSearchDate = () => {
  const [getDateTypeAtom, setDateTypeAtom] = useAtom(DateTypeAtom);
  const [getDateAtom, setDateAtom] = useAtom(searchDateAtom);

  const handleChangeDate = (date: Date, name?: string) => {
    if (date) {
      if (name === 'startDate') {
        setDateAtom([date, getDateAtom[1]]);
      } else {
        setDateAtom([getDateAtom[0], date]);
      }
    }
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
      <CommonDatePicker name="startDate" date={getDateAtom[0]} onChangeDate={handleChangeDate} />
      <span className="text-muted-foreground">~</span>
      <CommonDatePicker name="endDate" date={getDateAtom[1]} onChangeDate={handleChangeDate} />
    </div>
  );
};
