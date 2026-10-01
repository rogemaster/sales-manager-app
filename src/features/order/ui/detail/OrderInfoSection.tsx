'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderDetail } from '../../types/order.types';
import { getShoppingMallName } from '@/utils/shoppingMallGenerator';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';
import { Field } from './Field';

// ① 몰 원본은 수정하지 않는다(2026-09-30 결정). 서버도 이 필드를 SET에 넣지 않는다(orderWrite.ts).
type Props = {
  order: OrderDetail;
};

export const OrderInfoSection = ({ order }: Props) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">주문 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="주문번호">
            <p className="text-sm font-medium">{order.orderNumber}</p>
          </Field>
          <Field label="쇼핑몰 주문번호">
            <p className="text-sm font-medium">{order.shopOrderNumber}</p>
          </Field>
          <Field label="결제일">
            <p className="text-sm font-medium">{order.paymentDate}</p>
          </Field>
          <Field label="주문수집일">
            <p className="text-sm font-medium">{order.orderCollectionDate}</p>
          </Field>
          <Field label="쇼핑몰">
            <p className="text-sm font-medium">{getShoppingMallName(order.mallCode)}</p>
          </Field>
          <Field label="주문상품명">
            <p className="text-sm font-medium">{order.orderProductName}</p>
          </Field>
          <Field label="주문금액">
            <p className="text-sm font-medium">{order.orderPrice.toLocaleString()}원</p>
          </Field>
          <Field label="주문수량">
            <p className="text-sm font-medium">{order.orderTotalQuantity}</p>
          </Field>
          <Field label="배송타입">
            <p className="text-sm font-medium">
              {DELIVERY_TYPE_OPTION.find((t) => t.id === order.orderDeliveryType)?.name ?? order.orderDeliveryType}
            </p>
          </Field>
          <Field label="배송비">
            <p className="text-sm font-medium">{order.orderDeliveryPrice.toLocaleString()}원</p>
          </Field>
        </div>
      </CardContent>
    </Card>
  );
};
