'use client';

import { useEffect, useMemo, useState } from 'react';
import { OptionCombination, Product } from '@/features/products/types/product.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlert } from '@/hooks/useAlert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

type Props = {
  optionCombinations: OptionCombination[];
  isOptionsConfirmed: boolean;
};

export const ProductOptionConfirmTable = ({ optionCombinations, isOptionsConfirmed }: Props) => {
  const [bulkQuantity, setBulkQuantity] = useState<number>();
  const { showAlert } = useAlert();

  const { register, setValue, control } = useFormContext<Product>();
  const { replace, fields } = useFieldArray({
    control,
    name: 'option',
  });
  const watchedOptionData = useWatch({ control, name: 'option' });
  const optionData = useMemo(() => watchedOptionData ?? [], [watchedOptionData]);

  // 부모에서 전달된 옵션 조합을 폼 필드로 동기화
  useEffect(() => {
    replace(optionCombinations);
  }, [optionCombinations, replace]);

  // 수량확정
  const handleOptionTotalQuantity = () => {
    const total = optionData.reduce((acc, cur) => acc + (Number(cur.quantity) || 0), 0);
    setValue('totalQuantity', total);
  };

  // 수량 일괄설정
  const handleOptionBatchQuantity = () => {
    if (bulkQuantity && !isNaN(Number(bulkQuantity)) && bulkQuantity > 0) {
      const newOption = optionData.map((prev) => ({
        ...prev,
        quantity: bulkQuantity,
      }));

      replace(newOption);
      setValue('totalQuantity', newOption.length * bulkQuantity);

      showAlert({
        type: 'success',
        message: `모든 조합의 수량이 ${bulkQuantity}개로 설정되었습니다.`,
      });
    }
  };

  // SKU 일괄생성
  const handleOptionBatchSKUCode = () => {
    const newOption = optionData.map((prev, index) => ({
      ...prev,
      skuCode: `SKU-${String(index + 1).padStart(3, '0')}`,
    }));
    replace(newOption);
    showAlert({
      type: 'success',
      message: `모든 조합의 SKU 코드가 생성되었습니다.`,
    });
  };

  // 전체 초기화
  const handleOptionReset = () => {
    const resetOption = optionData.map((prev) => ({
      ...prev,
      quantity: 0,
      skuCode: '',
      optionPrice: 0,
    }));

    replace(resetOption);

    showAlert({
      type: 'info',
      message: '모든 조합의 수량과 SKU 코드가 초기화되었습니다.',
    });
  };

  return (
    <>
      {isOptionsConfirmed && optionCombinations.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              옵션 관리
              <Button size="sm" variant="outline" onClick={handleOptionTotalQuantity}>
                수량확정
              </Button>
            </CardTitle>
            <CardDescription>
              생성된 {optionData.length}개의 옵션 조합별로 수량과 SKU 코드를 설정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 조합 목록을 테이블 형태로 표시 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-medium text-sm border-b">옵션 조합 목록</div>
                <div className="divide-y max-h-[25rem] overflow-y-auto">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 hover:bg-muted/30">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        {/* 조합 정보 */}
                        <div className="md:col-span-1">
                          <div className="font-medium text-sm mb-1">조합 {index + 1}</div>
                          <div className="text-sm text-muted-foreground">{field.combination}</div>
                        </div>

                        {/* 수량 입력 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">수량</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-8"
                            {...register(`option.${index}.quantity`, { valueAsNumber: true })}
                          />
                        </div>

                        {/* SKU 코드 입력 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">SKU 코드</Label>
                          <Input placeholder="SKU-001" className="h-8" {...register(`option.${index}.skuCode`)} />
                        </div>

                        {/* 옵션별 추가가격 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">추가 가격</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-8"
                            {...register(`option.${index}.optionPrice`, { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 일괄 설정 버튼들 */}
              <div className="flex gap-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">일괄 수량: </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={bulkQuantity}
                    onChange={(e) => setBulkQuantity(Number(e.target.value))}
                    className="w-20 h-8"
                    min="0"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleOptionBatchQuantity}>
                    수량 일괄설정
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleOptionBatchSKUCode}>
                    SKU 일괄생성
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleOptionReset}>
                    전체 초기화
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
