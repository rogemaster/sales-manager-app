'use client';

import { ChangeEventHandler, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import {
  searchTypeAtom,
  getOrderSearchFilterAtom,
  committedFiltersAtom,
  currentPageAtom,
} from '@/features/order/store/search.store';
import { ORDER_SEARCH_TYPE } from '@/features/order/constant/status.constants';

export const OrderSearchInput = () => {
  const [searchType, setSearchType] = useAtom(searchTypeAtom);
  const draftFilters = useAtomValue(getOrderSearchFilterAtom);
  const setCommittedFilters = useSetAtom(committedFiltersAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);

  const [inputValue, setInputValue] = useState('');

  const handleSearchInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setInputValue(e.target.value);
  };

  const handleSearch = () => {
    setCommittedFilters({ ...draftFilters, searchValue: inputValue });
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <Select value={searchType} onValueChange={setSearchType}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER_SEARCH_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1 max-w-md">
        <Input
          placeholder="검색어를 입력하세요..."
          value={inputValue}
          onChange={handleSearchInput}
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button onClick={handleSearch}>
        <Search className="h-4 w-4 mr-2" />
        검색
      </Button>
    </div>
  );
};
