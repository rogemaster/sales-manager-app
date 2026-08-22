---
title: 엑셀이 셀 값을 변형하는 손실은 검증으로 못 잡는다 — 양식 단계에서 텍스트 서식으로 막는다
date: 2026-08-23
category: integration-issues
module: components/excel, features/products
problem_type: data_loss
component: excel_template
severity: high
applies_when:
  - 엑셀 템플릿에 새 컬럼을 추가할 때, 그 값이 숫자로만 이뤄질 수 있는 경우
  - 콤마 구분 목록·코드·번호를 엑셀로 입력받을 때
  - 업로드 검증을 추가해 잘못된 값을 잡으려 할 때 (검증으로 잡히지 않는 종류가 있다)
tags:
  - excel
  - exceljs
  - data-loss
  - bulk-upload
  - validation
---

# 엑셀이 셀 값을 변형하는 손실은 검증으로 못 잡는다

## 증상

상품 대량등록 엑셀의 `옵션값1` 칸에 **`90,100,110`** (한국 의류 사이즈)을 적고 업로드하면, 옵션값 3개가 아니라 **1개**가 등록된다. 그 1개의 값은 `90100110`이다.

오류 메시지는 없다. 미리보기에도 정상으로 보인다. 사용자는 저장한 뒤 상품수정 화면을 열어야 알아챈다.

같은 손실이 SKU 접두사에도 있다 — `007`을 적으면 `7`이 된다.

## 원인 — 손실은 우리 코드에 닿기 전에 일어난다

**Excel이 일반(General) 서식 칸의 콤마를 천 단위 구분자로 읽는다.** `90,100,110`은 문자열이 아니라 숫자 `90100110`으로 파싱되어 파일에 저장된다.

즉 `XLSX.utils.sheet_to_json`이 우리에게 넘겨주는 시점에 이미 `90100110`이라는 **하나의 number**다. 원래 값이 `90,100,110`이었다는 정보는 파일 어디에도 없다.

```
사용자 입력          Excel 저장         우리 코드가 받는 값
'90,100,110'   →    90100110 (number)  →  90100110
                    ↑ 여기서 손실       ↑ 복구 불가능
```

## 왜 검증으로 잡을 수 없나

이 프로젝트의 업로드 검증(`validateExcelData`)은 필수 헤더의 유무와 빈 값만 본다. 검증을 강화해도 이 케이스는 잡히지 않는다 — **`90100110`은 완벽하게 유효한 옵션값**이기 때문이다. 사용자가 정말로 그 값을 의도했을 수도 있다.

"콤마가 없으면 경고" 같은 휴리스틱도 안 된다. 옵션값이 하나뿐인 경우(`블랙`)가 정상이므로 오탐이 쏟아진다.

**손실 여부를 판정할 근거가 데이터에 남아 있지 않다.** 그래서 검증 레이어에서는 해결할 수 없다.

## 해결 — 다운로드하는 양식 파일에서 막는다

사용자가 값을 적기 **전**에, 그 칸이 숫자로 해석되지 않도록 만든다. 양식을 생성할 때 해당 컬럼에 텍스트 서식(`numFmt: '@'`)을 지정한다.

```ts
// src/components/excel/utils/excelDownload.ts
templateHeaders.forEach((header, index) => {
  const column = worksheet.getColumn(index + 1);
  column.width = 15;

  if (textColumns.includes(header)) {
    column.numFmt = '@';
  }
});
```

**ExcelJS의 `column.numFmt`는 나중에 입력될 빈 칸에도 적용된다.** 이게 이 해법의 성립 조건이라 라이브러리 소스로 확인했다 — `lib/doc/column.js`의 `numFmt` 세터가 `this.style.numFmt`에 저장하고, 이 Column 스타일이 워크시트의 `<cols>` 모델로 직렬화된다. Excel에서 "열 선택 → 텍스트 서식 지정"과 같은 메커니즘이라, 사용자가 그 열 아무 행에나 입력해도 서식을 물려받는다.

