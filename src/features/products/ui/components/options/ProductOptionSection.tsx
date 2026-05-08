'use client';

import { useState } from 'react';
import { ProductOptionCard } from './ProductOptionCard';
import { OptionCombination, Product } from '@/features/products/types/product.types';
import { ProductOptionConfirmTable } from './ProductOptionConfirmTable';
import { useFormContext } from 'react-hook-form';

export const ProductOptionSection = () => {
  const [isOptionsConfirmed, setIsOptionsConfirmed] = useState(false);
  const [isSubOptionsConfirmed, setIsSubOptionsConfirmed] = useState(false);
  const [optionCombinationsData, setOptionCombinationsData] = useState<OptionCombination[]>([]);
  const [subOptionCombinationsData, setSubOptionCombinationsData] = useState<OptionCombination[]>([]);

  const { setValue } = useFormContext<Product>();

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 기본 옵션 */}
        <ProductOptionCard
          type="basic"
          onConfirm={(combinations) => {
            setOptionCombinationsData(combinations);
            setIsOptionsConfirmed(true);
            setValue('option', combinations);
          }}
          onReset={() => {
            setOptionCombinationsData([]);
            setIsOptionsConfirmed(false);
            setValue('option', []);
          }}
        />
        {/* 추가 옵션 */}
        <ProductOptionCard
          type="sub"
          onConfirm={(combinations) => {
            setSubOptionCombinationsData(combinations);
            setIsSubOptionsConfirmed(true);
            setValue('subOption', combinations);
          }}
          onReset={() => {
            setSubOptionCombinationsData([]);
            setIsSubOptionsConfirmed(false);
            setValue('subOption', []);
          }}
        />
      </div>
      {/* 기본 옵션 테이블 */}
      <ProductOptionConfirmTable name="option" isOptionsConfirmed={isOptionsConfirmed} optionCombinations={optionCombinationsData} />
      {/* 추가 옵션 테이블 */}
      <ProductOptionConfirmTable name="subOption" isOptionsConfirmed={isSubOptionsConfirmed} optionCombinations={subOptionCombinationsData} />
    </>
  );
};
