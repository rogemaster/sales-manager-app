'use client';

import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { X } from 'lucide-react';
import { Product } from '@/features/products/types/product.types';
import { MOCK_CATEGORY_DATA } from '@/mocks/data/MockCategoryData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkBasicInfoSection = () => {
  const [keywordInput, setKeywordInput] = useState<string>('');
  const { register, setValue, watch, control } = useFormContext<Product>();

  const keyWords = watch('keyWords') ?? [];

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keyWords.includes(keywordInput.trim())) {
      setValue('keyWords', [...keyWords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setValue(
      'keyWords',
      keyWords.filter((k) => k !== keyword),
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">기본 정보</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <BulkEditFieldWrapper group="customerCode" label="고객사 상품코드">
          <Input {...register('customerCode')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="name" label="상품명">
          <Input {...register('name')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="keyWords" label="상품 키워드">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="키워드를 입력하고 Enter를 누르세요."
              />
              <Button type="button" variant="outline" onClick={handleAddKeyword}>
                추가
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {keyWords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <button type="button" onClick={() => handleRemoveKeyword(keyword)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="categoryId" label="카테고리">
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="카테고리를 선택하세요." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_CATEGORY_DATA.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="state" label="판매상태">
          <Controller
            control={control}
            name="state"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="판매상태를 선택하세요." />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
