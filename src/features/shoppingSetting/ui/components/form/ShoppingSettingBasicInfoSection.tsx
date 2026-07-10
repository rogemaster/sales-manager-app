'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import {
  PRODUCT_CONDITION_OPTIONS,
  SALES_PERIOD_OPTIONS,
} from '@/features/shoppingSetting/constant/shoppingSetting.constants';

export const ShoppingSettingBasicInfoSection = () => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ShoppingSetting>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">공통 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor="nickname">별칭 *</Label>
          <Input
            id="nickname"
            placeholder="별칭을 입력하세요."
            {...register('nickname', { required: '별칭을 입력해 주세요.' })}
          />
          {errors.nickname && <p className="text-red-500 text-sm">{errors.nickname.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>상품상태 *</Label>
          <Controller
            name="productCondition"
            control={control}
            rules={{ required: '상품상태를 선택해 주세요.' }}
            render={({ field, fieldState }) => (
              <>
                <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-6">
                  {PRODUCT_CONDITION_OPTIONS.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <RadioGroupItem value={option.id} id={`productCondition-${option.id}`} />
                      <Label htmlFor={`productCondition-${option.id}`}>{option.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>판매기간 *</Label>
          <Controller
            name="salesPeriod"
            control={control}
            rules={{ required: '판매기간을 선택해 주세요.' }}
            render={({ field, fieldState }) => (
              <>
                <RadioGroup
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(val) => field.onChange(Number(val))}
                  className="flex flex-wrap gap-6"
                >
                  {SALES_PERIOD_OPTIONS.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <RadioGroupItem value={option.id} id={`salesPeriod-${option.id}`} />
                      <Label htmlFor={`salesPeriod-${option.id}`}>{option.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
