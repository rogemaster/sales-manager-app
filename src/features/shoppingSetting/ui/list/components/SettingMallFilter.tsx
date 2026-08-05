'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { settingMallCodeAtom, setSettingMallCodeAtom } from '@/features/shoppingSetting/store/search.store';
import { SHOPPING_MALL_OPTIONS } from '@/shared/constant/shoppingMall.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { FilterSelect } from '@/components/common/FilterSelect';

export const SettingMallFilter = () => {
  const mallCode = useAtomValue(settingMallCodeAtom);
  const setMallCode = useSetAtom(setSettingMallCodeAtom);

  return (
    <FilterSelect
      label="쇼핑몰"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={mallCode}
      onValueChange={setMallCode}
      options={SHOPPING_MALL_OPTIONS}
      allOption={ALL_FILTER_OPTION}
      triggerClassName="w-36"
    />
  );
};
