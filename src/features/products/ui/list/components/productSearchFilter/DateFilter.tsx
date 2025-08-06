"use client"

import { ChangeEventHandler } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAtom } from 'jotai';
import { DateTypeAtom, registDateAtom, updateDateAtom } from '@/features/products/store/productSearch.store';
import dayjs from 'dayjs';
import { PRODUCT_DATE_TYPE } from '@/constant/Product';

export const ProductSearchDate = () => {
  const [getDateAtom, setDateAtom] = useAtom(DateTypeAtom);
  const [getRegistDateAtom, setRegistDateAtom] = useAtom(registDateAtom);
  const [getUpdateDateAtom, setUpdateDateAtom] = useAtom(updateDateAtom);

  const handleRegistered: ChangeEventHandler<HTMLInputElement> = (e) => {
    const date = dayjs(e.target.value).toDate();
    setRegistDateAtom(date);
  }

  const handleUpdateDate: ChangeEventHandler<HTMLInputElement> = (e) => {
    const date = dayjs(e.target.value).toDate();
    setUpdateDateAtom(date);
  }

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색 일자</Label>
      <Select value={getDateAtom} onValueChange={setDateAtom}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_DATE_TYPE.map((value) => (
            <SelectItem key={value.id} value={value.id}>{value.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input type="date" value={dayjs(getRegistDateAtom).format('YYYY-MM-DD')} onChange={handleRegistered} className="w-40" />
      <span className="text-muted-foreground">~</span>
      <Input type="date" value={dayjs(getUpdateDateAtom).format('YYYY-MM-DD')} onChange={handleUpdateDate} className="w-40" />
    </div>
  );
};
