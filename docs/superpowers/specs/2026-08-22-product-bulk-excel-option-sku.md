# 상품 대량등록 엑셀 — 옵션 컬럼 매핑 + SKU 컬럼 추가

작성일: 2026-08-22
범위: `src/components/excel/strategies/productExcelSaveStrategy.ts`, `src/features/products/constant/`, `src/features/products/util/`

## 배경

두 항목을 한 라운드로 묶는다.

1. **엑셀 템플릿에 SKU 컬럼 추가** — 사용자 요구(2026-08-21): "4번의 경우도 아직 추가를 하지 못한 부분이고 당연히 추가가 필요한 부분임."
2. **엑셀 옵션 컬럼 매핑 부재** — 템플릿에 `옵션1`·`옵션2`·`추가옵션` 컬럼이 있으나 `productExcelSaveStrategy`가 읽지 않고 버린다. 대량등록으로 만든 상품은 옵션이 항상 비어 있다.

**둘은 분리할 수 없다.** `skuCode`는 `Product`가 아니라 `OptionCombination`의 필드다. 옵션 조합을 만들지 않으면 SKU를 저장할 자리 자체가 없다.

## 전제 — 1행 = 1상품을 유지한다

옵션은 조합 N개이고 조합마다 `values`·`quantity`·`skuCode`·`optionPrice` 4개 값을 갖는다. 색상 2개 × 사이즈 3개면 조합 6개다. 이걸 한 행에 담을 수 없으므로 세 가지 선택지가 있었다.

| 선택지 | 판단 |
|--------|------|
| 1상품 = N행 (조합당 1행) | 조합별 값을 전부 지정할 수 있으나, 업로드 파이프라인(`processExcelUpload` → `validateExcelData` → 미리보기)이 전부 "1행 = 1레코드" 전제라 통째로 손봐야 한다 |
| 시트 2장 (상품 + 옵션조합) | 가장 깔끔하지만 `XLSX.utils.sheet_to_json(workbook.Sheets[SheetNames[0]])`로 첫 시트만 읽는 구조라 파서부터 바뀐다 |
| **1상품 = 1행, 옵션은 컬럼 인코딩** ← 채택 | 파이프라인 무변경. 대신 조합별 개별 값 지정을 포기한다 |

**감수하는 비용:** 조합별 수량·SKU·추가가격을 개별 지정할 수 없다. 일괄 규칙으로만 채우고, 개별 값이 필요하면 상품수정 화면에서 고친다.

## 결정 1 — 옵션명과 옵션값은 컬럼을 나눈다

한 셀에 `색상:블랙,화이트`처럼 인코딩하는 방식도 검토했으나, 옵션값에 콜론이나 콤마가 들어가면 깨지고 이스케이프 규칙이 필요해진다. 컬럼을 나누면 그 문제가 사라지고 화면의 입력 필드(옵션명 / 콤마 구분 옵션값)와 1:1로 대응한다.

옵션값의 콤마 구분은 화면 입력 형식(`90, 100, 110`)과 같고, 기존 `키워드` 컬럼도 이미 콤마를 쓴다.

## 결정 2 — 조합 수량은 총수량 컬럼 값을 그대로 넣는다

화면의 **"수량 일괄설정"** 버튼과 동일한 동작이다(`ProductOptionConfirmTable.tsx:46`). 입력값을 모든 조합의 `quantity`에 넣고, `totalQuantity`를 `조합수 × 입력값`으로 다시 계산한다.

```
총수량 100, 조합 6개
  → 각 조합 quantity = 100
  → Product.totalQuantity = 600
```

**엑셀에 적은 값과 저장되는 총수량이 달라진다.** 그럼에도 이 동작을 택한 이유는 `totalQuantity`가 화면 전체에서 "조합 수량의 합"으로 일관되게 쓰이기 때문이다. 100을 그대로 보존하면 합(600)과 어긋난 채 저장되고, 그 상품을 수정 화면에서 열어 `수량확정`을 누르는 순간 600으로 바뀐다 — 저장 시점이 아니라 나중에 조용히 갈리는 쪽이 나쁘다.

기본옵션이 없으면 재계산하지 않고 총수량 값을 그대로 쓴다. 추가옵션은 `totalQuantity`에 반영하지 않는다 — 화면에서도 `수량확정`은 `name === 'option'`일 때만 갱신한다(`ProductOptionConfirmTable.tsx:41`).

## 결정 3 — SKU 컬럼은 접두사이고 순번은 자동 채번한다

한 칸으로 조합 N개의 SKU를 만들어야 한다. 조합 순서대로 콤마 나열하는 방식은 사용자가 카테시안 곱 순서를 머리로 계산해야 하고 개수 불일치 처리 규칙이 또 필요해서 기각했다.

