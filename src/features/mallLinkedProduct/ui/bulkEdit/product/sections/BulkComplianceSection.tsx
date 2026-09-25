'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ADULT_PRODUCT_OPTIONS,
  ORIGIN_COUNTRIES,
  ORIGIN_ETC,
  TAX_TYPE_OPTIONS,
} from '@/features/products/constant/compliance.constants';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkComplianceSection = () => {
  const { register, control, watch, setValue } = useFormContext<Product>();
  const originCountryCode = watch('originCountryCode');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">규정 정보</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <BulkEditFieldWrapper group="originCountry" label="원산지">
          <div className="space-y-2">
            <Controller
              control={control}
              name="originCountryCode"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // 기타 입력창은 언마운트될 뿐 RHF가 값을 들고 있어(shouldUnregister 기본 false),
                    // 지우지 않으면 KR을 골라도 이전 기타값이 함께 전송된다.
                    // undefined가 아니라 ''로 지우는 이유 — undefined는 patch에서 빠지고
                    // clearKeys로만 전달되는데, 여기서 원하는 건 "빈 값으로 덮어쓰기"다.
                    if (value !== ORIGIN_ETC) setValue('originCountryEtc', '');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="원산지를 선택하세요." />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGIN_COUNTRIES.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {originCountryCode === ORIGIN_ETC && (
              <Input placeholder="원산지를 입력하세요." {...register('originCountryEtc')} />
            )}
          </div>
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="taxType" label="부가세유형">
          <Controller
            control={control}
            name="taxType"
            render={({ field }) => (
              <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-4">
                {TAX_TYPE_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`bulk-taxType-${option.id}`} />
                    <Label htmlFor={`bulk-taxType-${option.id}`}>{option.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="adultProductType" label="성인상품여부">
          <Controller
            control={control}
            name="adultProductType"
            render={({ field }) => (
              <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-4">
                {ADULT_PRODUCT_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`bulk-adult-${option.id}`} />
                    <Label htmlFor={`bulk-adult-${option.id}`}>{option.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
