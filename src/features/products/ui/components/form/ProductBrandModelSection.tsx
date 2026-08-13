'use client';

import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const ProductBrandModelSection = () => {
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
            <CardTitle className="text-sm">브랜드 및 모델 정보</CardTitle>
            <CardDescription className="mt-0.5">브랜드, 제조업체, 모델 정보를 입력하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="productBrand">브랜드 *</Label>
            <Input
              id="productBrand"
              placeholder="브랜드를 입력하세요."
              {...register('brand', { required: '브랜드를 입력해 주세요.' })}
            />
            {errors.brand && <p className="text-red-500 text-sm">{errors.brand.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="productManufacturer">제조업체 *</Label>
            <Input
              id="productManufacturer"
              placeholder="제조업체를 입력하세요."
              {...register('manufacturer', { required: '제조업체를 입력해 주세요.' })}
            />
            {errors.manufacturer && <p className="text-red-500 text-sm">{errors.manufacturer.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="productModelName">모델명</Label>
            <Input id="productModelName" placeholder="모델명을 입력하세요." {...register('modelName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productModelId">모델번호</Label>
            <Input id="productModelId" placeholder="모델번호를 입력하세요." {...register('modelId')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
