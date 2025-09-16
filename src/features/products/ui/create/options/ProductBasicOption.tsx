'use client';

import { useState } from 'react';
import { ProductOption, ProductOptionDraft } from '@/features/products/types/ProductTypes';
import { Card } from '@/components/ui/card';
import { OptionHeader } from './components/OptionHeader';
import { OptionContent } from './components/OptionContent';

export const ProductBasicOption = () => {
  const [isOptionsConfirmed, setIsOptionsConfirmed] = useState(false);
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);

  // 옵션 추가
  const handleAddOption = () => {
    const newOption: ProductOptionDraft = {
      id: `option-${Date.now()}`,
      name: '',
      values: '',
    };
    setOptions((prev) => [...prev, newOption]);
  };

  // 옵션명 변경
  const handleOptionNameChange = (optionId: string, optionName: string) => {
    setOptions((prev) => prev.map((option) => (option.id === optionId ? { ...option, name: optionName } : option)));
  };

  // 옵션값 변경
  const handleOptionValueChange = (optionId: string, value: string) => {
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              values: value || opt.values,
            }
          : opt,
      ),
    );
  };

  // 옵션 삭제
  const handleRemoveOption = (optionId: string) => {
    setOptions((prev) => prev.filter((option) => option.id !== optionId));
  };

  // 옵션 확정
  const handleConfirmOptions = () => {
    console.log('옵션확정', options);

    // 빈 옵션명이나 값이 있는지 검증
    // const hasEmptyOptions = options.some(
    //   (option) => !option.name.trim() || option.values.some((value) => !value.trim()),
    // );

    // if (hasEmptyOptions) {
    //   alert('모든 옵션명과 옵션값을 입력해주세요.');
    //   return;
    // }

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
        type="basic"
        isOptionsConfirmed={isOptionsConfirmed}
        onAddOption={handleAddOption}
        onConfirmOptions={handleConfirmOptions}
        onResetOptions={handleResetOptions}
      />
      <OptionContent
        type="basic"
        isOptionsConfirmed={isOptionsConfirmed}
        options={options}
        onOptionNameChange={handleOptionNameChange}
        onOptionValueChange={handleOptionValueChange}
        onRemoveOption={handleRemoveOption}
      />
    </Card>
  );
};
