---
title: 엑셀 행 번호는 파싱 직후 붙인다 — 서버는 요청 배열 index만 돌려주고 번호는 요청을 만든 쪽이 붙인다
date: 2026-09-14
category: architecture-patterns
module: components/excel, features/products, app/api/products/bulk
problem_type: architecture_pattern
component: data_mapping
severity: medium
applies_when:
  - 사용자 파일(엑셀·CSV)의 오류를 행 번호로 알려줘야 할 때
  - 미리보기에서 오류 행을 걸러낸 뒤 나머지만 서버로 보낼 때
  - SheetJS sheet_to_json 결과에 index로 번호를 매기려 할 때
  - 서버 검증 오류에 "N번째 행" 문구를 조립하려 할 때
symptoms:
  - 서버가 말한 "3번째 행"이 실제 시트에서는 4행이다(앞선 오류 행이 걸러져 배열이 줄어듦)
  - 미리보기 '행' 컬럼(index + 1)과 엑셀 시트 행(헤더 때문에 index + 2)이 어긋난다
  - 중간에 빈 행이 있으면 그 뒤로 번호가 하나씩 밀린다(sheet_to_json이 빈 행을 건너뜀)
  - "`{ ...row }`로 펼친 뒤 __rowNum__이 사라진다(열거 불가 속성)"
tags:
  - excel
  - sheetjs
  - row-number
  - bulk-upload
  - error-message
  - api-contract
---

# 엑셀 행 번호는 파싱 직후 붙인다 — 서버는 요청 배열 index만 돌려주고 번호는 요청을 만든 쪽이 붙인다

## Context

