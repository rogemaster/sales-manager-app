'use client';

import { ChangeEventHandler, KeyboardEvent } from 'react';
import { useAtom } from 'jotai';
import { Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { searchTypeAtom, searchValueAtom } from '@/features/mallRegistration/store/search.store';
import { PRODUCT_SEARCH_TYPE } from '@/features/products/constant/status.constants';
import { ProductSearchType } from '@/features/products/types/product.types';

type Props = {
  onSearch: () => void;
};

export const MallRegistrationSearchInput = ({ onSearch }: Props) => {
  const [searchType, setSearchType] = useAtom(searchTypeAtom);
  const [searchValue, setSearchValue] = useAtom(searchValueAtom);

  const handleSearchInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSearchValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <Select value={searchType} onValueChange={(value) => setSearchType(value as ProductSearchType)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_SEARCH_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="검색어를 입력하세요..."
          value={searchValue}
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
