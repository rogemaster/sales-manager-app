---
title: 엑셀 셀의 원래 값을 읽으면 셀 타입이 새어 들어온다 — 글자 컬럼은 표시 글자로, 숫자 컬럼만 원래 값으로
date: 2026-09-17
category: architecture-patterns
module: components/excel
problem_type: architecture_pattern
component: data_mapping
severity: medium
applies_when:
  - SheetJS(xlsx)로 업로드 파일을 행 객체로 바꿀 때
  - 코드·번호처럼 "글자여야 하는" 값을 엑셀로 받을 때
  - CSV 업로드를 함께 허용할 때
symptoms:
  - 엑셀에 TRUE라고 적은 코드가 불리언으로 들어와 "코드 없음"으로 저장된다
  - CSV의 00123이 123으로 저장된다
  - 모든 칸을 글자로 읽게 바꾸자 쉼표 서식 숫자가 "1,000"이 되어 숫자 검증에서 걸린다
tags:
  - excel
  - sheetjs
  - csv
  - parsing
  - data-integrity
---

# 엑셀 셀의 원래 값을 읽으면 셀 타입이 새어 들어온다

## Context

`sheet_to_json(worksheet, { defval: '' })`는 기본값이 `raw: true`라 셀의 **원래 값(`v`)**을 준다. 셀 타입이 그대로 따라온다.

| 입력 | 원래 값(`v`) | 표시 글자(`w`) |
|------|-------------|---------------|
| 서식 "일반" 칸의 `TRUE` | `true` (불리언) | `"TRUE"` |
| CSV의 `00123` | `123` (숫자) | `"00123"` |
| 쉼표 서식 숫자 `1000` | `1000` | `"1,000"` |

고객사 상품코드가 불리언으로 들어오자 정규화(`normalizeCustomerCode`)가 이를 "코드 없음"으로 바꿔 **값이 조용히 사라졌다.** 처음에는 미리보기에서 그 행을 오류로 빼는 방식을 넣었는데, 사용자가 반박했다 — *사용자가 적은 것은 글자인데 로직이 불리언으로 읽는 것이 문제이고, 행을 빼는 것이 더 나쁘다.* 맞는 지적이었고, 확인해 보니 CSV의 앞자리 0 소실이라는 더 큰 구멍도 같은 원인이었다.

**다운로드 양식의 텍스트 서식(`numFmt = '@'`)은 이것을 막지 못한다.** 양식을 그대로 쓰면 `TRUE`가 글자로 저장되지만, 사용자가 만든 파일·서식을 지운 칸·CSV에는 서식이 없다. 파일의 서식은 입력 경계가 아니다.

## Guidance

**파싱을 한 곳(`readSheetRows`)에 모으고, 컬럼 성격으로 읽는 방식을 나눈다.**

```ts
export const readSheetRows = (worksheet: XLSX.WorkSheet, templateInfo: ExcelTemplateInfo[]): ExcelRowType[] => {
  const numericHeaders = templateInfo.filter(({ numeric }) => numeric).map(({ name }) => name);
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ExcelRowType[];
  const textRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false }) as ExcelRowType[];

  return attachSheetRowNumbers(textRows).map((row, index) => {
    const numericValues = Object.fromEntries(
      numericHeaders.filter((header) => header in rawRows[index]).map((header) => [header, rawRows[index][header]]),
    );
    return { ...row, ...numericValues };
  });
};
```

- **글자 컬럼은 표시 글자.** 사용자가 화면에서 본 것이 사용자가 적은 것이다.
- **숫자 컬럼(`numeric`)만 원래 값.** 전부 글자로 읽으면 표시 서식(쉼표·통화)이 값에 섞여 숫자 검증이 깨진다.
- 두 번 읽은 결과는 같은 규칙(빈 행 건너뛰기)이라 index가 맞는다. 시트 행 번호는 `__rowNum__`이 살아 있는 펼치기 전 객체에서 붙인다.

## Why This Matters

증상이 저장 뒤에, 그것도 **값이 다르게 저장되는 형태**로 나타난다. 오류가 나지 않으므로 사용자는 알 수 없다. 행을 오류로 빼는 방어는 증상만 옮긴다 — 사용자는 정상적인 코드가 왜 거부되는지 이해할 수 없다.

## When to Apply

- 엑셀·CSV 파서를 새로 만들거나 `sheet_to_json` 옵션을 바꿀 때
- 새 양식 컬럼이 숫자인지 글자인지 정할 때 — `numeric` 표시가 곧 파싱 방식을 정한다
- 날짜 서식 셀은 글자 컬럼에서 표시 글자(`9/17/26`)로 들어온다. 날짜를 받아야 하는 컬럼이 생기면 별도 처리가 필요하다(현재 없음)

## Examples

- `src/components/excel/utils/sheetRows.ts` — `readSheetRows`
- `src/components/excel/utils/sheetRows.test.ts` — 불리언 셀, CSV 앞자리 0, 쉼표 서식 숫자

## Related

- `normalize-before-validate-swallows-invalid-input.md` — 같은 라운드에서 서버 쪽에 남긴 방어
- `excel-sheet-row-number-attached-at-parse-server-returns-index.md` — 행 번호를 파싱 시점에 붙이는 이유
- `display-label-to-domain-code-boundary.md` — 엑셀 값이 도메인 코드로 바뀌는 경계
