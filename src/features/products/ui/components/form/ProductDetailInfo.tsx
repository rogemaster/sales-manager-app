'use client';

import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export const ProductDetailInfo = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<Product>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">상품상세설명</CardTitle>
            <CardDescription className="mt-0.5">상품에 대한 자세한 설명을 입력하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Textarea
          {...register('detailPage', { required: '상품상세설명을 입력하세요.' })}
          placeholder="상세설명 입력"
          rows={10}
          className="resize-none"
        />
        {errors.detailPage && <p className="text-red-500 text-sm">{errors.detailPage.message}</p>}
      </CardContent>
    </Card>
  );
};
