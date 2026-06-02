'use client';

import { ChangeEventHandler } from 'react';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAtom } from 'jotai';
import { searchValueAtom } from '@/features/products/store/search.store';

type Props = {
  onSearch: () => void;
};

export const ProductSearchInput = ({ onSearch }: Props) => {
  const [getSearchValue, setSearchValue] = useAtom(searchValueAtom);

  const handleSearchInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSearchValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="상품코드, 상품명 또는 카테고리로 검색..."
          value={getSearchValue}
          onChange={handleSearchInput}
          onKeyDown={handleKeyDown}
          className="pl-10"
        />
      </div>
      <Button onClick={onSearch}>
        <Search className="h-4 w-4 mr-2" />
        검색
      </Button>
    </div>
  );
};
