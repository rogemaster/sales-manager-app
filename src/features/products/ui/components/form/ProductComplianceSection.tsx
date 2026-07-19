'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Product } from '@/features/products/types/product.types';
import {
  ORIGIN_COUNTRIES,
  TAX_TYPE_OPTIONS,
  ADULT_PRODUCT_OPTIONS,
} from '@/features/products/constant/compliance.constants';

export const ProductComplianceSection = () => {
  const { register, control, watch, setValue } = useFormContext<Product>();

  const originCountryCode = watch('originCountryCode');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">규정 정보</CardTitle>
            <CardDescription className="mt-0.5">원산지, 부가세유형, 성인상품여부를 입력하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="originCountryCode"
            control={control}
            render={({ field }) => (
              <FilterSelect
                label="원산지"
                divClassName="space-y-2"
                triggerClassName="w-full"
                value={field.value ?? ''}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value !== 'ETC') {
                    setValue('originCountryEtc', undefined);
                  }
                }}
                options={ORIGIN_COUNTRIES}
                placeholder="원산지를 선택하세요."
              />
            )}
          />

          {originCountryCode === 'ETC' && (
            <div className="space-y-2">
              <Label htmlFor="originCountryEtc">원산지 (기타)</Label>
              <Input id="originCountryEtc" placeholder="원산지를 입력하세요." {...register('originCountryEtc')} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>부가세유형</Label>
          <Controller
            name="taxType"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-6">
                {TAX_TYPE_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`taxType-${option.id}`} />
                    <Label htmlFor={`taxType-${option.id}`}>{option.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>성인상품여부</Label>
          <Controller
            name="adultProductType"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-6">
                {ADULT_PRODUCT_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`adultProductType-${option.id}`} />
                    <Label htmlFor={`adultProductType-${option.id}`}>{option.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
