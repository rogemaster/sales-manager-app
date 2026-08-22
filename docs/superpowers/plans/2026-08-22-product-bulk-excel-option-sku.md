# 상품 대량등록 엑셀 옵션 매핑 + SKU 컬럼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상품 대량등록 엑셀에서 옵션 컬럼을 읽어 `Product.option`·`subOption` 조합을 만들고, SKU 접두사 컬럼으로 조합별 `skuCode`를 채운다.

**Architecture:** 1행 = 1상품 구조를 유지한다. 옵션명·옵션값을 각각 별도 컬럼으로 받아 엑셀 셀을 `ProductOption[]`으로 정규화한 뒤, 화면이 쓰는 것과 **동일한** `validateOptions`·`optionCombinations`(`util/Options.ts`)에 넘겨 조합을 만든다. 조합별 수량·SKU는 한 행에 담을 수 없으므로 일괄 규칙(총수량 주입, 접두사 + 자동 채번)으로 채운다.

**Tech Stack:** TypeScript (strict), Vitest, XLSX(파싱)·ExcelJS(양식 생성), React Hook Form, Next.js App Router

**Spec:** [`docs/superpowers/specs/2026-08-22-product-bulk-excel-option-sku.md`](../specs/2026-08-22-product-bulk-excel-option-sku.md)

## Global Constraints

- **git 명령 금지.** 각 Task 완료 후 커밋하지 않는다. 모든 변경은 워킹트리에 누적하고, 전체 Task + 최종 리뷰가 끝난 뒤 사용자에게 Task 단위 커밋 분리를 제안한다. (`CLAUDE.md` Git/PR 규칙)
- **Prettier:** `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`
- **TypeScript strict.** `any` 금지. 시트 셀 값은 `unknown`으로 받아 `toText`로 좁힌다.
- **폰트 크기·색상 변경 금지** (`CLAUDE.md` 스타일 수정 규칙). Task 4에서 미리보기 테이블을 건드리지만 텍스트 스타일은 손대지 않는다.
- **조합 생성 규칙을 새로 구현하지 않는다.** `src/features/products/util/Options.ts`의 `validateOptions`·`optionCombinations`를 재사용한다. 화면과 엑셀에서 조합 규칙이 갈리면 안 된다.
- 테스트 설명은 기존 `Options.test.ts`와 같이 **한국어**로 쓴다.

## File Structure

| 파일 | 책임 | Task |
|------|------|------|
| `src/features/products/util/excelOptions.ts` (신규) | 엑셀 셀 → 옵션 조합 변환, 셀 값 정규화, 미리보기 요약 문자열 | 1, 2 |
| `src/features/products/util/excelOptions.test.ts` (신규) | 위 유틸의 Vitest 테스트 | 1, 2 |
| `src/features/products/constant/bulkTemplate.constant.ts` | 엑셀 템플릿 컬럼 정의 (19 → 24) | 3 |
| `src/components/excel/strategies/productExcelSaveStrategy.ts` | 엑셀 행 → `Product` 변환 | 3 |
| `src/features/products/constant/excel.constants.tsx` | 미리보기 테이블 컬럼 (8 → 9) | 4 |

`excelOptions.ts`를 `Options.ts`에 합치지 않는 이유: `Options.ts`는 화면 폼이 쓰는 순수 옵션 로직이고, 새 파일은 **엑셀 시트 셀이라는 외부 입력 형식**을 다룬다. 책임이 다르고, 엑셀 컬럼 형식이 바뀔 때 화면 로직 파일을 열 이유가 없다.

---

### Task 1: 셀 정규화 + 옵션 조합 생성

**Files:**
- Create: `src/features/products/util/excelOptions.ts`
- Test: `src/features/products/util/excelOptions.test.ts`

**Interfaces:**
- Consumes: `validateOptions`, `optionCombinations` from `src/features/products/util/Options.ts`; `OptionCombination`, `ProductOption` from `src/features/products/types/product.types.ts`
- Produces:
  - `export interface ExcelOptionPair { name: unknown; values: unknown }`
  - `export const toText: (value: unknown) => string`
  - `export const buildCombinationsFromExcel: (pairs: ExcelOptionPair[], quantity: number, skuPrefix: string) => OptionCombination[] | undefined`

