'use client';

import { SearchIcon } from 'lucide-react';

export const GlobalSearchInput = () => {
  // TODO: 검색 기능
  return (
    <form className="flex w-full max-w-[600px]">
      <div className="flex w-full">
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          className="w-full rounded-l-lg border border-border bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        <button
          type="submit"
          className="rounded-r-lg border border-l-0 border-border bg-muted px-4 transition-colors hover:bg-muted/70"
        >
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </form>
  );
};
