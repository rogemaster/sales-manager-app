'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onSearch: () => void;
};

export const ProductSearchButton = ({ onSearch }: Props) => {
  return (
    <div className="flex items-center">
      <Button onClick={onSearch} size="lg" className="h-32 w-32 px-8 text-lg">
        <Search className="h-6 w-6 mr-3" />
        검색
      </Button>
    </div>
  );
};
