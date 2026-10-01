'use client';

import { ChangeEventHandler, KeyboardEvent, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  collectFiltersAtom,
  collectMallAtom,
  collectMallIdAtom,
  collectSearchTypeAtom,
  selectedAccountIdsAtom,
} from '@/features/order/store/collect.store';
import { COLLECTION_SEARCH_TYPE } from '@/features/order/constant/collection.constant';
import { CollectionSearchKey } from '@/features/order/types/collection.types';

/**
 * 수집 화면의 검색어 행. 주문 목록의 OrderSearchInput과 모양은 같지만 화면이 소유한다(ui-conventions "검색 필터는 화면이 소유한다").
 * 검색은 계정 행(쇼핑몰·아이디·수집자)만 거른다. 수집 기간은 주문수집 버튼이 화면에 보이는 값으로 쓴다.
 */
export const CollectionSearchInput = () => {
  const [searchType, setSearchType] = useAtom(collectSearchTypeAtom);
  const mallCode = useAtomValue(collectMallAtom);
  const mallId = useAtomValue(collectMallIdAtom);
  const setFilters = useSetAtom(collectFiltersAtom);
  const setSelectedAccountIds = useSetAtom(selectedAccountIdsAtom);

  const [inputValue, setInputValue] = useState('');

  const handleSearchInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setInputValue(e.target.value);
  };

  const handleSearch = () => {
    setSelectedAccountIds([]);
    setFilters({ mallCode, mallId, searchType, searchValue: inputValue });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 shrink-0 text-right">검색어</Label>
      <Select value={searchType} onValueChange={(value) => setSearchType(value as CollectionSearchKey)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COLLECTION_SEARCH_TYPE.map((item) => (
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
