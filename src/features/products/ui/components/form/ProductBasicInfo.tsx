'use client';

import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { X } from 'lucide-react';
import { MOCK_CATEGORY_DATA } from '@/mocks/data/MockCategoryData';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';

export const ProductBasicinfo = () => {
  const [keywordInput, setKeywordInput] = useState<string>('');

  const {
    register,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useFormContext<Product>();

  const keyWords = watch('keyWords') ?? [];

  const handleRemoveKeyword = (keyword: string) => {
    setValue('keyWords', keyWords.filter((k) => k !== keyword));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keyWords.includes(keywordInput.trim())) {
      setValue('keyWords', [...keyWords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>기본 정보</CardTitle>
        <CardDescription>상품의 기본 정보를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerProductCode">고객사 상품코드</Label>
          <Input {...register('customerCode')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">상품명 *</Label>
          <Input {...register('name', { required: '상품명을 입력해 주세요.' })} />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">상품 키워드</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onKeyDown={handleKeywordKeyDown}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="키워드를 입력하고 Enter를 누르세요"
              />
              <Button type="button" onClick={handleAddKeyword} size="sm">
                추가
              </Button>
            </div>
            {keyWords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keyWords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <span>
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveKeyword(keyword)} />
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="categoryId"
            control={control}
            rules={{ required: '카테고리를 선택해 주세요.' }}
            render={({ field, fieldState }) => (
              <div>
                <FilterSelect
                  label="카테고리 *"
                  divClassName="space-y-2"
                  triggerClassName="w-full"
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  options={MOCK_CATEGORY_DATA}
                  placeholder="카테고리를 선택하세요."
                />
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <Controller
            name="state"
            control={control}
            rules={{ required: '판매상태를 선택해 주세요.' }}
            render={({ field, fieldState }) => (
              <div>
                <FilterSelect
                  label="판매상태 *"
                  divClassName="space-y-2"
                  triggerClassName="w-full"
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  options={PRODUCT_STATUS}
                  placeholder="판매상태를 선택하세요."
                />
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
