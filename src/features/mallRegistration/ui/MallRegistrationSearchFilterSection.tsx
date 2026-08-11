import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MallRegistrationSearchDate } from './components/searchFilter/SearchDateFilter';
import { MallRegistrationSaleState } from './components/searchFilter/SaleStateFilter';
import { MallRegistrationSearchCategory } from './components/searchFilter/SearchCategoryFilter';
import { MallRegistrationSearchInput } from './components/searchFilter/SearchInput';

type Props = {
  onSearch: () => void;
};

export const MallRegistrationSearchFilterSection = ({ onSearch }: Props) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">검색 및 필터</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          <div className="px-6 py-1">
            <MallRegistrationSearchDate />
          </div>
          <div className="px-6 py-1">
            <MallRegistrationSaleState />
          </div>
          <div className="px-6 py-1">
            <MallRegistrationSearchCategory />
          </div>
          <div className="px-6 py-1">
            <MallRegistrationSearchInput onSearch={onSearch} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
