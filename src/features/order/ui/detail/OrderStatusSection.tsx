'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderDetail } from '../../types/order.types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { ORDER_STATUS } from '../../constant/status.constants';

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

export const OrderStatusSection = ({ order, isEditMode }: Props) => {
  const { control } = useFormContext<OrderDetail>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 상태</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditMode ? (
          <Controller
            control={control}
            name="orderStatus"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <OrderStatusBadge status={order.orderStatus} />
        )}
      </CardContent>
    </Card>
  );
};
