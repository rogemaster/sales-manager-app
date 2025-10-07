'use client';

import { useState } from 'react';
import { OptionCombination, ProductOption, ProductOptionDraft } from '@/features/products/types/ProductTypes';
import { Card } from '@/components/ui/card';
import { OptionHeader } from './components/OptionHeader';
import { OptionContent } from './components/OptionContent';
import { optionCombinations, validateOptions } from '@/features/products/util/Options';
import { useAlert } from '@/hooks/useAlert';

type Props = {
  onConfirm: (combinations: OptionCombination[]) => void;
  onReset: () => void;
};

export const ProductBasicOption = ({ onConfirm, onReset }: Props) => {
  const [isOptionsConfirmed, setIsOptionsConfirmed] = useState(false);
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);
  const [confirmedOptions, setConfirmedOptions] = useState<ProductOption[]>();

  const { showAlert } = useAlert();

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
              values: value,
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
    const optionData: ProductOption[] = options.map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values.split(','),
    }));

    const validOptions = validateOptions(optionData);

    if (validOptions.length === 0) {
      return showAlert({
        type: 'error',
        message: '유효한 옵션이 없습니다. 옵션명과 옵션값을 확인해 주세요.',
      });
    }

    setConfirmedOptions(validOptions);

    const optionCombinationsData = optionCombinations(validOptions);
    if (optionCombinationsData.length > 0) {
      setIsOptionsConfirmed(true);
      onConfirm(optionCombinationsData);
    }
  };

  // 옵션 재설정
  const handleResetOptions = () => {
    setIsOptionsConfirmed(false);
    onReset();
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
        confirmedOptions={confirmedOptions}
      />
    </Card>
  );
};
