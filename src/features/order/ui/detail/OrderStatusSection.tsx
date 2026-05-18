'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { OrderDetail } from '../../types/order.types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { ORDER_STATUS } from '../../constant/status.constants';
import { DELIVERY_COMPANY } from '@/constant/delivery.constant';

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

export const OrderStatusSection = ({ order, isEditMode }: Props) => {
  const { control, register } = useFormContext<OrderDetail>();
  const watchedStatus = useWatch({ control, name: 'orderStatus' });

  const showDeliveryFields = isEditMode
    ? watchedStatus === 'INVOICE_REGISTER'
    : order.orderStatus === 'INVOICE_REGISTER';

  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 상태</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {showDeliveryFields && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">택배사</p>
              {isEditMode ? (
                <Controller
                  control={control}
                  name="deliveryCompany"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="택배사 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_COMPANY.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <p className="text-sm font-medium">
                  {DELIVERY_COMPANY.find((c) => c.id === order.deliveryCompany)?.name ?? order.deliveryCompany ?? '-'}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">송장번호</p>
              {isEditMode ? (
                <Input {...register('invoiceNumber')} placeholder="송장번호를 입력하세요" />
              ) : (
                <p className="text-sm font-medium">{order.invoiceNumber || '-'}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