**배경 (구현자가 알아야 할 것):**

- `OptionCombination`은 `{ values: { [key: string]: string }; quantity: number; skuCode: string; optionPrice: number }`이다.
- `optionCombinations(validOptions)`는 카테시안 곱을 만들고 각 조합을 `quantity: 0, skuCode: '', optionPrice: 0`으로 채워 돌려준다. 이 Task는 그 위에 `quantity`와 `skuCode`만 덮어쓴다. `optionPrice`는 `0`으로 남는다.
- `validateOptions(options)`는 이름이 공백이거나 값이 하나도 없는 옵션을 제거하고, 값 배열의 공백 항목도 제거한다. 그래서 **이 Task에서 빈 값 필터링을 다시 구현하지 않는다.**
- 시트 셀은 `XLSX.utils.sheet_to_json(..., { defval: '' })`로 읽히므로 빈 칸은 `''`이지만, 숫자만 적힌 칸은 `number`로 파싱된다. `ExcelRowWithErrors`의 값 타입에는 `ValidationError[]`도 포함돼 있어 배열이 들어올 수 있다.

- [ ] **Step 1: 실패 테스트 작성**

`src/features/products/util/excelOptions.test.ts` 생성:

```ts
import { describe, it, expect } from 'vitest';
import { buildCombinationsFromExcel, toText } from './excelOptions';

// ─── toText ───────────────────────────────────────────────────────────────────

describe('toText', () => {
  it('문자열은 앞뒤 공백을 제거해 돌려준다', () => {
    expect(toText('  블랙  ')).toBe('블랙');
  });

  it('숫자로 파싱된 셀을 문자열로 바꾼다', () => {
    expect(toText(90)).toBe('90');
  });

  it('null·undefined·빈 문자열은 빈 문자열이 된다', () => {
    expect(toText(null)).toBe('');
    expect(toText(undefined)).toBe('');
    expect(toText('   ')).toBe('');
  });

  it('배열(ValidationError[])은 빈 문자열이 된다', () => {
    expect(toText([{ row: 1, header: '상품명', code: 'EMPTY_VALUE' }])).toBe('');
  });
});

// ─── buildCombinationsFromExcel ───────────────────────────────────────────────

describe('buildCombinationsFromExcel', () => {
  const pairs = [
    { name: '색상', values: '블랙,화이트' },
    { name: '사이즈', values: 'S,M,L' },
  ];

  it('옵션 2개(2값 × 3값)로 조합 6개를 만든다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result).toHaveLength(6);
  });

  it('조합의 values 맵이 옵션명을 키로 갖는다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result?.[0].values).toEqual({ 색상: '블랙', 사이즈: 'S' });
    expect(result?.[5].values).toEqual({ 색상: '화이트', 사이즈: 'L' });
  });

  it('모든 조합의 quantity가 인자값과 같다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result?.every((combination) => combination.quantity === 100)).toBe(true);
  });

  it('skuPrefix가 있으면 001부터 3자리 zero-pad로 채번한다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result?.map((combination) => combination.skuCode)).toEqual([
      'TSHIRT-001',
      'TSHIRT-002',
      'TSHIRT-003',
      'TSHIRT-004',
      'TSHIRT-005',
      'TSHIRT-006',
    ]);
  });

  it('skuPrefix가 빈 문자열이면 모든 skuCode가 빈 문자열이다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, '');
    expect(result?.every((combination) => combination.skuCode === '')).toBe(true);
  });

  it('optionPrice는 항상 0이다', () => {
    const result = buildCombinationsFromExcel(pairs, 100, 'TSHIRT');
    expect(result?.every((combination) => combination.optionPrice === 0)).toBe(true);
  });

  it('pair가 전부 비어 있으면 undefined를 반환한다', () => {
    expect(buildCombinationsFromExcel([{ name: '', values: '' }], 100, 'TSHIRT')).toBeUndefined();
  });

  it('옵션명만 있고 값이 비어 있으면 그 옵션을 제외한다', () => {
    const result = buildCombinationsFromExcel(
      [
        { name: '색상', values: '블랙,화이트' },
        { name: '사이즈', values: '' },
      ],
      100,
      '',
    );
    expect(result).toHaveLength(2);
    expect(result?.[0].values).toEqual({ 색상: '블랙' });
  });

  it('남는 옵션이 하나도 없으면 undefined를 반환한다', () => {
    expect(buildCombinationsFromExcel([{ name: '색상', values: '   ' }], 100, '')).toBeUndefined();
  });

  it('옵션값이 숫자로 파싱된 셀이어도 문자열로 처리한다', () => {
    const result = buildCombinationsFromExcel([{ name: '사이즈', values: 90 }], 100, '');
    expect(result?.[0].values).toEqual({ 사이즈: '90' });
  });

  it('콤마 주변 공백을 제거한다', () => {
    const result = buildCombinationsFromExcel([{ name: '색상', values: '블랙, 화이트 ' }], 100, '');
    expect(result?.map((combination) => combination.values.색상)).toEqual(['블랙', '화이트']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/products/util/excelOptions.test.ts`

