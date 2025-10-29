import { getOrderSearchFilterAtom } from '@/features/order/store/search.store';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export const OrderSearchButton = () => {
  const data = useAtomValue(getOrderSearchFilterAtom);

  const handleSearch = () => {
    console.log('검색결과', data);
  };

  return (
    <div className="flex items-center">
      <Button onClick={handleSearch} size="lg" className="h-32 px-8 text-lg">
        <Search className="h-6 w-6 mr-3" />
        검색
      </Button>
    </div>
  );
};
