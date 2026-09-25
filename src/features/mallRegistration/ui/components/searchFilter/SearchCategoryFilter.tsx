'use client';

import { useAtom } from 'jotai';
import { categoryAtom } from '@/features/mallRegistration/store/search.store';
import { CATEGORIES } from '@/shared/constant/category.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { FilterSelect } from '@/components/common/FilterSelect';

export const MallRegistrationSearchCategory = () => {
  const [category, setCategory] = useAtom(categoryAtom);

  return (
    <FilterSelect
      label="카테고리"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      triggerClassName="w-48"
      value={category}
      onValueChange={setCategory}
      options={CATEGORIES}
      allOption={ALL_FILTER_OPTION}
    />
  );
};