Expected: FAIL — `Failed to resolve import "./excelOptions"` (파일이 아직 없음)

- [ ] **Step 3: 최소 구현**

`src/features/products/util/excelOptions.ts` 생성:

```ts
import { OptionCombination, ProductOption } from '@/features/products/types/product.types';
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
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features/products/util/excelOptions.test.ts`

Expected: PASS — 15 tests passed (`toText` 4건, `buildCombinationsFromExcel` 11건)

- [ ] **Step 5: 타입·포맷 확인**

Run: `npx tsc --noEmit`
Expected: 출력 없음 (에러 0건)

Run: `npx prettier --check src/features/products/util/excelOptions.ts src/features/products/util/excelOptions.test.ts`
Expected: `All matched files use Prettier code style!`

---

### Task 2: 미리보기 요약 문자열

**Files:**
- Modify: `src/features/products/util/excelOptions.ts` (Task 1에서 만든 파일에 함수 추가)
- Test: `src/features/products/util/excelOptions.test.ts` (describe 블록 추가)

**Interfaces:**
- Consumes: `ExcelOptionPair`, `toText`, 모듈 내부 `toOptionValues` (Task 1)
- Produces: `export const formatExcelOptionSummary: (pairs: ExcelOptionPair[], subPairs: ExcelOptionPair[]) => string`

**출력 형식:** `'색상: 블랙,화이트 / 사이즈: S,M,L / 추가) 각인: 유,무'`

기본옵션과 추가옵션을 ` / `로 이어 붙이고, 추가옵션 항목에는 `추가) ` 접두사를 붙여 구분한다. 이름이나 값이 비어 있는 pair는 건너뛴다. Task 1의 `toOptionValues`를 함께 써서 **표시되는 값과 실제 저장되는 값이 같은 정규화를 거치게** 한다 (`블랙, 화이트` → `블랙,화이트`).

- [ ] **Step 1: 실패 테스트 작성**

`src/features/products/util/excelOptions.test.ts` 맨 아래에 추가하고, 최상단 import에 `formatExcelOptionSummary`를 넣는다:

```ts
// import 줄을 아래로 교체
// import { buildCombinationsFromExcel, formatExcelOptionSummary, toText } from './excelOptions';

// ─── formatExcelOptionSummary ─────────────────────────────────────────────────

describe('formatExcelOptionSummary', () => {
  const basic = [
    { name: '색상', values: '블랙,화이트' },
    { name: '사이즈', values: 'S,M,L' },
  ];
  const sub = [{ name: '각인', values: '유,무' }];

  it('기본옵션과 추가옵션을 슬래시로 잇고 추가옵션에 접두사를 붙인다', () => {
    expect(formatExcelOptionSummary(basic, sub)).toBe('색상: 블랙,화이트 / 사이즈: S,M,L / 추가) 각인: 유,무');
  });

  it('추가옵션만 있으면 추가옵션 항목만 돌려준다', () => {
    expect(formatExcelOptionSummary([], sub)).toBe('추가) 각인: 유,무');
  });

  it('기본옵션만 있으면 기본옵션 항목만 돌려준다', () => {
    expect(formatExcelOptionSummary(basic, [])).toBe('색상: 블랙,화이트 / 사이즈: S,M,L');
  });

  it('둘 다 없으면 빈 문자열을 돌려준다', () => {
    expect(formatExcelOptionSummary([{ name: '', values: '' }], [{ name: '', values: '' }])).toBe('');
  });

  it('이름만 있고 값이 비어 있는 항목은 건너뛴다', () => {
    expect(formatExcelOptionSummary([{ name: '색상', values: '' }], [])).toBe('');
  });

  it('콤마 주변 공백을 정규화해 표시한다', () => {
    expect(formatExcelOptionSummary([{ name: '색상', values: '블랙, 화이트 ' }], [])).toBe('색상: 블랙,화이트');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/products/util/excelOptions.test.ts`

