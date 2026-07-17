'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  mallCodeAtom,
  mallIdAtom,
  deliveryCompanyAtom,
} from '@/features/order/store/search.store';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { DELIVERY_COMPANY } from '@/shared/constant/delivery.constant';
import { FilterOption, ShoppingMalls } from '@/types/common.type';

const ALL_OPTION: FilterOption = { id: 'ALL', name: '전체' };

// 쇼핑몰별 계정 ID 목록 (실 데이터 연동 전 빈 매핑)
const MALL_ACCOUNTS: Record<string, FilterOption[]> = {};

export const OrderMallFilter = () => {
  const [mallCode, setMallCode] = useAtom(mallCodeAtom);
  const [mallId, setMallId] = useAtom(mallIdAtom);
  const [deliveryCompany, setDeliveryCompany] = useAtom(deliveryCompanyAtom);

  const mallOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...SHOPPING_MALLS.map((mall) => ({ id: mall.code, name: mall.name }))],
    [],
  );

  const accountOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...(mallCode !== 'ALL' ? (MALL_ACCOUNTS[mallCode] ?? []) : [])],
    [mallCode],
  );

  const deliveryOptions: FilterOption[] = [ALL_OPTION, ...DELIVERY_COMPANY];

  const handleMallChange = (value: string) => {
    setMallCode(value as ShoppingMalls | 'ALL');
    setMallId('ALL');
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">선택사항</Label>
      <Select value={mallCode} onValueChange={handleMallChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="쇼핑몰 선택" />
        </SelectTrigger>
        <SelectContent>
          {mallOptions.map((option: FilterOption) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={mallId} onValueChange={setMallId}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="아이디 선택" />
        </SelectTrigger>
        <SelectContent>
          {accountOptions.map((option: FilterOption) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={deliveryCompany} onValueChange={setDeliveryCompany}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="택배사" />
        </SelectTrigger>
        <SelectContent>
          {deliveryOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