```
SKU = TSHIRT, 조합 6개
  → TSHIRT-001, TSHIRT-002, … TSHIRT-006
```

순번 형식(`-001`, 3자리 zero-pad)은 화면의 **"SKU 일괄생성"**과 같다(`ProductOptionConfirmTable.tsx:69`). 다른 점은 접두사를 상품마다 지정할 수 있다는 것뿐이다. 화면은 모든 상품이 `SKU-001`부터 시작해 상품 간 구분이 안 되는데, 대량등록에서는 그게 더 큰 문제가 된다.

**SKU 컬럼이 비어 있으면 모든 조합의 `skuCode`는 빈 문자열이다.** `skuCode`는 선택값이고 중복 판정은 사용자 책임이라는 기존 결정을 그대로 따른다 — 자동으로 채워 넣지 않는다. 근거: `.claude/rules/domain-design.md`의 "값을 요구하는 주체가 사용자면 위 규칙이 적용되지 않는다" 절.

## 결정 4 — 옵션 없는 상품에는 SKU를 저장하지 않는다

`Product`에 `skuCode` 필드를 추가하는 안은 기각했다. SKU는 옵션 조합 단위로만 관리한다.

**옵션 컬럼이 비어 있는 행에 SKU만 적으면 그 값은 버려진다.** 검증 오류로 띄우지 않는다 — 교차 필드 검증은 `validateExcelData`가 하지 않는 종류이고, 이번 범위 밖이다.

## 결정 5 — 추가옵션도 기본옵션과 동일하게 처리한다

추가옵션 조합에도 총수량 값을 `quantity`로 넣고, `추가SKU` 컬럼을 별도 접두사로 쓴다. 기본옵션과 접두사를 공유하지 않는 이유는 공유하면 두 그룹이 같은 코드(`TSHIRT-001`)를 갖게 되기 때문이다.

## 템플릿 컬럼 변경

`옵션1`·`옵션2`·`추가옵션` 3개를 제거하고 8개를 넣는다. **19컬럼 → 24컬럼.**

| # | 컬럼명 | key | req | 비고 |
|---|--------|-----|-----|------|
| 1 | 고객상품코드 | `customerCode` | false | 기존 |
| 2 | 상품명 | `name` | true | 기존 |
| 3 | 카테고리 | `category` | false | 기존 |
| 4 | 브랜드 | `brand` | true | 기존 |
| 5 | 제조업체 | `manufacturer` | true | 기존 |
| 6 | 모델명 | `modelName` | false | 기존 |
| 7 | 모델번호 | `modelId` | false | 기존 |
| 8 | 공급가 | `netPrice` | false | 기존 |
| 9 | 판매가 | `price` | true | 기존 |
| 10 | 판매상태 | `state` | true | 기존 |
| 11 | 배송정책 | `deliveryType` | true | 기존 |
| 12 | 배송비 | `deliveryPrice` | true | 기존 |
| 13 | 메인이미지 | `mainImage` | true | 기존 |
| 14 | 상세설명 | `detailPage` | true | 기존 |
| 15 | **옵션명1** | `option1Name` | false | 신규 (`옵션1` 대체) |
| 16 | **옵션값1** | `option1Value` | false | 신규 |
| 17 | **옵션명2** | `option2Name` | false | 신규 (`옵션2` 대체) |
| 18 | **옵션값2** | `option2Value` | false | 신규 |
| 19 | **추가옵션명** | `subOptionName` | false | 신규 (`추가옵션` 대체) |
| 20 | **추가옵션값** | `subOptionValue` | false | 신규 |
| 21 | 총수량 | `totalQuantity` | true | 기존, 위치만 이동 |
| 22 | **SKU** | `skuPrefix` | false | 신규 |
| 23 | **추가SKU** | `subSkuPrefix` | false | 신규 |
| 24 | 키워드 | `keyWord` | false | 기존 |

`ProductBulkUploadLayout`이 이 상수에서 헤더를 파생하므로(`templateHeaders = template.map((item) => item.name)`), 다운로드 양식·업로드 필수값 검증·양식 안내 표시가 모두 자동으로 따라온다.

### 입력 예시

| 상품명 | 옵션명1 | 옵션값1 | 옵션명2 | 옵션값2 | 추가옵션명 | 추가옵션값 | 총수량 | SKU | 추가SKU |
|---|---|---|---|---|---|---|---|---|---|
| 반팔티 | 색상 | 블랙,화이트 | 사이즈 | S,M,L | 각인 | 유,무 | 100 | TSHIRT | ENGRAVE |