Expected: FAIL — `formatExcelOptionSummary is not a function` (또는 import 에러)

- [ ] **Step 3: 최소 구현**

`src/features/products/util/excelOptions.ts` 맨 아래에 추가:

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features/products/util/excelOptions.test.ts`

Expected: PASS — 21 tests passed (Task 1의 15건 + 6건)

- [ ] **Step 5: 타입·포맷 확인**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npx prettier --check src/features/products/util/excelOptions.ts src/features/products/util/excelOptions.test.ts`
Expected: `All matched files use Prettier code style!`

---

### Task 3: 템플릿 컬럼 교체 + 전략 매핑

**Files:**
- Modify: `src/features/products/constant/bulkTemplate.constant.ts` (`옵션1`·`옵션2`·`추가옵션` 3개 제거, 8개 추가)
- Modify: `src/components/excel/strategies/productExcelSaveStrategy.ts` (전체 재작성)

**Interfaces:**
- Consumes: `buildCombinationsFromExcel`, `toText` (Task 1)
- Produces: 없음 (최종 소비 지점)

**두 파일을 한 Task로 묶는 이유:** 템플릿만 바꾸면 전략이 옛 컬럼명(`옵션1`)을 읽어 옵션이 계속 버려지고, 전략만 바꾸면 다운로드 양식에 새 컬럼이 없어 사용자가 값을 넣을 자리가 없다. 어느 한쪽만 통과시킬 수 없다.

**배경:** `ProductBulkUploadLayout.tsx:23`이 `PRODUCT_BULK_EXCEL_TEMPLATE.template.map((item) => item.name)`으로 헤더를 파생하므로, 상수만 고치면 **다운로드 양식·업로드 필수값 검증·양식 안내 표시**가 모두 따라온다. 별도로 손댈 곳이 없다.

- [ ] **Step 1: 템플릿 컬럼 교체**

`src/features/products/constant/bulkTemplate.constant.ts`에서 아래 세 항목을 찾아 지운다:

```ts
    {
      key: 'option1',
      name: '옵션1',
      req: false,
    },
    {
      key: 'option2',
      name: '옵션2',
      req: false,
    },
```

```ts
    {
      key: 'subOption',
      name: '추가옵션',
      req: false,
    },
```

그리고 `detailPage`(상세설명) 항목 **바로 뒤**에 아래를 넣는다. `totalQuantity`(총수량) 항목은 그대로 두되, 결과 순서가 `… 상세설명 → 옵션 6개 → 총수량 → SKU 2개 → 키워드`가 되도록 배치한다:

```ts
    {
      key: 'option1Name',
      name: '옵션명1',
      req: false,
    },
    {
      key: 'option1Value',
      name: '옵션값1',
      req: false,
    },
    {
      key: 'option2Name',
      name: '옵션명2',
      req: false,
    },
    {
      key: 'option2Value',
      name: '옵션값2',
      req: false,
    },
    {
      key: 'subOptionName',
      name: '추가옵션명',
      req: false,
    },
    {
      key: 'subOptionValue',
      name: '추가옵션값',
      req: false,
    },
```

`totalQuantity` 항목 **바로 뒤**에 넣는다:

```ts
    {
      key: 'skuPrefix',
      name: 'SKU',
      req: false,
    },
    {
      key: 'subSkuPrefix',
      name: '추가SKU',
      req: false,
    },
```

최종 순서 (24개): 고객상품코드 · 상품명 · 카테고리 · 브랜드 · 제조업체 · 모델명 · 모델번호 · 공급가 · 판매가 · 판매상태 · 배송정책 · 배송비 · 메인이미지 · 상세설명 · **옵션명1 · 옵션값1 · 옵션명2 · 옵션값2 · 추가옵션명 · 추가옵션값** · 총수량 · **SKU · 추가SKU** · 키워드

