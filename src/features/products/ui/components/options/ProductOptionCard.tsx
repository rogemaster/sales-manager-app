'use client';

import { useState } from 'react';
import { OptionCombination, ProductOption, ProductOptionDraft } from '@/features/products/types/product.types';
import { Card } from '@/components/ui/card';
import { OptionHeader } from './components/OptionHeader';
import { OptionContent } from './components/OptionContent';
import { optionCombinations, validateOptions } from '@/features/products/util/Options';
import { useAlert } from '@/hooks/useAlert';
import { generatorOptionId } from '@/utils/codeGenerator';

type Props = {
  type: 'basic' | 'sub';
  onConfirm: (combinations: OptionCombination[]) => void;
  onReset: () => void;
};

export const ProductOptionCard = ({ type, onConfirm, onReset }: Props) => {
  const [isOptionsConfirmed, setIsOptionsConfirmed] = useState(false);
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);
  const [confirmedOptions, setConfirmedOptions] = useState<ProductOption[]>();

  const { showAlert } = useAlert();

  const handleAddOption = () => {
    const newOption: ProductOptionDraft = {
      id: generatorOptionId(),
      name: '',
      values: '',
    };
    setOptions((prev) => [...prev, newOption]);
  };

  const handleOptionNameChange = (optionId: string, optionName: string) => {
    setOptions((prev) => prev.map((option) => (option.id === optionId ? { ...option, name: optionName } : option)));
  };

  const handleOptionValueChange = (optionId: string, value: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === optionId ? { ...opt, values: value } : opt)),
    );
  };

  const handleRemoveOption = (optionId: string) => {
    setOptions((prev) => prev.filter((option) => option.id !== optionId));
  };

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

    const combinations = optionCombinations(validOptions);
    if (combinations.length > 0) {
      setIsOptionsConfirmed(true);
      onConfirm(combinations);
    }
  };

  const handleResetOptions = () => {
    setIsOptionsConfirmed(false);
    onReset();
  };

  return (
    <Card>
      <OptionHeader
        type={type}
        isOptionsConfirmed={isOptionsConfirmed}
        onAddOption={handleAddOption}
        onConfirmOptions={handleConfirmOptions}
        onResetOptions={handleResetOptions}
      />
      <OptionContent
        type={type}
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
