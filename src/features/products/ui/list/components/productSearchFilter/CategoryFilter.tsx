'use client';

import { useAtom } from 'jotai';
import { categoryAtom } from '@/features/products/store/productSearch.store';
import { ALL_CATEGORY_OPTION, MOCK_CATEGORY_DATA } from '@/mock/MockCategoryData';
import { FilterSelect } from '@/components/common/FilterSelect';

export const ProductSearchCategory = () => {
  const [getCategoryAtom, setCategoryAtom] = useAtom(categoryAtom);

  const handleCategoryChange = (value: string) => {
    setCategoryAtom(value);
  };

  return (
    <FilterSelect
      label="카테고리"
      value={getCategoryAtom}
      onValueChange={handleCategoryChange}
      options={MOCK_CATEGORY_DATA}
      allOption={ALL_CATEGORY_OPTION}
    />
  );
};