- [ ] **Step 2: 컬럼 개수·이름 확인**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run (Bash 도구): `grep -c "name: '" src/features/products/constant/bulkTemplate.constant.ts`
Expected: `24`

Run (Bash 도구): `grep -n "name: '옵션\|name: '추가\|name: 'SKU" src/features/products/constant/bulkTemplate.constant.ts`
Expected: 정확히 8줄 — `옵션명1` `옵션값1` `옵션명2` `옵션값2` `추가옵션명` `추가옵션값` `SKU` `추가SKU`.
`name: '옵션1'`·`name: '옵션2'`·`name: '추가옵션'`(값·명 접미사가 없는 옛 컬럼)이 남아 있으면 실패다.

- [ ] **Step 3: 전략 재작성**

`src/components/excel/strategies/productExcelSaveStrategy.ts` 전체를 아래로 교체:

```ts
import { generatorProductCode } from '@/utils/codeGenerator';
import { ExcelRowWithErrors } from '@/types/excel.type';
import { Product } from '@/features/products/types/product.types';
import { buildCombinationsFromExcel, toText } from '@/features/products/util/excelOptions';

export const productExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Omit<Product, 'ownerId'>[] => {
  return rows.map((r) => {
    // 총수량은 req: true라 검증에서 빈 값이 걸리지만, 전략이 그 전제에 기대지 않게 가드를 둔다
    const quantity = Number(r['총수량']) || 0;

    // 1행 = 1상품이라 조합별 수량·SKU를 개별 지정할 수 없다. 총수량과 접두사로 일괄 채운다
    const option = buildCombinationsFromExcel(
      [
        { name: r['옵션명1'], values: r['옵션값1'] },
        { name: r['옵션명2'], values: r['옵션값2'] },
      ],
      quantity,
      toText(r['SKU']),
    );

    const subOption = buildCombinationsFromExcel(
      [{ name: r['추가옵션명'], values: r['추가옵션값'] }],
      quantity,
      toText(r['추가SKU']),
    );

    return {
      productId: generatorProductCode(),
      customerCode: (r['고객상품코드'] as string) || undefined,
      name: r['상품명'] as string,
      categoryId: (r['카테고리'] as string) || '',
      brand: (r['브랜드'] as string) || '',
      manufacturer: (r['제조업체'] as string) || '',
      // 시트에서 숫자로 파싱될 수 있어 String()으로 좁힌다 (as string은 컴파일 타임 캐스팅이라 런타임 값이 number인 채로 남는다)
      modelName: r['모델명'] ? String(r['모델명']) : undefined,
      modelId: r['모델번호'] ? String(r['모델번호']) : undefined,
      netPrice: r['공급가'] ? Number(r['공급가']) : undefined,
      price: Number(r['판매가']),
      state: (r['판매상태'] as Product['state']) || 'WAIT_SALE',
      deliveryType: (r['배송정책'] as string) || '',
      deliveryPrice: Number(r['배송비']),
      mainImage: (r['메인이미지'] as string) || '',
      detailPage: (r['상세설명'] as string) || '',
      option,
      subOption,
      // 화면의 '수량 일괄설정'과 같은 규칙 — totalQuantity는 조합 수량의 합이다.
      // 추가옵션은 반영하지 않는다 (화면의 '수량확정'도 기본옵션에서만 동작한다)
      totalQuantity: option ? option.length * quantity : quantity,
      keyWords: r['키워드'] ? (r['키워드'] as string).split(',').map((k) => k.trim()) : undefined,
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      createDate: new Date(),
      updateDate: new Date(),
    };
  });
};
```

