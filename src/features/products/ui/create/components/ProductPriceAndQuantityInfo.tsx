'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { DELIVERY_TYPE_OPTION } from '@/features/products/constant/ProductInfo';
import { Product } from '@/features/products/types/ProductTypes';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const ProductPriceAndQuantityInfo = () => {
  const [deliveryType, setDeliveryType] = useState<string>('');
  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext<Product>();

  const isDeliveryPrice = () => {
    if (deliveryType === 'NOT_FREE' || deliveryType === 'CONDITIONAL_FREE') {
      return true;
    }
    return false;
  };

  const handelDeliveryType = (type: string) => {
    console.log('배송타입', type);
    setValue('deliveryType', type);
    setDeliveryType(type);
  };

  return (
    // 가격 및 수량 정보
    <Card>
      <CardHeader>
        <CardTitle>가격 및 수량 정보</CardTitle>
        <CardDescription>상품의 가격과 수량 정보를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplyPrice">공급가</Label>
            <Input {...register('netPrice')} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salePrice">판매가 *</Label>
            <Input {...register('price', { required: '판매가를 입력해 주세요.' })} placeholder="0" />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalQuantity">총수량 *</Label>
          <Input {...register('totalQuantity', { required: '총 수량을 입력해 주세요.' })} placeholder="0" />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        {/* 배송 정보 */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">배송 정보</h4>
          <FilterSelect
            htmlFor="deliveryType"
            divClassName="space-y-2"
            label="배송정책 *"
            triggerClassName="w-full"
            placeholder="배송정책을 선택하세요."
            value={deliveryType}
            onValueChange={handelDeliveryType}
            options={DELIVERY_TYPE_OPTION}
          />

          {/* <div className="space-y-2">
            <Label htmlFor="deliveryType">배송정책 *</Label>
            <Select value={deliveryType} onValueChange={(value) => setDeliveryType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="배송정책을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">무료배송</SelectItem>
                <SelectItem value="cod">착불</SelectItem>
                <SelectItem value="prepaid">선결제</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {isDeliveryPrice() && (
            <div className="space-y-2">
              <Label htmlFor="deliveryPrice">배송비 *</Label>
              <Input {...register('deliveryPrice', { required: '배송비를 입력해주세요.' })} placeholder="0" />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
