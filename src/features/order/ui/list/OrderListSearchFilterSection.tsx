import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderDateFilter } from './components/orderSearchFiilter/OrderDateFilter';
import { OrderMallFilter } from './components/orderSearchFiilter/OrderMallFilter';
import { OrderStateFilter } from './components/orderSearchFiilter/OrderStateFilter';
import { OrderSearchInput } from './components/orderSearchFiilter/OrderSearchInput';

export const OrderListSearchFilterSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>검색 및 필터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <OrderDateFilter />
          <OrderMallFilter />
          <OrderStateFilter />
          <OrderSearchInput />
        </div>
      </CardContent>
    </Card>
  );
};