- [ ] **Step 4: 타입·포맷·전체 테스트 확인**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npx prettier --check src/components/excel/strategies/productExcelSaveStrategy.ts src/features/products/constant/bulkTemplate.constant.ts`
Expected: `All matched files use Prettier code style!`

Run: `npm run test`
Expected: 전체 통과. 이 Task는 기존 테스트가 건드리지 않는 파일만 수정하므로 실패가 새로 생기면 안 된다.

- [ ] **Step 5: 수동 확인 항목 기록**

이 Task는 자동 테스트로 덮이지 않는 부분이 있다. 아래를 최종 브라우저 QA 목록에 적어 둔다 (지금 실행하지 않는다):

- `/products/bulk`에서 **엑셀 양식 다운로드** → 헤더 24개, 새 컬럼명이 스펙 표와 일치
- 옵션 2개(2값 × 3값) + 총수량 100 + SKU `TSHIRT`로 채운 파일 업로드 → 저장 후 `/products/list`에서 해당 상품의 총수량이 **600**
- 상품수정 화면에서 옵션 카드가 `색상`·`사이즈`로 시딩되고 조합 6개의 SKU가 `TSHIRT-001`~`TSHIRT-006`
- SKU 칸을 비운 행 → 조합은 생성되고 SKU 칸이 전부 빈 값
- 옵션 칸을 모두 비운 행 → 옵션 없이 등록되고 총수량이 입력값 그대로

---

### Task 4: 미리보기 테이블 옵션 컬럼

**Files:**
- Modify: `src/features/products/constant/excel.constants.tsx` (`PRODUCT_EXCEL_TABLE_COLUMNS`에 컬럼 1개 추가)

**Interfaces:**
- Consumes: `formatExcelOptionSummary` (Task 2)
- Produces: 없음

**배경:** `PRODUCT_EXCEL_TABLE_COLUMNS`는 `ExcelTableColumnsType[]`이고, `accessor: (row: ExcelRowWithErrors, index?: number) => React.ReactNode`이다. 문자열 반환으로 충분하다. 현재 8컬럼(행 · 상태 · 고객상품코드 · 상품명 · 카테고리 · 판매가 · 총수량 · 오류 내용)이며, `옵션`을 `판매가`와 `총수량` 사이에 넣어 9컬럼으로 만든다.

- [ ] **Step 1: import 추가**

`src/features/products/constant/excel.constants.tsx` 최상단 import 블록에 추가:

```tsx
import { formatExcelOptionSummary } from '@/features/products/util/excelOptions';
```

- [ ] **Step 2: 컬럼 추가**

`PRODUCT_EXCEL_TABLE_COLUMNS` 배열에서 `key: 'price'` 항목과 `key: 'totalQuantity'` 항목 **사이**에 넣는다:

```tsx
  {
    key: 'options',
    headerTitle: '옵션',
    accessor: (r) =>
      formatExcelOptionSummary(
        [
          { name: r['옵션명1'], values: r['옵션값1'] },
          { name: r['옵션명2'], values: r['옵션값2'] },
        ],
        [{ name: r['추가옵션명'], values: r['추가옵션값'] }],
      ),
  },
```

- [ ] **Step 3: 타입·포맷 확인**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npx prettier --check src/features/products/constant/excel.constants.tsx`
Expected: `All matched files use Prettier code style!`

- [ ] **Step 4: 전체 테스트 확인**

Run: `npm run test`
Expected: 전체 통과

- [ ] **Step 5: 수동 확인 항목 기록**

최종 브라우저 QA 목록에 추가 (지금 실행하지 않는다):

- `/products/bulk`에서 파일 업로드 후 미리보기 테이블에 `옵션` 컬럼이 판매가와 총수량 사이에 보인다
- 옵션이 있는 행: `색상: 블랙,화이트 / 사이즈: S,M,L / 추가) 각인: 유,무`
- 옵션이 없는 행: 빈 칸
- 헤더/바디 컬럼 수가 9개로 일치 (헤더만 늘고 셀이 안 늘면 정렬이 밀린다)

---

## 완료 후 (사용자 확인 필요)

1. 전체 테스트 (`npm run test`) + `npx tsc --noEmit` + `npm run lint` 통과 확인
2. 위 Task 3·4의 수동 브라우저 QA 항목 실행
3. **커밋 분리 제안** — Task 1+2(유틸), Task 3(템플릿+전략), Task 4(미리보기) 단위. 사용자 승인 후에만 git 명령 실행
4. `docs/solutions/` 기록 가치 판단 후 제안 — 후보: "1행 = 1레코드 파이프라인에 N:1 구조를 담을 때의 인코딩 선택", "엑셀·화면이 같은 조합 생성 함수를 공유해야 하는 이유"
