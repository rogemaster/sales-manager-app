'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { OrderDetail } from '../../types/order.types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { LOCKED_ORDER_STATUSES, selectableOrderStatuses } from '../../util/orderStatusRule';
import { DELIVERY_COMPANY } from '@/shared/constant/delivery.constant';

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

export const OrderStatusSection = ({ order, isEditMode }: Props) => {
  const { control, register } = useFormContext<OrderDetail>();
  const watchedStatus = useWatch({ control, name: 'orderStatus' });

  // 잠긴 상태(송장등록 이후·완료)는 상태를 바꿀 수 없다 — 서버도 같은 규칙으로 거절한다(orderStatusRule.ts).
  const isStatusLocked = LOCKED_ORDER_STATUSES.includes(order.orderStatus);
  const showDeliveryFields = isEditMode
    ? watchedStatus === 'INVOICE_REGISTER' || order.orderStatus === 'INVOICE_COMPLETE'
    : order.orderStatus === 'INVOICE_REGISTER' || order.orderStatus === 'INVOICE_COMPLETE';
  // 송장전송완료 뒤에는 몰에 이미 보낸 송장이라 고치지 않는다.
  const canEditInvoice = isEditMode && watchedStatus === 'INVOICE_REGISTER';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">주문 상태</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {isEditMode && !isStatusLocked ? (
          <Controller
            control={control}
            name="orderStatus"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* 저장된 현재 상태 기준 — 폼에서 고른 값 기준이면 고를수록 선택지가 바뀐다. */}
                  {selectableOrderStatuses(order.orderStatus).map((status) => (
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
              {canEditInvoice ? (
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
              {canEditInvoice ? (
                <Input {...register('invoiceNumber')} placeholder="송장번호를 입력하세요" />
              ) : (
                <p className="text-sm font-medium">{order.invoiceNumber || '-'}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">송장등록일</p>
              <p className="text-sm font-medium">{order.invoiceRegisteredAt ?? '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">송장전송완료일</p>
              <p className="text-sm font-medium">{order.invoiceSentAt ?? '-'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
