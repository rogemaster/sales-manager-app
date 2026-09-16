---
title: 배열 인덱스로 채번한 값은 레코드 간에 전부 겹친다 — 매핑 키로 승격되는 순간 결함이 된다
date: 2026-08-25
category: architecture-patterns
module: utils, features/products
problem_type: architecture_pattern
component: code_generation
severity: low
applies_when:
  - 목록·배열을 순회하며 코드·번호를 자동 채번할 때 (SKU, 항목번호, 파일명 등)
  - "지금은 중복돼도 문제없다"고 판단하고 넘어가려 할 때
  - 사용자가 관리하는 식별자를 나중에 조회·매핑 키로 쓸 계획이 있을 때
tags:
  - code-generation
  - identifier
  - uuid
  - sku
  - deferred-defect
---

# 배열 인덱스로 채번한 값은 레코드 간에 전부 겹친다

## 문제

옵션 조합의 SKU를 일괄생성하는 코드가 이랬다.

```ts
// ProductOptionConfirmTable.tsx
const newOption = fields.map((field, index) => ({
  ...field,
  skuCode: `SKU-${String(index + 1).padStart(3, '0')}`,
}));
```

`index`는 **지금 편집 중인 상품 하나의 조합 배열 안에서의 순번**이다. 그래서 모든 상품이 `SKU-001`부터 시작한다.

```
상품 A (색상: 빨강/파랑)  → SKU-001, SKU-002
상품 B (사이즈: S/M/L)    → SKU-001, SKU-002, SKU-003
```

**한 상품 안에서는 고유하고, 상품을 넘어가면 전부 겹친다.** 배열을 감싸는 스코프가 채번의 유효 범위 전체라고 착각하기 쉬운 지점이다.

같은 형태가 엑셀 업로드 경로(`excelOptions.ts`)에도 있었다. 이쪽은 접두사를 사용자가 시트에 적어서 상품마다 다르게 적으면 피할 수 있었지만, 같은 접두사를 쓰면 동일하게 겹쳤다. **한 번 쓴 채번 방식은 두 번째 경로에 그대로 복제된다.**

## 왜 오래 방치됐나 — 판단 기준이 틀렸다

이 프로젝트에서 `skuCode`는 **중복 검증을 하지 않는다.** 중복 판정은 프로그램이 아니라 사용자 책임이라는 설계 결정이 있다(`.claude/rules/domain-design.md`의 skuCode 절).

그래서 이 항목은 "중복은 어차피 사용자 책임이니 남는 건 가독성뿐"으로 정리돼 미착수 목록에 **가독성 개선**으로 적혀 있었다. 2026-08-22에는 uuid 기반 채번안이 "사람이 읽는 재고 코드에 uuid는 목적에 역행한다"는 이유로 기각되기까지 했다.

**틀린 것은 결론이 아니라 질문이었다.** "중복을 검증하는가"를 물었는데, 물어야 할 것은 **"이 값이 나중에 무엇으로 쓰이는가"**였다.

- 사용자가 **직접 타이핑한** SKU의 중복 → 사용자 책임이 맞다. 그 사람이 자기 체계를 아는 사람이다.
- 프로그램이 **자동 채번한** SKU의 중복 → 사용자가 만든 적 없는 충돌이다. 책임을 물을 대상이 없다.

둘을 하나의 "중복은 사용자 책임" 규칙으로 묶은 것이 방치의 원인이었다.

## 언제 결함으로 바뀌는가

미착수 목록에 이런 항목이 함께 있었다.

> **`skuCode`를 재고 매핑 키로 활용** — *사용자 요구*: "추후 옵션의 재고의 경우 skuCode를 매핑의 키로 활용을 할 생각임."

`SKU-001`을 들고는 **어느 상품의 재고인지 판정할 수 없다.** 즉 이 값은 "지금 무해한 중복"이 아니라 **예정된 기능을 착수 불가로 만드는 값**이었다. 재고관리를 시작한 뒤에 발견했다면 이미 채번된 데이터의 마이그레이션이 함께 따라왔을 것이다.

