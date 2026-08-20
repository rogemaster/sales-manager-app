'use client';

import { ProductOptionCard } from './ProductOptionCard';
import { ProductOptionConfirmTable } from './ProductOptionConfirmTable';
import { useProductOptionState } from './hooks/useProductOptionState';

export const ProductOptionSection = () => {
  const basicOption = useProductOptionState('option');
  const subOption = useProductOptionState('subOption');

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 기본 옵션 */}
        <ProductOptionCard
          key={`basic-${basicOption.seedKey}`}
          type="basic"
          initialOptions={basicOption.initialOptions}
          onConfirm={basicOption.confirm}
          onReset={basicOption.reset}
        />
        {/* 추가 옵션 */}
        <ProductOptionCard
          key={`sub-${subOption.seedKey}`}
          type="sub"
          initialOptions={subOption.initialOptions}
          onConfirm={subOption.confirm}
          onReset={subOption.reset}
        />
      </div>
      {/* 기본 옵션 테이블 */}
      <ProductOptionConfirmTable
        name="option"
        isOptionsConfirmed={basicOption.isConfirmed}
        optionCombinations={basicOption.combinations}
      />
      {/* 추가 옵션 테이블 */}
      <ProductOptionConfirmTable
        name="subOption"
        isOptionsConfirmed={subOption.isConfirmed}
        optionCombinations={subOption.combinations}
      />
    </>
  );
};
