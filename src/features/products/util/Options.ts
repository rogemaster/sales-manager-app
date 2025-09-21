import { v4 as uuidv4 } from 'uuid';
import { OptionCombination, ProductOption } from '../types/ProductTypes';

// 옵션 데이터 예시
// 옵션명: 색상
// 옵션값: 빨강, 노랑, 파랑

// [
//   {
//     id: a1,
//     name: '색상',
//     values: ['빨강', '노랑', '파랑']
//   },
//   {
//     id: a2,
//     name: '사이즈',
//     values: [90, 100, 110]
//   },
// ]

/**
 * 옵션 유효성 검사
 * @param options 옵션데이터
 * @returns
 */
export const validateOptions = (options: ProductOption[]) => {
  if (options.length === 0) return [];

  const validOptions = options.filter((opt) => opt.name.trim() && opt.values.some((val) => val.trim()));
  if (validOptions.length === 0) return [];

  return validOptions;

  // 각 옵션의 유효한 값들만 추출 <-- 필요가 있을까?
  // const optionData = validOptions.map((opt) => ({
  //   name: opt.name.trim(),
  //   values: opt.values.filter((val) => val.trim()).map((val) => val.trim()),
  // }));
};

/**
 * 옵션 조합생성
 * @param optionData 검증완료된 옵션데이터
 * @returns 조합완료된 옵션데이터
 */
export const optionCombinations = (optionData: ProductOption[]) => {
  // 조합 생성 (카르테시안 곱)
  const combinations: OptionCombination[] = [];

  const generateCombinations = (
    index: number,
    currentCombination: { [key: string]: string },
    currentString: string,
  ) => {
    if (index === optionData.length) {
      combinations.push({
        id: `option_${index}_${uuidv4().split('-')[0]}`,
        combination: currentString,
        values: { ...currentCombination },
        quantity: 0,
        skuCode: '',
      });
      return;
    }

    const currentOption = optionData[index];
    for (const value of currentOption.values) {
      const newString =
        currentString.length > 0
          ? `${currentString}, ${currentOption.name}: ${value}`
          : `${currentOption.name}: ${value}`;

      generateCombinations(index + 1, { ...currentCombination, [currentOption.name]: value }, newString);
    }
  };

  generateCombinations(0, {}, '');

  console.log('생성된 조합:', combinations); // 디버깅용
  return combinations;
};
