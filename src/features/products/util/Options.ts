import { v4 as uuidv4 } from 'uuid';
import { OptionCombination, ProductOption } from '../types/ProductTypes';

export const optionCombinations = (options: ProductOption[]) => {
  console.log('옵션조합', options);
  if (options.length === 0) return [];

  const validOptions = options.filter((opt) => opt.name.trim() && opt.values.some((val) => val.trim()));
  if (validOptions.length === 0) return [];

  const optionData = validOptions.map((opt) => ({
    name: opt.name.trim(),
    values: opt.values.filter((val) => val.trim()).map((val) => val.trim()),
  }));

  console.log('옵션 데이터:', optionData);

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
        quantity: '',
        skuCode: '',
      });
      return;
    }

    const currentOption = optionData[index];
    for (const value of currentOption.values) {
      const newString =
        currentString.length > 0
          ? `${currentString}, ${currentCombination}: ${value}`
          : `${currentOption.name}: ${value}`;

      generateCombinations(index + 1, { ...currentCombination, [currentOption.name]: value }, newString);
    }
  };

  generateCombinations(0, {}, '');

  console.log('생성된 조합:', combinations); // 디버깅용
  return combinations;
};
