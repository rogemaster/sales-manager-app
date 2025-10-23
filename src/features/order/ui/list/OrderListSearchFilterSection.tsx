import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderDateFilter } from './components/orderSearchFiilter/OrderDateFilter';
import { OrderStateFilter } from './components/orderSearchFiilter/OrderStateFilter';
import { OrderSearchInput } from './components/orderSearchFiilter/OrderSearchInput';
import { OrderSearchButton } from './components/orderSearchFiilter/OrderSearchButton';

export const OrderListSearchFilterSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>검색 및 필터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* 왼쪽: 필터 항목들 */}
          <div className="flex-1 space-y-4">
            {/* 검색 일자 */}
            <OrderDateFilter />

            {/* 주문 상태 */}
            <OrderStateFilter />

            {/* 검색어 */}
            <OrderSearchInput />
          </div>

          {/* 오른쪽: 검색 버튼 */}
          <OrderSearchButton />
        </div>
      </CardContent>
    </Card>
  );
};