기존 셀(헤더 행)의 `fill`·`font`·`border`는 덮어쓰지 않는다. `numFmt` 세터가 스타일 객체를 통째로 교체하지 않고 속성만 바꾸기 때문이다.

## 대상 컬럼은 템플릿 정의에서 파생한다

어느 컬럼이 텍스트인지를 별도 배열로 관리하면 컬럼 정의와 어긋난다. 템플릿 항목에 플래그를 달고 거기서 뽑는다.

```ts
// ExcelTemplateInfo에 optional 플래그
{ key: 'option1Value', name: '옵션값1', req: false, text: true }

// 소비처에서 파생
const templateTextColumns = PRODUCT_BULK_EXCEL_TEMPLATE.template
  .filter((item) => item.text)
  .map((item) => item.name);
```

실제로 일어날 회귀는 **"옵션 컬럼을 추가하면서 `text` 플래그를 빠뜨리는 것"**이다. `excelDownload`는 `file-saver`로 브라우저 다운로드를 해서 node 환경 단위 테스트가 어려우므로, 대신 **양식 정의 자체**를 테스트로 고정했다.

```ts
it('값이 숫자로만 이뤄질 수 있는 컬럼을 텍스트 서식으로 표시한다', () => {
  const textColumns = PRODUCT_BULK_EXCEL_TEMPLATE.template.filter((item) => item.text).map((item) => item.name);

  expect(textColumns).toEqual(['옵션값1', '옵션값2', '추가옵션값', 'SKU', '추가SKU']);
});
```

## 남는 구멍 (의도적으로 감수)

- **사용자가 자기 파일을 직접 만들면 여전히 뚫린다.** 양식을 받아 쓰는 정상 경로만 막는다.
- **다른 시트에서 서식째로 복사해 붙여넣으면** 텍스트 서식이 덮인다.

둘 다 코드로 막을 수 없다. 완전한 방어가 아니라 **정상 경로의 손실을 없애는 것**이 목표다.

## 새 컬럼 추가 시 체크리스트

숫자로만 이뤄질 수 있는 값인가? 그렇다면 `text: true`를 단다. 판별 질문:

- 콤마로 구분된 목록인가 → 천 단위 구분자로 병합될 수 있다
- 앞자리 0이 의미를 갖는 코드·번호인가 → 0이 날아간다
- 사람이 읽는 식별자인가 → 대체로 텍스트여야 한다

**미적용 대상 (2026-08-23 기준):** `모델번호`·`고객상품코드`도 같은 앞자리 0 손실 위험이 있으나 이번 라운드 범위 밖이라 제외했다. `productExcelSaveStrategy`가 `String()`으로 감싸고 있지만 그건 **런타임 타입 문제를 막을 뿐 이미 일어난 손실을 되돌리지 못한다.**

## 함께 고쳐진 오해

`String()`을 쓰는 이유를 코드 주석이 "`as string` 캐스팅은 앞자리 0과 자릿수를 잃으므로"라고 설명하고 있었는데 **틀렸다.**

- `as string`은 컴파일 타임 캐스팅이라 런타임 값을 바꾸지 않는다. 잃는 것도 없다.
- 앞자리 0 손실은 XLSX 파싱 시점에 이미 끝난 일이고 `String()`으로 복구되지 않는다.
- `String()`이 실제로 필요한 이유는 **런타임 값이 `number`/`boolean`일 수 있어 `.split(',')`·`.trim()`을 바로 부르면 터지기 때문**이다.

원래 설명대로라면 "`String()`을 쓰면 안전하다"고 읽혀서, 이 문서가 다루는 진짜 손실을 놓치게 된다.

## 관련

- 설계 근거: `docs/superpowers/specs/2026-08-22-product-bulk-excel-option-sku.md`
- 엑셀 구조 전반: [`.claude/rules/excel.md`](../../../.claude/rules/excel.md)
- 이 컬럼들이 생긴 배경: [`flat-excel-row-to-nested-domain-structure.md`](../architecture-patterns/flat-excel-row-to-nested-domain-structure.md)
