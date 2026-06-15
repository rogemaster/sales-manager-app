'use client';

import { ChangeEventHandler, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import {
  getAccountSearchFilterAtom,
  committedFiltersAtom,
  currentPageAtom,
} from '@/features/shoppingAccount/store/search.store';

export const AccountSearchInput = () => {
  const draftFilters = useAtomValue(getAccountSearchFilterAtom);
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
      <div className="flex-1 max-w-md">
        <Input
          placeholder="쇼핑몰ID, 별명으로 검색..."
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