상품 쓰기 값 검증 라운드(PR#70)에서 Claude가 발견해 보고했다. 미리보기(`ExcelDataPreview`)는 오류 행을 걸러낸 뒤 POST하는데, bulk route는 **걸러진 배열 기준으로** "N번째 행"을 셌다. 시트 2행이 오류로 빠지면 서버의 "3번째 행"은 시트 4행이다. 그때는 범위 밖으로 두고 사용자에게 보고만 했다. (auto memory [claude])

2026-09-13 사용자가 수정 대상으로 확정했다 — "문제가 있다고 인지 하고 있어서 수정 작업을 해야 함", "행번호 작업도 크게 문제가 없다면 이번 범위에 넣어서 진행하자". 같은 대화에서 한 겹이 더 드러났다. 미리보기 '행' 컬럼은 `index + 1`이었고 업로드 검증 오류도 index 기준이었는데, **엑셀 시트는 헤더가 1행이라 첫 데이터가 2행**이다. 번호를 매기는 곳이 층마다 달랐다.

## Guidance

### 1. 기준 번호는 엑셀 시트 행 번호 하나다

미리보기 '행' 컬럼, 업로드 검증 오류의 `row`, 이미지 확인 오류, 저장 결과 알림, bulk route 오류가 **전부 같은 번호**를 쓴다. 사용자가 엑셀 파일에서 그 행을 바로 찾을 수 있어야 하기 때문이다.

### 2. 파싱 직후, 행을 펼치기 전에 복사한다

```ts
// processExcelUpload.ts
const rows = attachSheetRowNumbers(XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ExcelRowType[]);

// sheetRows.ts
export const EXCEL_SHEET_ROW_KEY = '__sheetRow';

export const attachSheetRowNumbers = (rows: ExcelRowType[]): ExcelRowType[] =>
  rows.map((row, index) => {
    const rowNum = (row as { __rowNum__?: unknown }).__rowNum__;
    return { ...row, [EXCEL_SHEET_ROW_KEY]: typeof rowNum === 'number' ? rowNum + 1 : index + 2 };
  });
```

두 가지 함정이 이 모양을 강제한다.

- **`sheet_to_json`은 기본값으로 빈 행을 건너뛴다.** 그래서 `index + 2`는 빈 행 뒤부터 전부 틀린다.
- **SheetJS가 넣어주는 `__rowNum__`(0부터)은 정확하지만 열거 불가 속성이다.** `{ ...row, error }`로 펼치는 순간 사라진다. 그래서 파싱 직후 열거 가능한 필드로 복사해야 한다.

필드명은 한글 템플릿 컬럼명과 겹치지 않게 골랐다. 전략 함수(`productExcelSaveStrategy`)가 필드를 명시적으로 꺼내므로 이 값은 서버로 전송되지 않는다.

### 3. 이후 모든 층은 `getSheetRow(row)`로 읽는다 — index로 계산하지 않는다

```ts
// validate.ts
errors.push({ row: getSheetRow(row), header, code: 'EMPTY_VALUE' });

// ExcelUploaderContent — 행과 오류를 잇는 기준도 index가 아니다
rows.map((item) => ({ ...item, error: errors.filter((value) => value.row === getSheetRow(item)) }));
```

### 4. 서버는 시트 개념을 모른다 — `rowIndex`만 돌려준다

bulk route는 오류를 `{ error, rowIndex }`로 돌려준다. `rowIndex`는 **요청 배열 기준 0부터**다. 무엇을 걸러 보냈는지 아는 쪽은 요청을 만든 클라이언트뿐이므로 번호도 그쪽이 붙인다.

```ts
// app/api/products/bulk/route.ts
const rowError = (error: string, rowIndex: number) => NextResponse.json({ error, rowIndex }, { status: 400 });

// features/products/util/bulkRowError.ts
export const formatBulkRowError = (error: string, rowIndex: unknown, rowNumbers: readonly number[]): string => {
  if (typeof rowIndex !== 'number' || !Number.isInteger(rowIndex)) return error;
  const rowNumber = rowNumbers[rowIndex];
  return rowNumber === undefined ? error : `[${rowNumber}행] ${error}`;
};
```

`rowNumbers`는 **실제로 보낸 배열과 같은 순서**여야 한다. 저장 전략은 이미지를 가져오지 못한 행을 뺀 뒤 남은 행의 번호를 넘긴다(`resolved.map(({ rowNumber }) => rowNumber)`).

서버 문구에 행 번호를 넣던 `productWriteViolationMessage(violation, row?)`는 삭제했다. 등록·수정 route는 위반 문구를 그대로 `error`에 담는다.

### 5. "첫 번째 오류"는 발생 순서가 아니라 가장 작은 시트 행이다

저장 시 이미지 가져오기는 동시에 4개씩 돈다. 실패가 발생하는 순서는 매번 달라지므로, 알림("첫 오류 + (외 N건 오류)", 사용자 결정)의 "첫 오류"는 정렬해서 고른다(`formatExcelFailureSummary`).

## Why This Matters

- **걸러 보낸 뒤 서버가 index로 셀 때:** 시트 2~5행 중 3행이 오류로 빠지면 요청은 [2, 4, 5]행이다. 서버의 "2번째 행"(index 1)은 시트 4행인데, 사용자는 2행이나 3행을 고치게 된다.
- **`index + 2`로 계산할 때:** 시트 3행이 비어 있으면 `sheet_to_json` 결과의 index 1은 시트 4행인데 계산은 3행이 나온다. 빈 행 뒤의 모든 번호가 하나씩 밀린다.
- **`__rowNum__`을 나중에 읽을 때:** 미리보기 저장소에 넣으려고 행을 펼친 뒤라 값이 없다. 번호가 `NaN`이 된다.
- **서버가 시트 행 번호를 계산하게 할 때:** 클라이언트가 원래 번호를 함께 보내는 계약이 필요해지고, 서버는 위조 가능한 입력을 하나 더 믿어야 한다. 서버가 index만 돌려주면 그 계약 자체가 필요 없다.

## When to Apply

- 엑셀·CSV를 SheetJS로 파싱해 행 단위 오류를 사용자에게 보여줄 때
- 클라이언트가 일부 행을 거른 뒤 서버에 배치로 보내고, 서버가 행 단위로 거부할 수 있을 때
- 행별 작업을 동시에 실행해 결과가 도착하는 순서가 일정하지 않을 때

## Examples

- 테스트(`src/components/excel/utils/sheetRows.test.ts`): `aoa_to_sheet([['상품명'], ['A'], [], ['B']])` → `[2, 4]`. `getSheetRow({ ...row, error: [] })` → `2`(펼쳐도 남음).
- 테스트(`src/features/products/util/bulkRowError.test.ts`): `formatBulkRowError('판매가는 0 이상의 정수여야 합니다', 1, [2, 4, 5])` → `'[4행] 판매가는 0 이상의 정수여야 합니다'`. `rowIndex`가 `undefined`·`null`·`'1'`·`1.5`·범위 밖이면 사유만.
- 수동 확인(2026-09-14): 중간에 빈 행이 있는 파일에서 미리보기 '행'과 오류 행 번호가 시트 행과 일치.

## Related

- [`flat-excel-row-to-nested-domain-structure.md`](flat-excel-row-to-nested-domain-structure.md) — 같은 파이프라인의 "1행 = 1레코드" 전제. 행 번호는 이 전제 위에 선다
- [`array-index-numbering-collides-across-records.md`](array-index-numbering-collides-across-records.md) — 같은 계열: 배열 index로 번호를 매기면 문맥이 바뀔 때 틀린다
- [`display-label-to-domain-code-boundary.md`](display-label-to-domain-code-boundary.md) — 업로드 검증·전략·route 세 층. 행 번호가 그 세 층을 모두 관통한다
- [`absent-optional-value-arrives-as-null.md`](absent-optional-value-arrives-as-null.md) — bulk route 서버 검증을 넓힌 라운드. 순수 로직 테스트는 통과했는데 층 사이에서 어긋나는 같은 유형
- `docs/solutions/integration-issues/excel-template-text-format-prevents-data-loss.md` — `sheet_to_json`에 넘어온 시점에 이미 정보가 없는 같은 층의 함정(값 변형)
- `docs/superpowers/specs/2026-09-13-excel-main-image-r2-import-design.md` §7 — 설계 문서
