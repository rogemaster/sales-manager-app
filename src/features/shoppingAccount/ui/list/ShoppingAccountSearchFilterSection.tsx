import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountDateFilter } from './components/AccountDateFilter';
import { AccountStatusFilter } from './components/AccountStatusFilter';
import { AccountMallFilter } from './components/AccountMallFilter';
import { AccountSearchInput } from './components/AccountSearchInput';

export const ShoppingAccountSearchFilterSection = () => {
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
          <div className="px-6 py-1"><AccountDateFilter /></div>
          <div className="px-6 py-1 flex items-center gap-8">
            <AccountStatusFilter />
            <AccountMallFilter />
          </div>
          <div className="px-6 py-1"><AccountSearchInput /></div>
        </div>
      </CardContent>
    </Card>
  );
};
