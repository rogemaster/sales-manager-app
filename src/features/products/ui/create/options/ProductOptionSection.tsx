import { useState } from 'react';
import { ProductBasicOption } from './ProductBasicOption';
import { ProductSubOption } from './ProductSubOption';
import { OptionCombination, Product } from '@/features/products/types/product.types';
import { ProductOptionConfirmTable } from './ProductOptionConfirmTable';
import { useFormContext } from 'react-hook-form';

type Props = {
  onConfirm?: (combinations: OptionCombination[]) => void;
  onReset?: () => void;
};

export const ProductOptionSection = ({ onConfirm, onReset }: Props) => {
  const [isOptionsConfirmed, setIsOptionsConfirmed] = useState(false);
  const [optionCombinationsData, setOptionCombinationsData] = useState<OptionCombination[]>([]);

  const { setValue } = useFormContext<Product>();

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 기본 옵션 */}
        <ProductBasicOption
          onConfirm={(combinations) => {
            setOptionCombinationsData(combinations);
            setIsOptionsConfirmed(true);
            onConfirm?.(combinations);
            setValue('option', combinations);
          }}
          onReset={() => {
            setOptionCombinationsData([]);
            setIsOptionsConfirmed(false);
            onReset?.();
            setValue('option', []);
          }}
        />
        {/* 추가 옵션 */}
        <ProductSubOption />

        {/* 조합된 옵션 테이블 */}
      </div>
      <ProductOptionConfirmTable isOptionsConfirmed={isOptionsConfirmed} optionCombinations={optionCombinationsData} />
    </>
  );
};
