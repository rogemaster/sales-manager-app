"use client"

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryInterface } from '@/types/ProductInterface';
import { useAtom } from 'jotai';
import { categoryAtom } from '@/features/products/store/productSearch.store';
import { useMemo } from 'react';

// 카테고리 데이터를 컴포넌트 외부로 이동하여 재생성 방지
const MOCK_CATEGORY_DATA: CategoryInterface[] = [
  {
    id: 'c-000001',
    name: '의류',
  },
  {
    id: 'c-000002',
    name: '액세서리',
  },
  {
    id: 'c-000003',
    name: '가구',
  },
  {
    id: 'c-000004',
    name: '도서',
  },
  {
    id: 'c-000005',
    name: '전자제품',
  },
];

// 전체 카테고리 옵션 상수
const ALL_CATEGORY_OPTION = {
  id: 'all',
  name: '전체',
} as const;

export const ProductSearchCategory = () => {
  const [selectedCategory, setSelectedCategory] = useAtom(categoryAtom);

  // 카테고리 옵션을 메모이제이션
  const categoryOptions = useMemo(() => {
    return [ALL_CATEGORY_OPTION, ...MOCK_CATEGORY_DATA];
  }, []);

  // 현재 선택된 카테고리 정보를 메모이제이션
  const selectedCategoryInfo = useMemo(() => {
    if (selectedCategory === 'all') {
      return ALL_CATEGORY_OPTION;
    }
    return MOCK_CATEGORY_DATA.find(category => category.id === selectedCategory) || ALL_CATEGORY_OPTION;
  }, [selectedCategory]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  return (
    <div className="flex items-center gap-4">
      <Label htmlFor="category-select" className="w-20 text-right">
        카테고리
      </Label>
      <Select value={selectedCategory} onValueChange={handleCategoryChange}>
        <SelectTrigger id="category-select" className="w-48">
          <SelectValue placeholder={selectedCategoryInfo.name} />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
