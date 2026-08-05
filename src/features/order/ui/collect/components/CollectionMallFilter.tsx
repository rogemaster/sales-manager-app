// src/features/order/ui/collect/components/CollectionMallFilter.tsx
'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collectMallAtom, collectMallIdAtom } from '@/features/order/store/collect.store';
import { SHOPPING_MALL_OPTIONS } from '@/shared/constant/shoppingMall.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { useGetShoppingAccountsByMall } from '@/features/shoppingAccount/api/useGetShoppingAccountsByMall';
import { FilterOption, ShoppingMalls } from '@/types/common.type';

export const CollectionMallFilter = () => {
  const [mall, setMall] = useAtom(collectMallAtom);
  const [mallId, setMallId] = useAtom(collectMallIdAtom);

  const mallOptions = useMemo<FilterOption[]>(() => [ALL_FILTER_OPTION, ...SHOPPING_MALL_OPTIONS], []);

  const { data: mallAccounts = [] } = useGetShoppingAccountsByMall(mall);

  const accountOptions = useMemo<FilterOption[]>(
    () => [ALL_FILTER_OPTION, ...mallAccounts.map((a) => ({ id: a.mallId, name: a.mallId }))],
    [mallAccounts],
  );

  const handleMallChange = (value: string) => {
    setMall(value as ShoppingMalls | 'ALL');
    setMallId('ALL');
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 shrink-0 text-right">쇼핑몰</Label>
      <Select value={mall} onValueChange={handleMallChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="쇼핑몰 선택" />
        </SelectTrigger>
        <SelectContent>
          {mallOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={mallId} onValueChange={setMallId} disabled={mall === 'ALL'}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="아이디 선택" />
        </SelectTrigger>
        <SelectContent>
          {accountOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
