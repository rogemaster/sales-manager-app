'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';

export const ProductPriceAndQuantityInfo = () => {
  const {
    register,
    formState: { errors },
    watch,
    control,
    setValue,
  } = useFormContext<Product>();

  const deliveryType = watch('deliveryType');
  const isDeliveryPrice = deliveryType === 'NOT_FREE' || deliveryType === 'CONDITIONAL_FREE';

  return (
    <Card>
      <CardHeader>
        <CardTitle>가격 및 수량 정보</CardTitle>
        <CardDescription>상품의 가격과 수량 정보를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplyPrice">공급가</Label>
            <Input type="number" {...register('netPrice', { valueAsNumber: true })} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salePrice">판매가 *</Label>
            <Input
              type="number"
              {...register('price', { required: '판매가를 입력해 주세요.', valueAsNumber: true })}
              placeholder="0"
            />
            {errors.price && <p className="text-red-500 text-sm">{errors.price.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalQuantity">총수량 *</Label>
          <Input
            type="number"
            {...register('totalQuantity', { required: '총 수량을 입력해 주세요.', valueAsNumber: true })}
            placeholder="0"
          />
          {errors.totalQuantity && <p className="text-red-500 text-sm">{errors.totalQuantity.message}</p>}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">배송 정보</h4>
          <Controller
            name="deliveryType"
            control={control}
            rules={{ required: '배송정책을 선택해 주세요.' }}
            render={({ field, fieldState }) => (
              <div>
                <FilterSelect
                  htmlFor="deliveryType"
                  divClassName="space-y-2"
                  label="배송정책 *"
                  triggerClassName="w-full"
                  placeholder="배송정책을 선택하세요."
                  value={field.value ?? ''}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== 'NOT_FREE' && value !== 'CONDITIONAL_FREE') {
                      setValue('deliveryPrice', 0);
                    }
                  }}
                  options={DELIVERY_TYPE_OPTION}
                />
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </div>
            )}
          />
          {isDeliveryPrice && (
            <div className="space-y-2">
              <Label htmlFor="deliveryPrice">배송비 *</Label>
              <Input
                type="number"
                {...register('deliveryPrice', { required: '배송비를 입력해주세요.', valueAsNumber: true })}
                placeholder="0"
              />
              {errors.deliveryPrice && <p className="text-red-500 text-sm">{errors.deliveryPrice.message}</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
