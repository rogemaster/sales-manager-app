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
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<Product>();

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
            rules={{ required: '원산지를 선택해 주세요.' }}
            render={({ field }) => (
              <div className="space-y-2">
                <FilterSelect
                  label="원산지 *"
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
                {errors.originCountryCode && <p className="text-red-500 text-sm">{errors.originCountryCode.message}</p>}
              </div>
            )}
          />

          {originCountryCode === 'ETC' && (
            <div className="space-y-2">
              <Label htmlFor="originCountryEtc">원산지 (기타) *</Label>
              <Input
                id="originCountryEtc"
                placeholder="원산지를 입력하세요."
                {...register('originCountryEtc', {
                  // '기타'에서 다른 국가로 되돌리면 이 입력이 언마운트된다. required면 안 보이는 필드가 제출을 막는다.
                  validate: (value) =>
                    getValues('originCountryCode') !== 'ETC' || !!value?.trim() || '원산지를 입력해 주세요.',
                })}
              />
              {errors.originCountryEtc && <p className="text-red-500 text-sm">{errors.originCountryEtc.message}</p>}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>부가세유형 *</Label>
          <Controller
            name="taxType"
            control={control}
            rules={{ required: '부가세유형을 선택해 주세요.' }}
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
          {errors.taxType && <p className="text-red-500 text-sm">{errors.taxType.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>성인상품여부 *</Label>
          <Controller
            name="adultProductType"
            control={control}
            rules={{ required: '성인상품여부를 선택해 주세요.' }}
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
          {errors.adultProductType && <p className="text-red-500 text-sm">{errors.adultProductType.message}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
