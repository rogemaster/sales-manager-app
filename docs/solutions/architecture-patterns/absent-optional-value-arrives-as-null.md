---
title: 선택 필드의 "값 없음"은 undefined가 아니라 null로 도착한다 — 서버 검증을 붙일 때 등록·수정이 함께 막히는 이유
date: 2026-09-11
category: architecture-patterns
module: features/products, app/api/products
problem_type: architecture_pattern
component: data_mapping
severity: high
applies_when:
  - 쓰기 경로(route handler)에 값 검증을 새로 붙일 때
  - 선택 필드를 "없으면 건너뛴다"로 처리하려 할 때
  - 폼이 DB에서 읽은 값을 그대로 되돌려보내는 수정 화면을 다룰 때
  - nullable 컬럼이 있는 테이블에 스키마 검증을 얹을 때
symptoms:
  - 선택 항목을 비워두고 등록하면 400이 난다
  - 엑셀로 올린 상품을 열어 이름만 고쳐도 수정이 400으로 막힌다
  - 오류 메시지의 값 자리에 null이 그대로 찍힌다 (공급가는 0 이상의 정수여야 합니다 — 'null')
  - 검증 테스트는 전부 통과하는데 실제 화면에서만 막힌다
tags:
  - validation
  - zod
  - react-hook-form
  - nullable
  - write-path
  - form-roundtrip
---

# 선택 필드의 "값 없음"은 undefined가 아니라 null로 도착한다

## Context

상품 쓰기 경로 세 곳(등록·수정·대량등록)에 값 검증을 붙였다. 선택 필드는 "요청에 없으면 검사하지 않는다"로 설계했고, 그것을 이렇게 구현했다.

```ts
if (value === undefined) {
  if (mode === 'partial' || !field.required) continue;
  return `${subject(field.label)} 없습니다`;
}
```

순수 로직 테스트 30건이 전부 통과했고 타입 검사도 깨끗했다. 그런데 이 상태로 병합했다면 **상품 등록과 수정이 둘 다 깨진다.** 전체 브랜치 리뷰에서 병합 불가 판정을 받고서야 드러났다.

`undefined`만 "값 없음"으로 본 것이 원인이다. 실제 클라이언트는 둘 다 `null`을 보낸다.

## Guidance

**쓰기 경로의 검증은 `undefined`와 `null`을 함께 "값 없음"으로 받아야 한다.** 선택 필드에 한해서다. 필수 필드의 `null`은 그대로 거부한다.

```ts
// DB의 nullable 컬럼은 그대로 null로 돌아오고, 빈 숫자 입력은 NaN을 거쳐 JSON에서 null이 된다.
// 선택 필드의 null은 "값 없음"이므로 undefined와 같게 다룬다. 필수 필드의 null은 그대로 걸린다.
if (value === undefined || (value === null && !field.required)) {
  if (mode === 'partial' || !field.required) continue;
  return `${subject(field.label)} 없습니다`;
}
```

**중첩 구조 안쪽은 이 가드가 닿지 않는다.** 배열이나 객체 안의 선택 필드는 스키마 쪽에서 `null`을 허용해야 한다. zod에서는 `.optional()`이 `undefined`만, `.nullable()`이 `null`만 받으므로 **`.nullish()`**가 맞다.

```ts
const optionCombination = z.object({
  values: z.record(z.string()),
  optionPrice: z.number().int().min(-MAX_INT).max(MAX_INT).nullish(),
  quantity: count.nullish(),
  skuCode: z.string().max(100).nullish(),
});
```

`.nullish()`를 붙여도 범위 검사는 그대로 산다. 음수 수량과 상한 초과는 여전히 걸린다.

## Why This Matters

**값이 `null`로 바뀌는 경로가 둘이고, 둘 다 평범한 사용이다.**

**첫째, 빈 숫자 입력.** 숫자 입력을 `valueAsNumber`로 등록하면 비어 있을 때 폼이 `NaN`을 들고 있다. `JSON.stringify`는 `NaN`을 `null`로 바꾼다. 직접 확인한 결과다.

```
JSON.stringify({ netPrice: NaN })  →  {"netPrice":null}
```

그래서 공급가를 비운 채 등록하면 서버가 `null`을 받는다. 공급가는 별표도 없고 폼 규칙도 없는 선택 항목인데 등록이 400으로 막힌다.

