---
title: 엑셀 양식의 컬럼 서식은 도메인 타입을 따른다 — 텍스트가 기본, number 필드만 숫자
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

## 어느 컬럼이 텍스트인가 — 도메인 타입이 정한다

처음엔 "값이 숫자로만 이뤄질 수 있어 보이는 컬럼"에만 텍스트 서식을 달았다(옵션값·SKU 5개). **판단 기준이 직관이라 틀렸다.**

올바른 기준은 **그 컬럼이 매핑되는 도메인 타입의 필드 타입**이다. `Product.price`가 `number`면 판매가 컬럼은 숫자 서식이 맞고, `Product.modelId`가 `string`이면 모델번호는 텍스트가 맞다. 상품 템플릿 24컬럼 기준으로 **숫자 4개**(공급가·판매가·배송비·총수량), **나머지 20개는 텍스트**다.

```ts
// ExcelTemplateInfo에 optional 플래그 — number 필드에만 붙인다
{ key: 'price', name: '판매가', req: true, numeric: true }

// 소비처에서 파생
const templateNumericColumns = PRODUCT_BULK_EXCEL_TEMPLATE.template
  .filter((item) => item.numeric)
  .map((item) => item.name);
```

**플래그를 텍스트가 아니라 숫자 쪽에 단 이유:** 빠뜨렸을 때의 결과가 다르다. 플래그를 잊으면 그 컬럼은 텍스트가 되는데, 텍스트 칸에 숫자를 적어도 `Number('10000')`은 정상 동작한다. 반대로 기본이 숫자였다면 잊은 컬럼에서 `90,100,110`이 조용히 병합된다. **안전한 쪽을 기본값으로 둔다.**

`excelDownload`는 `file-saver`로 브라우저 다운로드를 해서 node 환경 단위 테스트가 어려우므로, 대신 **양식 정의 자체**를 테스트로 고정했다.

```ts
it('Product 타입이 number인 필드만 숫자 서식으로 표시한다', () => {
  const numericColumns = PRODUCT_BULK_EXCEL_TEMPLATE.template.filter((item) => item.numeric).map((item) => item.name);

  expect(numericColumns).toEqual(['공급가', '판매가', '배송비', '총수량']);
});
```

## 남는 구멍 (의도적으로 감수)

- **사용자가 자기 파일을 직접 만들면 여전히 뚫린다.** 양식을 받아 쓰는 정상 경로만 막는다.
- **다른 시트에서 서식째로 복사해 붙여넣으면** 텍스트 서식이 덮인다.

둘 다 코드로 막을 수 없다. 완전한 방어가 아니라 **정상 경로의 손실을 없애는 것**이 목표다.

## 새 컬럼 추가 시

**도메인 타입에서 그 필드의 타입을 확인한다.** `number`면 `numeric: true`를 달고, 아니면 아무것도 하지 않는다(텍스트가 기본).

"이 값은 숫자처럼 보이는데?"로 판단하지 말 것 — 모델번호·고객상품코드·SKU는 전부 숫자로만 이뤄질 수 있지만 도메인 타입이 `string`이라 텍스트다. **숫자로 보이는 것과 숫자인 것은 다르다.** 앞자리 0이 의미를 갖거나 사람이 읽는 식별자면 대체로 `string`이고, 그 판단은 이미 타입에 내려져 있다.

`productExcelSaveStrategy`가 `modelName`·`modelId`를 `String()`으로 감싸는 것은 **런타임 타입 문제를 막을 뿐 이미 일어난 손실을 되돌리지 못한다.** 서식이 진짜 방어선이다.

## 함께 고쳐진 오해 — `String()`이 손실을 막아준다는 주석

`String()`을 쓰는 이유를 코드 주석이 "`as string` 캐스팅은 앞자리 0과 자릿수를 잃으므로"라고 설명하고 있었는데 **틀렸다.**

- `as string`은 컴파일 타임 캐스팅이라 런타임 값을 바꾸지 않는다. 잃는 것도 없다.
- 앞자리 0 손실은 XLSX 파싱 시점에 이미 끝난 일이고 `String()`으로 복구되지 않는다.
- `String()`이 실제로 필요한 이유는 **런타임 값이 `number`/`boolean`일 수 있어 `.split(',')`·`.trim()`을 바로 부르면 터지기 때문**이다.

원래 설명대로라면 "`String()`을 쓰면 안전하다"고 읽혀서, 이 문서가 다루는 진짜 손실을 놓치게 된다.

## 관련

- 설계 근거: `docs/superpowers/specs/2026-08-22-product-bulk-excel-option-sku.md`
- 엑셀 구조 전반: [`.claude/rules/excel.md`](../../../.claude/rules/excel.md)
- 이 컬럼들이 생긴 배경: [`flat-excel-row-to-nested-domain-structure.md`](../architecture-patterns/flat-excel-row-to-nested-domain-structure.md)
