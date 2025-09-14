'use client';

import { useState } from 'react';
import { ProductOption } from '@/features/products/types/ProductTypes';
import { Card } from '@/components/ui/card';
import { OptionHeader } from './components/OptionHeader';
import { OptionContent } from './components/OptionContent';

export const ProductSubOption = () => {
  const [isOptionsConfirmed, setIsOptionsConfirmed] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);

  // 옵션 추가
  const handleAddOption = () => {
    const newOption: ProductOption = {
      id: `option-${Date.now()}`,
      name: '',
      values: [''],
    };
    setOptions((prev) => [...prev, newOption]);
  };

  // 옵션명 변경
  const handleOptionNameChange = (optionId: string, optionName: string) => {
    setOptions((prev) => prev.map((option) => (option.id === optionId ? { ...option, name: optionName } : option)));
  };

  // 옵션값 변경
  const handleOptionValueChange = (optionId: string, valueIndex: number, value: string) => {
    setOptions((prev) =>
      prev.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.map((v, index) => (index === valueIndex ? value : v)),
            }
          : option,
      ),
    );
  };

  // 옵션값 삭제
  const handleRemoveOptionValue = (optionId: string, valueIndex: number) => {
    setOptions((prev) =>
      prev.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.filter((_, index) => index !== valueIndex),
            }
          : option,
      ),
    );
  };

  // 옵션 삭제
  const handleRemoveOption = (optionId: string) => {
    setOptions((prev) => prev.filter((option) => option.id !== optionId));
  };

  // 옵션 확정
  const handleConfirmOptions = () => {
    // 빈 옵션명이나 값이 있는지 검증
    const hasEmptyOptions = options.some(
      (option) => !option.name.trim() || option.values.some((value) => !value.trim()),
    );

    if (hasEmptyOptions) {
      alert('모든 옵션명과 옵션값을 입력해주세요.');
      return;
    }

    setIsOptionsConfirmed(true);
  };

  // 옵션 재설정
  const handleResetOptions = () => {
    setOptions([]);
    setIsOptionsConfirmed(false);
  };

  return (
    <Card>
      <OptionHeader
        type="sub"
        isOptionsConfirmed={isOptionsConfirmed}
        onAddOption={handleAddOption}
        onConfirmOptions={handleConfirmOptions}
        onResetOptions={handleResetOptions}
      />
      <OptionContent
        type="sub"
        isOptionsConfirmed={isOptionsConfirmed}
        options={options}
        onOptionNameChange={handleOptionNameChange}
        onOptionValueChange={handleOptionValueChange}
        onRemoveOptionValue={handleRemoveOptionValue}
        onRemoveOption={handleRemoveOption}
      />
    </Card>
  );
};
