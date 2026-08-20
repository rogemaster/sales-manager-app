'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { OptionCombination, Product, ProductOption } from '@/features/products/types/product.types';
import { deriveOptionsFromCombinations } from '@/features/products/util/Options';

type OptionFieldName = 'option' | 'subOption';

/**
 * 옵션 카드·조합 테이블의 화면 상태를 폼 값과 이어준다.
 *
 * 옵션 UI는 로컬 state로 동작하고 확정 시점에만 폼으로 값을 흘려보낸다.
 * 그래서 수정 화면처럼 폼이 뒤늦게 `reset()`으로 채워지는 경우 화면이 빈 채로 남는데,
 * 폼에 값이 처음 들어오는 순간 한 번 시딩해 그 간극을 메운다.
 *
 * 시딩은 최초 1회뿐이다. 이후에는 사용자 조작(`confirm`/`reset`)이 유일한 갱신 경로다.
 */
export const useProductOptionState = (name: OptionFieldName) => {
  const { control, setValue } = useFormContext<Product>();
  const formCombinations = useWatch({ control, name });

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [combinations, setCombinations] = useState<OptionCombination[]>([]);
  const [initialOptions, setInitialOptions] = useState<ProductOption[]>();
  // 시딩된 초기값을 옵션 카드의 useState 초기값으로 넘기기 위한 remount 키
  const [seedKey, setSeedKey] = useState(0);
  const isSeededRef = useRef(false);

  useEffect(() => {
    if (isSeededRef.current) return;
    if (!formCombinations?.length) return;

    isSeededRef.current = true;
    setInitialOptions(deriveOptionsFromCombinations(formCombinations));
    setCombinations(formCombinations);
    setIsConfirmed(true);
    setSeedKey((key) => key + 1);
  }, [formCombinations]);

  const confirm = useCallback(
    (nextCombinations: OptionCombination[]) => {
      // 사용자가 직접 확정한 값이 시딩으로 덮이지 않게 막는다
      isSeededRef.current = true;
      setCombinations(nextCombinations);
      setIsConfirmed(true);
      setValue(name, nextCombinations);
    },
    [name, setValue],
  );

  const reset = useCallback(() => {
    isSeededRef.current = true;
    setCombinations([]);
    setIsConfirmed(false);
    setValue(name, []);
  }, [name, setValue]);

  return { isConfirmed, combinations, initialOptions, seedKey, confirm, reset };
};
