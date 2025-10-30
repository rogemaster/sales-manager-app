'use client';

import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAtom } from 'jotai';
import { searchValueAtom } from '@/features/products/store/search.store';
import { ChangeEventHandler } from 'react';

export const ProductSearchInput = () => {
  const [getSearchValue, setSearchValue] = useAtom(searchValueAtom);

  const handleSearchInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSearchValue(e.target.value);
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="상품코드, 상품명 또는 카테고리로 검색..."
          value={getSearchValue}
          onChange={handleSearchInput}
          className="pl-10"
        />
      </div>
    </div>
  );
};
