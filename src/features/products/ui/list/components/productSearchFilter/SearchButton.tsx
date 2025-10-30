'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAtomValue } from 'jotai';
import { getSearchFilterAtom } from '@/features/products/store/search.store';

export const ProductSearchButton = () => {
  const data = useAtomValue(getSearchFilterAtom);

  const handleSearch = () => {
    console.log('검색결과', data);
  };

  return (
    <div className="flex items-center">
      <Button onClick={handleSearch} size="lg" className="h-32 w-32 px-8 text-lg">
        <Search className="h-6 w-6 mr-3" />
        검색
      </Button>
    </div>
  );
};
