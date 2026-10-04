'use client';

import { ChangeEventHandler, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import {
  userSearchTypeAtom,
  getUserSearchFilterAtom,
  committedFiltersAtom,
  currentPageAtom,
} from '@/features/account/store/userSearch.store';
import { USER_SEARCH_TYPE } from '@/features/account/constant/user.constants';
import { TEXT_LIMITS } from '@/shared/utils/textLimit';
import { UserSearchType } from '@/features/account/types/user.types';

export const UserSearchInput = () => {
  const [searchType, setSearchType] = useAtom(userSearchTypeAtom);
  const draftFilters = useAtomValue(getUserSearchFilterAtom);
  const setCommittedFilters = useSetAtom(committedFiltersAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);

  // 상세에 다녀와 목록이 확정 검색어로 걸러져 있을 때 칸이 비어 보이지 않게 확정값으로 시작한다.
  const committedSearchValue = useAtomValue(committedFiltersAtom).searchValue;
  const [inputValue, setInputValue] = useState(committedSearchValue);

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
      {/* 선택지는 USER_SEARCH_TYPE에서만 나온다 */}
      <Select value={searchType} onValueChange={(value) => setSearchType(value as UserSearchType['searchType'])}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USER_SEARCH_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1 max-w-md">
        <Input
          placeholder="검색어를 입력하세요..."
          value={inputValue}
          onChange={handleSearchInput}
          onKeyDown={handleKeyDown}
          maxLength={TEXT_LIMITS.search}
        />
      </div>
      <Button onClick={handleSearch}>
        <Search className="h-4 w-4 mr-2" />
        검색
      </Button>
    </div>
  );
};
