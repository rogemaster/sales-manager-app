'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  shoppingMallAtom,
  mallAccountIdAtom,
  deliveryCompanyAtom,
} from '@/features/order/store/search.store';
import { SHOPPING_MALLS } from '@/constant/shoppingMall.constant';
import { DELIVERY_COMPANY } from '@/constant/delivery.constant';
import { FilterOption } from '@/types/common.type';

const ALL_OPTION: FilterOption = { id: 'ALL', name: '전체' };

// 쇼핑몰별 계정 ID 목록 (실 데이터 연동 전 빈 매핑)
const MALL_ACCOUNTS: Record<string, FilterOption[]> = {};

export const OrderMallFilter = () => {
  const [shoppingMall, setShoppingMall] = useAtom(shoppingMallAtom);
  const [mallAccountId, setMallAccountId] = useAtom(mallAccountIdAtom);
  const [deliveryCompany, setDeliveryCompany] = useAtom(deliveryCompanyAtom);

  const mallOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...SHOPPING_MALLS.map((mall) => ({ id: mall.code, name: mall.name }))],
    [],
  );

  const accountOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...(shoppingMall !== 'ALL' ? (MALL_ACCOUNTS[shoppingMall] ?? []) : [])],
    [shoppingMall],
  );

  const deliveryOptions: FilterOption[] = [ALL_OPTION, ...DELIVERY_COMPANY];

  const handleMallChange = (value: string) => {
    setShoppingMall(value);
    setMallAccountId('ALL');
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">선택사항</Label>
      <Select value={shoppingMall} onValueChange={handleMallChange}>
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
      <Select value={mallAccountId} onValueChange={setMallAccountId}>
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