저장 결과:

```
Product.option (6개)
  { values: { 색상: '블랙',   사이즈: 'S' }, quantity: 100, skuCode: 'TSHIRT-001', optionPrice: 0 }
  { values: { 색상: '블랙',   사이즈: 'M' }, quantity: 100, skuCode: 'TSHIRT-002', optionPrice: 0 }
  { values: { 색상: '블랙',   사이즈: 'L' }, quantity: 100, skuCode: 'TSHIRT-003', optionPrice: 0 }
  { values: { 색상: '화이트', 사이즈: 'S' }, quantity: 100, skuCode: 'TSHIRT-004', optionPrice: 0 }
  { values: { 색상: '화이트', 사이즈: 'M' }, quantity: 100, skuCode: 'TSHIRT-005', optionPrice: 0 }
  { values: { 색상: '화이트', 사이즈: 'L' }, quantity: 100, skuCode: 'TSHIRT-006', optionPrice: 0 }

Product.subOption (2개)
  { values: { 각인: '유' }, quantity: 100, skuCode: 'ENGRAVE-001', optionPrice: 0 }
  { values: { 각인: '무' }, quantity: 100, skuCode: 'ENGRAVE-002', optionPrice: 0 }

Product.totalQuantity = 600   // 6 × 100, 기본옵션만 반영
```

## 신규 유틸 — `src/features/products/util/excelOptions.ts`

조합 생성 규칙이 화면과 엑셀에서 갈리지 않도록, 기존 `Options.ts`의 `validateOptions`·`optionCombinations`를 **그대로 재사용**한다. 새 파일에는 엑셀 셀을 그 함수들의 입력으로 바꾸는 일과 일괄 값 주입만 둔다.

```ts
export interface ExcelOptionPair {
  name: unknown;   // 시트 셀 값 (숫자로 파싱될 수 있음)
  values: unknown; // 콤마 구분 문자열
}

// 셀 값 → 표시·비교용 문자열. null·undefined·ValidationError[]는 빈 문자열로 떨어뜨린다
export const toText = (value: unknown): string;

export const buildCombinationsFromExcel = (
  pairs: ExcelOptionPair[],
  quantity: number,
  skuPrefix: string,
): OptionCombination[] | undefined;

export const formatExcelOptionSummary = (pairs: ExcelOptionPair[], subPairs: ExcelOptionPair[]): string;
```

`toText`는 세 곳이 함께 쓴다 — `buildCombinationsFromExcel`의 셀 정규화, 전략의 SKU 접두사 추출, 미리보기 요약. `ExcelRowWithErrors`의 값 타입에 `ValidationError[]`가 포함돼 있어(`error` 키) 배열이 들어올 수 있고, `String()`을 그대로 쓰면 `[object Object]`가 나온다.

### `buildCombinationsFromExcel` 동작

1. 각 pair를 `{ name: string, values: string[] }`로 정규화 — 셀 값을 `toText()`로 고정하고 trim, `values`는 콤마 split
2. `validateOptions()` 호출 — 이름이 비었거나 값이 하나도 없는 옵션을 걸러낸다
3. 남은 옵션이 없으면 **`undefined` 반환** (`Product.option`이 optional이므로 빈 배열을 넣지 않는다)
4. `optionCombinations()` 호출 — 카테시안 곱
5. 각 조합에 `quantity` 주입, `skuCode`는 `skuPrefix`가 있으면 `PREFIX-001` 형식(3자리 zero-pad), 없으면 `''`
6. `optionPrice`는 항상 `0`

**셀 값을 문자열로 고정하는 이유:** 옵션값에 `90,100,110`처럼 숫자만 적으면 시트가 숫자로 파싱한다. 그 값에 `.split(',')`·`.trim()`을 바로 부르면 터지므로 `String()`으로 좁힌다 — `as string`은 컴파일 타임 캐스팅이라 런타임 값이 number인 채로 남는다. `productExcelSaveStrategy`가 `modelName`·`modelId`에서 이미 같은 이유로 `String()`을 쓰고 있다.

### `formatExcelOptionSummary` 동작

미리보기 테이블 표시용 문자열을 만든다. 값이 없는 pair는 건너뛴다.

```
'색상: 블랙,화이트 / 사이즈: S,M,L / 추가) 각인: 유,무'
```

기본옵션이 없고 추가옵션만 있으면 `'추가) 각인: 유,무'`, 둘 다 없으면 빈 문자열.

## 전략 수정 — `productExcelSaveStrategy.ts`

