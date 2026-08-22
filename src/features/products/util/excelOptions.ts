import { OptionCombination, ProductOption } from '@/features/products/types/product.types';
import { ExcelRowWithErrors } from '@/types/excel.type';
import { optionCombinations, validateOptions } from './Options';

/** 엑셀에서 읽은 옵션명·옵션값 한 쌍. 시트 셀이라 타입을 특정할 수 없다 */
export interface ExcelOptionPair {
  name: unknown;
  values: unknown;
}

/**
 * 시트 셀 값 → 문자열
 *
 * 숫자만 적은 칸은 number로 파싱되고, `ExcelRowWithErrors`의 값 타입에는
 * `ValidationError[]`도 포함돼 있어 배열이 들어올 수 있다.
 * 그대로 `.split(',')`·`.trim()`을 부르면 터지므로 `String()`으로 좁힌다.
 * (`as string`은 컴파일 타임 캐스팅이라 런타임 값이 number인 채로 남는다)
 */
export const toText = (value: unknown): string => {
  if (value === null || value === undefined || Array.isArray(value)) return '';
  return String(value).trim();
};

/** 콤마 구분 옵션값 셀 → 값 배열 */
const toOptionValues = (value: unknown): string[] =>
  toText(value)
    .split(',')
    .map((optionValue) => optionValue.trim())
    .filter(Boolean);

/**
 * 엑셀 옵션 컬럼 → 옵션 조합
 *
 * 조합 생성은 화면과 같은 `validateOptions`·`optionCombinations`에 맡긴다.
 * 1행 = 1상품이라 조합별 수량·SKU를 개별 지정할 수 없어, 수량은 총수량 값을 그대로 넣고
 * SKU는 접두사에 순번을 붙여 채번한다. `optionPrice`는 지정 수단이 없어 0으로 남는다.
 *
 * @param pairs 옵션명·옵션값 셀 쌍
 * @param quantity 모든 조합에 넣을 수량 (총수량 컬럼 값)
 * @param skuPrefix SKU 접두사. 빈 문자열이면 skuCode를 채우지 않는다
 * @returns 조합 배열. 유효한 옵션이 하나도 없으면 undefined
 */
export const buildCombinationsFromExcel = (
  pairs: ExcelOptionPair[],
  quantity: number,
  skuPrefix: string,
): OptionCombination[] | undefined => {
  const options: ProductOption[] = pairs.map((pair) => ({
    name: toText(pair.name),
    values: toOptionValues(pair.values),
  }));

  const validOptions = validateOptions(options);
  if (validOptions.length === 0) return undefined;

  return optionCombinations(validOptions).map((combination, index) => ({
    ...combination,
    quantity,
    skuCode: skuPrefix ? `${skuPrefix}-${String(index + 1).padStart(3, '0')}` : '',
  }));
};

/**
 * 엑셀 한 행 → 기본옵션·추가옵션 pair 묶음
 *
 * 옵션 컬럼명을 아는 자리를 여기 하나로 모은다. 전략(저장)과 미리보기(표시)가
 * 각자 리터럴을 들고 있으면 컬럼명이 바뀔 때 한쪽만 조용히 빈 값을 만든다.
 *
 * @param row 업로드된 엑셀 한 행
 * @returns `buildCombinationsFromExcel`·`formatExcelOptionSummary`에 그대로 넘길 수 있는 pair 묶음
 */
export const toExcelOptionPairs = (
  row: ExcelRowWithErrors,
): { pairs: ExcelOptionPair[]; subPairs: ExcelOptionPair[] } => ({
  pairs: [
    { name: row['옵션명1'], values: row['옵션값1'] },
    { name: row['옵션명2'], values: row['옵션값2'] },
  ],
  subPairs: [{ name: row['추가옵션명'], values: row['추가옵션값'] }],
});

/**
 * 엑셀 옵션 컬럼 → 미리보기 표시용 요약 문자열
 *
 * 저장 전 사용자가 옵션을 눈으로 확인하는 용도다. 실제 저장되는 값과 같은 정규화를 거치도록
 * `buildCombinationsFromExcel`과 `toOptionValues`를 공유한다.
 *
 * @param pairs 기본옵션 셀 쌍
 * @param subPairs 추가옵션 셀 쌍
 * @returns '색상: 블랙,화이트 / 사이즈: S,M,L / 추가) 각인: 유,무'
 */
export const formatExcelOptionSummary = (pairs: ExcelOptionPair[], subPairs: ExcelOptionPair[]): string => {
  const toLabels = (list: ExcelOptionPair[], prefix: string) =>
    list
      .map((pair) => ({ name: toText(pair.name), values: toOptionValues(pair.values) }))
      .filter((pair) => pair.name && pair.values.length > 0)
      .map((pair) => `${prefix}${pair.name}: ${pair.values.join(',')}`);

  return [...toLabels(pairs, ''), ...toLabels(subPairs, '추가) ')].join(' / ');
};

/**
 * 저장될 총수량 — 기본옵션이 있으면 조합 수만큼 곱한다
 *
 * 화면의 `수량확정`·`수량 일괄설정`이 쓰는 규칙과 같다(`ProductOptionConfirmTable`).
 * 추가옵션은 반영하지 않는다 — 화면에서도 `name === 'option'`일 때만 갱신한다.
 *
 * @param option 기본옵션 조합. 없으면 `undefined`
 * @param quantity 총수량 컬럼 값
 */
export const resolveTotalQuantity = (option: OptionCombination[] | undefined, quantity: number): number =>
  option ? option.length * quantity : quantity;

/**
 * 엑셀 한 행이 저장될 때의 총수량
 *
 * 미리보기가 저장될 값과 같은 숫자를 보여주기 위한 것이다. 전략과 계산식을 공유해야
 * 나중에 한쪽만 바뀌는 일이 없다. SKU 접두사는 수량 계산에 영향이 없으므로 빈 문자열을 넘긴다.
 *
 * @param row 업로드된 엑셀 한 행
 */
export const resolveExcelTotalQuantity = (row: ExcelRowWithErrors): number => {
  const quantity = Number(row['총수량']) || 0;
  const { pairs } = toExcelOptionPairs(row);

  return resolveTotalQuantity(buildCombinationsFromExcel(pairs, quantity, ''), quantity);
};