**둘째, 수정 화면의 왕복.** 단건 조회가 DB 행을 그대로 돌려주므로 nullable 컬럼은 `null`로 온다. 폼은 그걸 `reset`으로 담고, 저장할 때 **전체 객체를 그대로 PATCH한다.** 화면에서는 빈 칸으로 보이지만 값은 `null`이다. 부분 수정 모드가 `undefined`만 건너뛰면 그 `null`들이 전부 검증에 걸린다.

이게 특히 위험한 이유는 **어떤 상품이 걸리는지가 데이터 이력에 달려 있다는 점**이다. 엑셀 대량등록은 빈 선택 칸을 `undefined`로 만들어 저장하므로, 엑셀로 올린 상품은 그 컬럼들이 전부 NULL이다. 그런 상품을 열어 이름 하나만 고쳐도 저장이 막힌다. 새로 만든 상품으로 테스트하면 재현되지 않는다.

**테스트가 이걸 잡지 못한 이유는 분명하다.** 검증 테스트는 선택 필드를 아예 빼거나 정상값을 넣어 썼다. `null`을 넣은 케이스가 하나도 없었다. 커버리지는 넓어 보였지만 실제 클라이언트가 보내는 모양을 한 번도 통과시키지 않았다.

## When to Apply

- 쓰기 경로에 검증을 새로 붙이는 모든 경우. 특히 기존에 검증이 없던 route에 얹을 때
- 테이블에 nullable 컬럼이 있고, 그 값을 읽어 폼에 넣었다가 되돌려보내는 화면이 있을 때
- 숫자 입력을 `valueAsNumber`로 등록한 폼이 있을 때
- 대량등록 같은 경로가 선택 필드를 `undefined`로 저장해 DB에 NULL을 남기고 있을 때

**판별 질문:** 이 필드가 비어 있을 때, 값이 서버까지 어떤 모양으로 도착하는가. 코드를 읽어 추측하지 말고 실제 요청 본문을 확인한다.

## Examples

**테스트에 반드시 넣을 것.** 이 두 건이 있었으면 병합 전에 잡혔다.

```ts
it('선택 필드가 null이면 통과한다 — DB nullable 컬럼이 그대로 돌아온다', () => {
  expect(
    findProductWriteViolation({ ...valid, netPrice: null, customerCode: null, keyWords: null, option: null }),
  ).toBeNull();
});

it('부분 모드에서도 선택 필드 null은 통과한다', () => {
  expect(findProductWriteViolation({ netPrice: null, modelName: null }, 'partial')).toBeNull();
});
```

여기에 **필수 필드의 `null`은 여전히 거부되는지**, 그리고 **중첩 구조 안의 선택 필드가 `null`이어도 통과하는지**를 함께 둔다. 뒤의 것이 없으면 `.nullish()`를 빠뜨린 것이 드러나지 않는다.

**하지 말 것 — 보정.** `null`을 만나 `0`이나 빈 문자열로 바꿔 저장하는 처리는 넣지 않는다. 조용히 틀린 값을 남기는 쪽이 더 나쁘다는 판단은 [`display-label-to-domain-code-boundary.md`](display-label-to-domain-code-boundary.md)에 적혀 있다. `null`은 "비어 있다"는 뜻이므로 그대로 통과시켜 컬럼에 NULL로 남기는 것이 맞다.

**주의 — 진위 검사로 줄이지 말 것.** `if (!value) continue` 로 짧게 쓰면 `0`, 빈 문자열, `false`가 함께 빨려 들어간다. 판매가 `0`이나 배송비 `0`은 정상값이다. 반드시 `=== null`과 `=== undefined`로 명시해 비교한다.

## Related

- [`display-label-to-domain-code-boundary.md`](display-label-to-domain-code-boundary.md) — 같은 검증 모듈을 만든 라운드. 보정하지 않는다는 원칙의 출처
- [`db-null-vs-domain-undefined-boundary.md`](db-null-vs-domain-undefined-boundary.md) — DB의 `null`과 도메인의 `undefined`가 어긋나 화면 표시에서 드러난 사례. 이 문서는 같은 어긋남이 **쓰기 방향**에서 터진 경우다
