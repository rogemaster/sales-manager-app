import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MOCK_ORDERS_DATA } from '@/mocks/data/MockOrdersData';
import { Edit } from 'lucide-react';
import { useState } from 'react';

export const OrderListTable = () => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const handleSelectOrder = (code: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, code]);
    } else {
      setSelectedOrders((prev) => prev.filter((value) => value !== code));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(MOCK_ORDERS_DATA.map((item) => item.categoryId));
    } else {
      setSelectedOrders([]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedOrders.length === MOCK_ORDERS_DATA.length && MOCK_ORDERS_DATA.length > 0}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          <TableHead className="w-32">주문번호</TableHead>
          <TableHead>주문명</TableHead>
          <TableHead>주문상태</TableHead>
          <TableHead>주문금액</TableHead>
          <TableHead>배송비</TableHead>
          <TableHead>주문수집일</TableHead>
          <TableHead>주문수정일</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {MOCK_ORDERS_DATA.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <Checkbox
                checked={selectedOrders.includes(order.id)}
                onCheckedChange={(checked: boolean) => handleSelectOrder(order.id, checked)}
              />
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{order.orderNumber}</TableCell>
            <TableCell className="font-medium">{order.orderName}</TableCell>
            <TableCell>{getStatusBadge(order.status)}</TableCell>
            <TableCell>{order.totalAmount.toLocaleString()}원</TableCell>
            <TableCell>{order.shippingFee === 0 ? '무료' : `${order.shippingFee.toLocaleString()}원`}</TableCell>
            <TableCell>{order.collectedAt}</TableCell>
            <TableCell>{order.modifiedAt}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
