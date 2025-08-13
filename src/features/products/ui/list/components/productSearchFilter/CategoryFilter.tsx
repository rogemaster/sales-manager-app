'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { categoryAtom } from '@/features/products/store/productSearch.store';
import { ALL_CATEGORY_OPTION, MOCK_CATEGORY_DATA } from '@/mock/TestCategorys';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ProductSearchCategory = () => {
  const [getCategoryAtom, setCategoryAtom] = useAtom(categoryAtom);

  // 카테고리 옵션을 메모이제이션
  const categoryOptions = useMemo(() => {
    return [ALL_CATEGORY_OPTION, ...MOCK_CATEGORY_DATA];
  }, []);

  // 현재 선택된 카테고리 정보를 메모이제이션
  const selectedCategoryInfo = useMemo(() => {
    if (getCategoryAtom === 'ALL') {
      return ALL_CATEGORY_OPTION;
    }
    return MOCK_CATEGORY_DATA.find((category) => category.code === getCategoryAtom) || ALL_CATEGORY_OPTION;
  }, [getCategoryAtom]);

  const handleCategoryChange = (value: string) => {
    setCategoryAtom(value);
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">카테고리</Label>
      <Select value={getCategoryAtom} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder={selectedCategoryInfo.name} />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((category) => (
            <SelectItem key={category.code} value={category.code}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
