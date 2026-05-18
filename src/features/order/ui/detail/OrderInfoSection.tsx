'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderDetail } from '../../types/order.types';
import { getShoppingMallName } from '@/utils/shoppingMallGenerator';
import { DELIVERY_TYPE_OPTION } from '@/constant/delivery.constant';
import { Field } from './Field';

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

export const OrderInfoSection = ({ order, isEditMode }: Props) => {
  const { register, control } = useFormContext<OrderDetail>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 정보</CardTitle>
      </CardHeader>
      <CardContent>
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
            <p className="text-sm font-medium">{getShoppingMallName(order.shoppingMallName)}</p>
          </Field>
          <Field label="주문상품명">
            {isEditMode ? (
              <Input {...register('orderProductName')} />
            ) : (
              <p className="text-sm font-medium">{order.orderProductName}</p>
            )}
          </Field>
          <Field label="주문금액">
            {isEditMode ? (
              <Input type="number" {...register('orderPrice', { valueAsNumber: true })} />
            ) : (
              <p className="text-sm font-medium">{order.orderPrice.toLocaleString()}원</p>
            )}
          </Field>
          <Field label="주문수량">
            {isEditMode ? (
              <Input type="number" {...register('orderTotalQuantity', { valueAsNumber: true })} />
            ) : (
              <p className="text-sm font-medium">{order.orderTotalQuantity}</p>
            )}
          </Field>
          <Field label="배송타입">
            {isEditMode ? (
              <Controller
                control={control}
                name="orderDeliveryType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="배송타입 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_TYPE_OPTION.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <p className="text-sm font-medium">
                {DELIVERY_TYPE_OPTION.find((t) => t.id === order.orderDeliveryType)?.name ?? order.orderDeliveryType}
              </p>
            )}
          </Field>
          <Field label="배송비">
            {isEditMode ? (
              <Input type="number" {...register('orderDeliveryPrice', { valueAsNumber: true })} />
            ) : (
              <p className="text-sm font-medium">{order.orderDeliveryPrice.toLocaleString()}원</p>
            )}
          </Field>
        </div>
      </CardContent>
    </Card>
  );
};
