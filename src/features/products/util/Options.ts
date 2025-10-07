import { v4 as uuidv4 } from 'uuid';
import { OptionCombination, ProductOption } from '../types/ProductTypes';

/**
 * 옵션 유효성 검사
 * @param options 옵션데이터
 * @returns validOptions 검증완료 옵션데이터
 */
export const validateOptions = (options: ProductOption[]) => {
  if (options.length === 0) return [];

  // 1) 옵션명 공백 제거 및 비어있지 않은지 확인
  // 2) 값 배열 내부도 공백 제거 및 비어있는 값 제거
  const normalizedOptions = options.map((opt) => ({
    ...opt,
    name: opt.name.trim(),
    values: opt.values.map((val) => val.trim()).filter((val) => val.length > 0),
  }));

  const validOptions = normalizedOptions.filter((opt) => opt.name && opt.values.length > 0);
  if (validOptions.length === 0) return [];

  return validOptions;
};

/**
 * 옵션 조합생성
 * @param validOptions 검증완료된 옵션데이터
 * @returns combinations 조합완료된 옵션데이터
 */
export const optionCombinations = (validOptions: ProductOption[]) => {
  // 조합 생성 (카르테시안 곱)
  const combinations: OptionCombination[] = [];

  const generateCombinations = (
    index: number,
    currentCombination: { [key: string]: string },
    currentString: string,
  ) => {
    if (index === validOptions.length) {
      combinations.push({
        id: `option_${index}_${uuidv4().split('-')[0]}`,
        combination: currentString,
        values: { ...currentCombination },
        quantity: 0,
        skuCode: '',
      });
      return;
    }

    const currentOption = validOptions[index];
    for (const value of currentOption.values) {
      const newString =
        currentString.length > 0
          ? `${currentString}, ${currentOption.name}: ${value}`
          : `${currentOption.name}: ${value}`;

      generateCombinations(index + 1, { ...currentCombination, [currentOption.name]: value }, newString);
    }
  };

  generateCombinations(0, {}, '');

  return combinations;
};
