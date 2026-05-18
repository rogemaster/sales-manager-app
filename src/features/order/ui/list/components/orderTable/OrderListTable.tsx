import { OrderStatusBadge } from '@/features/order/ui/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ORDERLIST_TABLE_HEAD } from '@/features/order/constant/table.constant';
import { Order } from '@/features/order/types/order.types';
import { Edit } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generatorDeliveryType } from '@/utils/deliveryGenerator';
import { phoneNumberFormatter } from '@/utils/numberGenerator';
import { getShoppingMallName } from '@/utils/shoppingMallGenerator';

interface OrderListTableProps {
  orders: Order[];
}

export const OrderListTable = ({ orders }: OrderListTableProps) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const router = useRouter();

  const handleSelectOrder = (code: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, code]);
    } else {
      setSelectedOrders((prev) => prev.filter((value) => value !== code));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map((item) => item.orderNumber));
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
              checked={selectedOrders.length === orders.length && orders.length > 0}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {ORDERLIST_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className="w-32 text-center">
              {item.title}
            </TableHead>
          ))}
          <TableHead className="text-center">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow
            key={order.orderNumber}
            className="cursor-pointer"
            onClick={() => router.push(`/order/${order.orderNumber}`)}
          >
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedOrders.includes(order.orderNumber)}
                onCheckedChange={(checked: boolean) => handleSelectOrder(order.orderNumber, checked)}
              />
            </TableCell>
            <TableCell className="text-center">{order.orderCollectionDate}</TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground text-center">{order.orderNumber}</TableCell>
            <TableCell className="text-center">{order.shopOrderNumber}</TableCell>
            <TableCell className="text-center">{getShoppingMallName(order.shoppingMallName)}</TableCell>
            <TableCell className="text-center">{order.shoppingMallId}</TableCell>
            <TableCell className="text-center">{<OrderStatusBadge status={order.orderStatus} />}</TableCell>
            <TableCell className="text-center">{order.shopProductId}</TableCell>
            <TableCell>{order.orderProductName}</TableCell>
            <TableCell>{order.orderOption}</TableCell>
            <TableCell className="text-right">{order.orderTotalQuantity}</TableCell>
            <TableCell className="text-right">{order.orderPrice}원</TableCell>
            <TableCell className="text-center">{order.orderName}</TableCell>
            <TableCell className="text-center">{order.payeeName}</TableCell>
            <TableCell className="text-center">{phoneNumberFormatter(order.orderPhoneNumber)}</TableCell>
            <TableCell className="text-center">{phoneNumberFormatter(order.payeePhoneNumber)}</TableCell>
            <TableCell className="text-center">
              {generatorDeliveryType(order.orderDeliveryType, order.orderDeliveryPrice)}
            </TableCell>
            <TableCell className="text-right">{order.orderDeliveryPrice}</TableCell>
            <TableCell className="items-center" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/order/${order.orderNumber}`)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
