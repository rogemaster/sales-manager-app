import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderDateFilter } from './components/orderSearchFiilter/OrderDateFilter';
import { OrderMallFilter } from './components/orderSearchFiilter/OrderMallFilter';
import { OrderStateFilter } from './components/orderSearchFiilter/OrderStateFilter';
import { OrderSearchInput } from './components/orderSearchFiilter/OrderSearchInput';

export const OrderListSearchFilterSection = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">검색 및 필터</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-3">
          <div className="px-6 py-1"><OrderDateFilter /></div>
          <div className="px-6 py-1"><OrderMallFilter /></div>
          <div className="px-6 py-1"><OrderStateFilter /></div>
          <div className="px-6 py-1"><OrderSearchInput /></div>
        </div>
      </CardContent>
    </Card>
  );
};
