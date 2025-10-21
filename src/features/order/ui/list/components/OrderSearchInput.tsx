import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchValueAtom } from '@/features/order/store/OrderSearch.store';
import { useAtom } from 'jotai';
import { Search } from 'lucide-react';
import { ChangeEventHandler } from 'react';

export const OrderSearchInput = () => {
  const [getSearchValue, setSearchValue] = useAtom(searchValueAtom);

  const handleSearchInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSearchValue(e.target.value);
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="주문번호 또는 주문명으로 검색..."
          value={getSearchValue}
          onChange={handleSearchInput}
          className="pl-10"
        />
      </div>
    </div>
  );
};
