import { useState } from 'react';
import { ProductBasicOption } from './ProductBasicOption';
import { ProductSubOption } from './ProductSubOption';
import { OptionCombination } from '@/features/products/types/ProductTypes';
import { ProductOptionConfirmTable } from './ProductOptionConfirmTable';

type Props = {
  onConfirm?: (combinations: OptionCombination[]) => void;
  onReset?: () => void;
};

export const ProductOptionSection = ({ onConfirm, onReset }: Props) => {
  const [isOptionsConfirmed, setIsOptionsConfirmed] = useState(false);
  const [optionCombinationsData, setOptionCombinationsData] = useState<OptionCombination[]>([]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 기본 옵션 */}
        <ProductBasicOption
          onConfirm={(combinations) => {
            setOptionCombinationsData(combinations);
            setIsOptionsConfirmed(true);
            onConfirm?.(combinations);
          }}
          onReset={() => {
            setOptionCombinationsData([]);
            setIsOptionsConfirmed(false);
            onReset?.();
          }}
        />
        {/* 추가 옵션 */}
        <ProductSubOption />

        {/* 옵션 조합 관리 */}
      </div>
      <ProductOptionConfirmTable isOptionsConfirmed={isOptionsConfirmed} optionCombinations={optionCombinationsData} />
    </>
  );
};
