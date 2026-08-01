'use client';

import { ChangeEventHandler, KeyboardEvent, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  committedFilterAtom,
  currentPageAtom,
  draftFilterAtom,
  searchTypeAtom,
} from '@/features/mallLinkedProduct/store/search.store';
import { MALL_LINKED_SEARCH_TYPE } from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { MallLinkedProductSearchType } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

export const MallLinkedSearchInput = () => {
  const [searchType, setSearchType] = useAtom(searchTypeAtom);
  const draftFilter = useAtomValue(draftFilterAtom);
  const setCommittedFilter = useSetAtom(committedFilterAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);

  const [inputValue, setInputValue] = useState('');

  const handleChangeInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setInputValue(e.target.value);
  };

  const handleSearch = () => {
    setCommittedFilter({ ...draftFilter, searchValue: inputValue });
    setCurrentPage(1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <Select value={searchType} onValueChange={(value) => setSearchType(value as MallLinkedProductSearchType)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MALL_LINKED_SEARCH_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative max-w-md flex-1">
        <Input
          placeholder="검색어를 입력하세요..."
          value={inputValue}
          onChange={handleChangeInput}
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button onClick={handleSearch}>
        <Search className="mr-2 h-4 w-4" />
        검색
      </Button>
    </div>
  );
};
