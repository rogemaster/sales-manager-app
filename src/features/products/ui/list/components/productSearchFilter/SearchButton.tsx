import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ProductSearchButton = () => {
  const handleSearch = () => {}

  return (
    <div className="flex items-center">
      <Button onClick={handleSearch} size="lg" className="h-32 px-8 text-lg">
        <Search className="h-6 w-6 mr-3" />
        검색
      </Button>
    </div>
  );
};