```ts
const quantity = Number(r['총수량']) || 0;

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
  // …기존 필드 그대로
  option,
  subOption,
  totalQuantity: option ? option.length * quantity : quantity,
};
```

기존 `totalQuantity: Number(r['총수량'])`는 빈 값일 때 `NaN`이 될 수 있었다. `|| 0` 가드를 함께 넣는다 (총수량은 `req: true`라 빈 값은 검증에서 걸리지만, 전략 함수가 그 전제에 기대지 않게 한다).

## 미리보기 테이블 — `PRODUCT_EXCEL_TABLE_COLUMNS`

`옵션` 컬럼 하나를 `판매가`와 `총수량` 사이에 넣는다. 8컬럼 → 9컬럼.

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
}
```

컬럼 순서: 행 · 상태 · 고객상품코드 · 상품명 · 카테고리 · 판매가 · **옵션** · 총수량 · 오류 내용

## 테스트

`src/features/products/util/excelOptions.test.ts` (Vitest). 같은 디렉토리의 `Options.test.ts`가 선례다.

`buildCombinationsFromExcel`:

- 옵션 2개(2값 × 3값) → 조합 6개, `values` 맵이 옵션명을 키로 갖는다
- 모든 조합의 `quantity`가 인자값과 같다
- `skuPrefix`가 있을 때 `PREFIX-001`부터 3자리 zero-pad로 채번된다
- `skuPrefix`가 빈 문자열일 때 모든 `skuCode`가 `''`
- `optionPrice`가 전부 `0`
- pair가 전부 비었을 때 `undefined`
- 옵션명만 있고 값이 비었을 때 그 옵션이 제외된다 (남은 게 없으면 `undefined`)
- 옵션값이 숫자로 파싱된 셀(`90`)이어도 문자열로 처리된다
- 콤마 주변 공백(`블랙, 화이트`)이 trim된다

`toText`:

- 숫자 셀(`90`)을 `'90'`으로 바꾼다
- `null`·`undefined`·빈 문자열을 `''`로 떨어뜨린다
- 배열(`ValidationError[]`)을 `''`로 떨어뜨린다

`formatExcelOptionSummary`:

- 기본 + 추가 옵션 모두 있을 때 `'… / 추가) …'` 형태
- 추가옵션만 있을 때
- 둘 다 없을 때 빈 문자열

`productExcelSaveStrategy.test.ts`는 이미 존재한다 — 2026-08-14 브랜드·모델 라운드에서 만들어졌고 `baseRow` 픽스처와 테스트 3건을 갖고 있다. 전략은 구조가 똑같은 `buildCombinationsFromExcel` 호출을 두 번 하므로(기본옵션 + `SKU`, 추가옵션 + `추가SKU`), **인자가 뒤바뀌어도 `tsc`와 위 유틸 테스트를 전부 통과한다.** 그 전치와 `totalQuantity` 재계산을 고정하는 회귀 테스트를 이 파일에 추가한다.

- 기본옵션 컬럼으로 조합을 만들고 `SKU` 접두사로 채번한다
- 추가옵션 컬럼은 `subOption`으로 가고 `추가SKU` 접두사를 쓴다 (전치 감지)
- 모든 조합의 수량에 총수량 값이 들어가고 `totalQuantity`가 `조합수 × 총수량`이 된다
- 추가옵션은 `totalQuantity` 재계산에 반영되지 않는다
- 옵션 컬럼이 비면 `option`·`subOption`이 `undefined`이고 총수량을 그대로 쓴다
- SKU 접두사가 비면 조합은 만들되 `skuCode`를 채우지 않는다

## 이번 범위 밖

- **조합별 개별 수량·SKU·추가가격 지정** — 1행 = 1상품 구조의 결과다. 필요하면 상품수정 화면에서 고친다.
- **`optionPrice` 엑셀 입력** — 조합마다 다른 값을 한 셀에 담을 수 없어 전부 `0`이다.
- **교차 필드 검증** — 옵션명만 쓰고 값을 비운 경우, 옵션 없이 SKU만 적은 경우 모두 조용히 무시된다. `validateExcelData`는 필수 헤더 유무만 본다.
- **`orderExcelSaveStrategy`** — 주문 대량등록은 이번에 건드리지 않는다.

## 마이그레이션

기존 양식을 받아둔 사용자는 새 양식을 다시 받아야 한다. `옵션1`·`옵션2`·`추가옵션` 컬럼명이 사라지므로 예전 파일을 올리면 해당 컬럼이 무시된다 — 셋 다 `req: false`라 업로드 자체는 통과하고, 옵션 없는 상품으로 등록된다. 이는 **현재 동작과 동일**하다(지금도 옵션 컬럼은 버려진다).
