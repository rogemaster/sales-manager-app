'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

// 빈 입력을 NaN이 아니라 undefined로 받는다 — valueAsNumber를 쓰면 "비었다"와 "0"을 구분할 수 없다.
const numberOptions = { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) };

export const BulkPriceQuantitySection = () => {
  const { register, control, watch, setValue } = useFormContext<Product>();

  // 원본(ProductPriceAndQuantityInfo)과 같은 조건. 무료/착불이면 배송비 입력이 의미가 없다.
  const deliveryType = watch('deliveryType');
  const isDeliveryPrice = deliveryType === 'NOT_FREE' || deliveryType === 'CONDITIONAL_FREE';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">가격 및 수량</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <BulkEditFieldWrapper group="netPrice" label="공급가">
          <Input type="number" placeholder="0" {...register('netPrice', numberOptions)} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="price" label="판매가">
          <Input type="number" placeholder="0" {...register('price', numberOptions)} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="totalQuantity" label="총수량">
          <Input type="number" placeholder="0" {...register('totalQuantity', numberOptions)} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="delivery" label="배송정책 · 배송비">
          <div className="space-y-2">
            <Controller
              control={control}
              name="deliveryType"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // 무료·착불로 바꾸면 이전에 입력한 배송비가 남아 함께 전송되므로 0으로 되돌린다 (원본과 동일).
                    if (value !== 'NOT_FREE' && value !== 'CONDITIONAL_FREE') setValue('deliveryPrice', 0);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="배송정책을 선택하세요." />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_TYPE_OPTION.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {isDeliveryPrice && (
              <div className="space-y-2">
                <Label htmlFor="bulk-deliveryPrice">배송비</Label>
                <Input
                  id="bulk-deliveryPrice"
                  type="number"
                  placeholder="0"
                  {...register('deliveryPrice', numberOptions)}
                />
              </div>
            )}
          </div>
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
