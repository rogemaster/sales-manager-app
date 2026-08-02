'use client';

import { useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { FilterSelect } from '@/components/common/FilterSelect';
import { FilterOption, ShoppingMalls } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { ALL_PRODUCT_STATUS_OPTION, PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { ProductStateType } from '@/features/products/types/product.types';
import { useGetActiveShoppingSettings } from '@/features/mallRegistration/api/useGetActiveShoppingSettings';
import {
  linkStatusAtom,
  mallCodeAtom,
  saleStateAtom,
  shoppingSettingIdAtom,
} from '@/features/mallLinkedProduct/store/search.store';
import {
  ALL_FILTER_OPTION,
  MALL_LINK_STATUS_OPTIONS,
} from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { MallLinkStatus } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const MALL_OPTIONS: FilterOption[] = SHOPPING_MALLS.map((mall) => ({ id: mall.code, name: mall.name }));

export const MallLinkedConditionFilter = () => {
  const [mallCode, setMallCode] = useAtom(mallCodeAtom);
  const [shoppingSettingId, setShoppingSettingId] = useAtom(shoppingSettingIdAtom);
  const [linkStatus, setLinkStatus] = useAtom(linkStatusAtom);
  const [saleState, setSaleState] = useAtom(saleStateAtom);

  const { data: activeSettings } = useGetActiveShoppingSettings();

  // 몰을 고르기 전에는 계정 옵션을 노출하지 않는다 — 몰과 무관한 계정까지 섞여 보이면 선택 의미가 없다.
  const settingOptions: FilterOption[] = useMemo(() => {
    if (mallCode === 'ALL') return [];
    return (activeSettings ?? [])
      .filter((setting) => setting.mallCode === mallCode)
      .map((setting) => ({ id: setting.id, name: setting.nickname }));
  }, [activeSettings, mallCode]);

  // 몰을 바꾸면 이전 몰의 설정 id가 남지 않도록 계정 선택을 초기화한다.
  useEffect(() => {
    if (shoppingSettingId !== 'ALL' && !settingOptions.some((option) => option.id === shoppingSettingId)) {
      setShoppingSettingId('ALL');
    }
  }, [settingOptions, shoppingSettingId, setShoppingSettingId]);

  return (
    <div className="flex items-center gap-6">
      <FilterSelect
        label="쇼핑몰"
        divClassName="flex items-center gap-4"
        labelClassName="w-20 text-right"
        triggerClassName="w-40"
        value={mallCode}
        onValueChange={(value) => setMallCode(value as ShoppingMalls | 'ALL')}
        options={MALL_OPTIONS}
        allOption={ALL_FILTER_OPTION}
      />
      <FilterSelect
        label="쇼핑몰 계정"
        divClassName="flex items-center gap-4"
        labelClassName="w-24 text-right"
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
        allOption={ALL_PRODUCT_STATUS_OPTION}
      />
    </div>
  );
};