**판별 질문:** 이 값이 언젠가 **다른 데이터를 찾아오는 키**가 되는가? 된다면 채번 시점의 유효 범위가 그 조회의 유효 범위와 같아야 한다. 표시용으로만 쓰인다면 인덱스로 충분하다.

## 해결

채번을 `src/utils/codeGenerator.ts`로 옮겼다 — `prod_`·`opt_`·`order_`가 이미 같은 방식(uuid 앞 8자리)을 쓰고 있어서 자리가 이미 있었다.

```ts
// 접두사를 인자로 받는 이유: 화면 일괄생성은 'SKU', 엑셀은 사용자가 시트에 적은 값을 쓴다.
export const generatorSkuCode = (prefix: string) => {
  return `${prefix}-${uuidv4().split('-')[0]}`;
};
```

- **기본값을 두지 않았다.** 두 호출부의 접두사가 애초에 다르고, 기본값은 세 번째 호출부에서 조용히 잘못된 접두사를 쓰게 만든다(`ProductForm.submitLabel`을 필수 prop으로 뺀 것과 같은 판단).
- **두 호출부를 함께 고쳤다.** 한쪽만 고치면 같은 결함이 다른 경로에 남는다.
- 사람이 읽는 코드라는 성질은 접두사(`SKU-`)가 유지한다. 2026-08-22 기각안은 SKU **전체**를 uuid로 만드는 것이었고, 이번 것은 순번 부분만 교체한 것이라 성격이 다르다.

## 테스트에서 걸린 것

기존 테스트가 채번 결과를 문자열로 정확히 단언하고 있었다.

```ts
expect(product.option?.map((c) => c.skuCode)).toEqual(['TSHIRT-001', 'TSHIRT-002', ...]);
```

값이 비결정적으로 바뀌면 이런 단언은 유지할 수 없다. **형식 검사 + 고유성 검사**로 바꾸는 것이 맞다.

```ts
expect(product.option?.every((c) => /^TSHIRT-[0-9a-f]{8}$/.test(c.skuCode))).toBe(true);
```

그리고 **결함 자체를 재현하는 테스트를 새로 넣어야 한다.** 위 두 단언은 상품 하나 안에서만 보므로, 원래 문제였던 상품 간 중복을 잡지 못한다.

```ts
it('같은 접두사를 쓴 다른 상품끼리도 skuCode가 겹치지 않는다', () => {
  const products = productExcelSaveStrategy([optionRow, optionRow]);
  const skuCodes = products.flatMap((p) => p.option?.map((c) => c.skuCode) ?? []);

  expect(new Set(skuCodes).size).toBe(12);
});
```

**한 레코드만 보는 테스트는 레코드 간 결함을 절대 잡지 못한다.** 인덱스 채번을 그대로 둔 채로도 이 파일의 다른 테스트는 전부 통과했었다.

## 관련

- `.claude/rules/domain-design.md` — "값을 요구하는 주체가 사용자면 위 규칙이 적용되지 않는다 — skuCode"
- [`flat-excel-row-to-nested-domain-structure.md`](flat-excel-row-to-nested-domain-structure.md) — 엑셀 1행=1상품 전제와 SKU 접두사 채번의 유래
- [`snapshot-entity-source-link-break-is-by-design.md`](snapshot-entity-source-link-break-is-by-design.md) — "이 참조가 무엇을 위한 것인가"를 먼저 물어야 했던 같은 유형의 판단
- [`customer-code-duplicate-block-is-not-a-reversal-of-sku-rule.md`](customer-code-duplicate-block-is-not-a-reversal-of-sku-rule.md) — 같은 "사용자 책임" 규칙에서 사용자가 **막아달라고** 한 예외(`customerCode`, 2026-09-16). 이 문서 작성 이후에 생겼다
