import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductSearchInput } from '@/features/products/ui/list/components/productSearchFilter/SearchInput';
import { ProductSearchDate } from '@/features/products/ui/list/components/productSearchFilter/SearchDateFilter';
import { ProductSearchSaleState } from '@/features/products/ui/list/components/productSearchFilter/SaleStateFilter';
import { ProductSearchCategory } from '@/features/products/ui/list/components/productSearchFilter/SearchCategoryFilter';

type Props = {
  onSearch: () => void;
};

export const ProductSearchFilterSection = ({ onSearch }: Props) => {
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
          <div className="px-6 py-1"><ProductSearchDate /></div>
          <div className="px-6 py-1"><ProductSearchSaleState /></div>
          <div className="px-6 py-1"><ProductSearchCategory /></div>
          <div className="px-6 py-1"><ProductSearchInput onSearch={onSearch} /></div>
        </div>
      </CardContent>
    </Card>
  );
};
