'use client';

import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkBrandModelSection = () => {
  const { register } = useFormContext<Product>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">브랜드 및 모델</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <BulkEditFieldWrapper group="brand" label="브랜드">
          <Input placeholder="브랜드를 입력하세요." {...register('brand')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="manufacturer" label="제조업체">
          <Input placeholder="제조업체를 입력하세요." {...register('manufacturer')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="modelName" label="모델명">
          <Input placeholder="모델명을 입력하세요." {...register('modelName')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="modelId" label="모델번호">
          <Input placeholder="모델번호를 입력하세요." {...register('modelId')} />
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
