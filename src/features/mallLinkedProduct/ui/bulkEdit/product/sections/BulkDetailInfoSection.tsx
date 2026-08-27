'use client';

import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkDetailInfoSection = () => {
  const { register } = useFormContext<Product>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">상품 상세설명</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <BulkEditFieldWrapper group="detailPage" label="상품상세설명">
          <Textarea
            rows={10}
            className="resize-none"
            placeholder="상품상세설명을 입력하세요."
            {...register('detailPage')}
          />
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
