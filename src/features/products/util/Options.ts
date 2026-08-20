import { v4 as uuidv4 } from 'uuid';
import { generatorOptionId } from '@/utils/codeGenerator';
import { OptionCombination, ProductOption, ProductOptionDraft } from '../types/product.types';

/**
 * 옵션 유효성 검사
 * @param options 옵션데이터
 * @returns validOptions 검증완료 옵션데이터
 */
export const validateOptions = (options: ProductOption[]) => {
  if (options.length === 0) return [];

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
  const combinations: OptionCombination[] = [];

  const generateCombinations = (index: number, currentCombination: { [key: string]: string }) => {
    if (index === validOptions.length) {
      combinations.push({
        id: `option_${index}_${uuidv4().split('-')[0]}`,
        values: { ...currentCombination },
        quantity: 0,
        skuCode: '',
        optionPrice: 0,
      });
      return;
    }

    const currentOption = validOptions[index];
    for (const value of currentOption.values) {
      generateCombinations(index + 1, { ...currentCombination, [currentOption.name]: value });
    }
  };

  generateCombinations(0, {});

  return combinations;
};

/**
 * 조합 → 옵션 역파생
 *
 * 폼(`Product.option`)에는 조합 결과만 저장되고 옵션 정의는 남지 않는다.
 * 수정 화면에서 옵션 카드를 채우려면 조합의 `values` 맵에서 옵션명·옵션값을 되짚어야 한다.
 * `id`는 저장되지 않으므로 새로 발급한다.
 *
 * @param combinations 저장된 옵션 조합
 * @returns options 복원된 옵션데이터
 */
export const deriveOptionsFromCombinations = (combinations: OptionCombination[]): ProductOption[] => {
  if (combinations.length === 0) return [];

  const optionNames = Object.keys(combinations[0].values);

  return optionNames.map((name) => ({
    id: generatorOptionId(),
    name,
    values: Array.from(new Set(combinations.map((combination) => combination.values[name]).filter(Boolean))),
  }));
};

/**
 * 옵션 → 입력창 draft 변환
 * @param options 옵션데이터
 * @returns drafts 옵션값이 comma-separated 문자열인 입력 상태
 */
export const toOptionDrafts = (options: ProductOption[]): ProductOptionDraft[] =>
  options.map((option) => ({
    id: option.id,
    name: option.name,
    values: option.values.join(', '),
  }));

/**
 * 조합 표시 라벨 생성 — '색상: 블랙, 사이즈: S'
 *
 * 조합의 `values`에서 그때그때 만든다. 저장 데이터에 라벨을 따로 들고 있으면
 * 옵션값을 고치는 경로(화면·엑셀)마다 라벨 동기화를 기억해야 하고, 빠뜨리면 조용히 갈린다.
 *
 * @param values 조합의 옵션명-값 쌍
 * @returns label 화면 표시용 문자열
 */
export const formatCombinationLabel = (values: OptionCombination['values']): string =>
  Object.entries(values)
    .map(([name, value]) => `${name}: ${value}`)
    .join(', ');
