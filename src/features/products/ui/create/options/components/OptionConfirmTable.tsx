'use client';

import { useState } from 'react';
import { OptionCombination } from '@/features/products/types/ProductTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlert } from '@/hooks/useAlert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  optionCombinations: OptionCombination[];
  isOptionsConfirmed: boolean;
};

export const OptionConfirmTable = ({ optionCombinations, isOptionsConfirmed }: Props) => {
  const [optionCombinationsData, setOptionCombinationsData] = useState<OptionCombination[]>(optionCombinations);
  const [bulkQuantity, setBulkQuantity] = useState<number>(0);
  const { showAlert } = useAlert();

  // 옵션 조합 수정
  const handleOptionCombinationChange = (id: string, field: 'quantity' | 'skuCode' | 'optionPrice', value: string) => {
    setOptionCombinationsData((prev) =>
      prev.map((combo) =>
        combo.id === id ? { ...combo, [field]: field === 'quantity' ? Number(value) || 0 : value } : combo,
      ),
    );
  };

  const handleOptionBatchQuantity = () => {
    if (bulkQuantity && !isNaN(Number(bulkQuantity)) && bulkQuantity >= 0) {
      setOptionCombinationsData((prev) => prev.map((combo) => ({ ...combo, quantity: bulkQuantity })));
      showAlert({
        type: 'success',
        message: `모든 조합의 수량이 ${bulkQuantity}개로 설정되었습니다.`,
      });
    }
  };

  const handleOptionBatchSKUCode = () => {
    setOptionCombinationsData((prev) =>
      prev.map((combo, index) => ({
        ...combo,
        skuCode: `SKU-${String(index + 1).padStart(3, '0')}`,
      })),
    );
    showAlert({
      type: 'success',
      message: `모든 조합의 SKU 코드가 생성되었습니다.`,
    });
  };

  const handleOptionReset = () => {
    setOptionCombinationsData((prev) => prev.map((combo) => ({ ...combo, quantity: 0, skuCode: '' })));
    showAlert({
      type: 'info',
      message: '모든 조합의 수량과 SKU 코드가 초기화되었습니다.',
    });
  };

  return (
    <>
      {isOptionsConfirmed && optionCombinationsData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>옵션 조합 관리</CardTitle>
            <CardDescription>
              생성된 {optionCombinationsData.length}개의 옵션 조합별로 수량과 SKU 코드를 설정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 조합 목록을 테이블 형태로 표시 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-medium text-sm border-b">옵션 조합 목록</div>
                <div className="divide-y">
                  {optionCombinationsData.map((combo, index) => (
                    <div key={combo.id} className="p-4 hover:bg-muted/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        {/* 조합 정보 */}
                        <div className="md:col-span-1">
                          <div className="font-medium text-sm mb-1">조합 {index + 1}</div>
                          <div className="text-sm text-muted-foreground">{combo.combination}</div>
                        </div>

                        {/* 수량 입력 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">수량</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={combo.quantity}
                            onChange={(e) => handleOptionCombinationChange(combo.id, 'quantity', e.target.value)}
                            className="h-8"
                          />
                        </div>

                        {/* SKU 코드 입력 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">SKU 코드</Label>
                          <Input
                            placeholder="SKU-001"
                            value={combo.skuCode}
                            onChange={(e) => handleOptionCombinationChange(combo.id, 'skuCode', e.target.value)}
                            className="h-8"
                          />
                        </div>

                        {/* 옵션별 추가가격 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">추가 옵션가</Label>
                          <Input
                            placeholder="SKU-001"
                            value={combo.skuCode}
                            onChange={(e) => handleOptionCombinationChange(combo.id, 'optionPrice', e.target.value)}
                            className="h-8"
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
