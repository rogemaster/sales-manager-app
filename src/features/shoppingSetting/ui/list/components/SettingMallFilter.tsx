'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { settingMallCodeAtom, setSettingMallCodeAtom } from '@/features/shoppingSetting/store/search.store';
import {
  SETTING_MALL_NAME_OPTIONS,
  ALL_SETTING_MALL_NAME,
} from '@/features/shoppingSetting/constant/shoppingSetting.constants';
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
      options={SETTING_MALL_NAME_OPTIONS}
      allOption={ALL_SETTING_MALL_NAME}
      triggerClassName="w-36"
    />
  );
};
