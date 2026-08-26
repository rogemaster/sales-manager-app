'use client';

import { useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { FilterSelect } from '@/components/common/FilterSelect';
import { FilterOption, ShoppingMalls } from '@/types/common.type';
import { SHOPPING_MALL_OPTIONS } from '@/shared/constant/shoppingMall.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { ProductStateType } from '@/features/products/types/product.types';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { useGetActiveShoppingSettings } from '@/features/shoppingSetting/api/useGetActiveShoppingSettings';
import {
  linkStatusAtom,
  mallAccountIdAtom,
  mallCodeAtom,
  saleStateAtom,
  shoppingSettingIdAtom,
} from '@/features/mallLinkedProduct/store/search.store';
import { MALL_LINK_STATUS_OPTIONS } from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { MallLinkStatus } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

export const MallLinkedConditionFilter = () => {
  const [mallCode, setMallCode] = useAtom(mallCodeAtom);
  const [mallAccountId, setMallAccountId] = useAtom(mallAccountIdAtom);
  const [shoppingSettingId, setShoppingSettingId] = useAtom(shoppingSettingIdAtom);
  const [linkStatus, setLinkStatus] = useAtom(linkStatusAtom);
  const [saleState, setSaleState] = useAtom(saleStateAtom);

  const { data: mallAccounts } = useGetAvailableMallAccounts();
  const { data: activeSettings } = useGetActiveShoppingSettings();

  // 몰을 고르기 전에는 계정 옵션을 노출하지 않는다 — 몰과 무관한 계정까지 섞여 보이면 선택 의미가 없다.
  const accountOptions: FilterOption[] = useMemo(() => {
    if (mallCode === 'ALL') return [];
    return (mallAccounts ?? [])
      .filter((account) => account.mallCode === mallCode)
      .map((account) => ({ id: account.id, name: account.mallId }));
  }, [mallAccounts, mallCode]);

  // 계정을 고른 경우 그 계정의 설정만 남긴다 — 계정과 설정을 따로 고르면 교집합이 비어 빈 목록이 되기 쉽다.
  const settingOptions: FilterOption[] = useMemo(() => {
    if (mallCode === 'ALL') return [];
    return (activeSettings ?? [])
      .filter((setting) => setting.mallCode === mallCode)
      .filter((setting) => mallAccountId === 'ALL' || setting.mallAccountId === mallAccountId)
      .map((setting) => ({ id: setting.id, name: setting.nickname }));
  }, [activeSettings, mallCode, mallAccountId]);

  // 몰을 바꾸면 이전 몰의 계정 id가 남지 않도록 계정 선택을 초기화한다.
  useEffect(() => {
    if (mallAccountId !== 'ALL' && !accountOptions.some((option) => option.id === mallAccountId)) {
      setMallAccountId('ALL');
    }
  }, [accountOptions, mallAccountId, setMallAccountId]);

  // 몰·계정을 바꾸면 그 조합에 없는 설정 id가 남지 않도록 설정 선택을 초기화한다.
  useEffect(() => {
    if (shoppingSettingId !== 'ALL' && !settingOptions.some((option) => option.id === shoppingSettingId)) {
      setShoppingSettingId('ALL');
    }
  }, [settingOptions, shoppingSettingId, setShoppingSettingId]);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <FilterSelect
        label="쇼핑몰"
        divClassName="flex items-center gap-4"
        labelClassName="w-20 text-right"
        triggerClassName="w-40"
        value={mallCode}
        onValueChange={(value) => setMallCode(value as ShoppingMalls | 'ALL')}
        options={SHOPPING_MALL_OPTIONS}
        allOption={ALL_FILTER_OPTION}
      />
      <FilterSelect
        label="쇼핑몰 계정"
        divClassName="flex items-center gap-4"
        labelClassName="w-24 text-right"
        triggerClassName="w-40"
        value={mallAccountId}
        onValueChange={setMallAccountId}
        options={accountOptions}
        allOption={ALL_FILTER_OPTION}
      />
      <FilterSelect
        label="쇼핑몰 정보설정"
        divClassName="flex items-center gap-4"
        labelClassName="w-28 text-right"
        triggerClassName="w-40"
        value={shoppingSettingId}
        onValueChange={setShoppingSettingId}
        options={settingOptions}
        allOption={ALL_FILTER_OPTION}
      />
      <FilterSelect
        label="연동상태"
        divClassName="flex items-center gap-4"
        labelClassName="w-20 text-right"
        triggerClassName="w-32"
        value={linkStatus}
        onValueChange={(value) => setLinkStatus(value as MallLinkStatus | 'ALL')}
        options={MALL_LINK_STATUS_OPTIONS}
        allOption={ALL_FILTER_OPTION}
      />
      <FilterSelect
        label="판매상태"
        divClassName="flex items-center gap-4"
        labelClassName="w-20 text-right"
        triggerClassName="w-32"
        value={saleState}
        onValueChange={(value) => setSaleState(value as ProductStateType | 'ALL')}
        options={PRODUCT_STATUS}
        allOption={ALL_FILTER_OPTION}
      />
    </div>
  );
};
