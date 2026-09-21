---
title: 느슨한 검증은 "저장도 같은 변환을 거친다"는 암묵 계약 위에 서 있다
date: 2026-09-21
category: architecture-patterns
module: features/shoppingSetting/util/shoppingSettingWriteSchema, app/api/shopping/settings
problem_type: architecture_pattern
component: validation
severity: high
applies_when:
  - 쓰기 검증 함수가 `String(...)`·`Number(...)`로 강제변환한 뒤 허용값을 판정할 때
  - 검증 함수와 저장 코드가 다른 파일에 있을 때
  - 같은 검증 함수를 여러 route가 공유할 때
  - 검증을 통과한 값을 route가 `.values()`/`.set()`에 직접 넣을 때
symptoms:
  - 배열이나 숫자를 보냈는데 검증을 통과한다 (`String(['USED']) === 'USED'`)
  - 한 route는 정상인데 다른 route만 이상한 값이 저장된다
  - text 컬럼에 배열이 들어가 저장 시점이 아니라 그 값을 읽는 화면에서 터진다
tags:
  - validation
  - type-coercion
  - drizzle
  - api-design
  - contract
---

# 느슨한 검증은 "저장도 같은 변환을 거친다"는 암묵 계약 위에 서 있다

## Context

쇼핑몰 정보설정의 쓰기 검증(`findShoppingSettingWriteViolation`)은 계정 도메인의 선례를 따라
허용값을 이렇게 본다.

```ts
if (has('productCondition') && !PRODUCT_CONDITIONS.includes(String(values.productCondition))) {
  return '상품상태 값이 올바르지 않습니다.';
}
if (has('salesPeriod') && !SALES_PERIODS.includes(Number(values.salesPeriod))) {
  return '판매기간 값이 올바르지 않습니다.';
}
```

이 검증은 `'30'`을 통과시킨다. `Number('30')`이 30이니 **저장될 값**은 적법하기 때문이다.
즉 이 함수는 "당신이 보낸 값"이 아니라 **"변환하면 나올 값"**을 판정한다.

그래서 이 함수는 혼자서는 안전하지 않다. 호출자가 **검증이 시험한 그 변환값을 저장**할 때만 맞다.
route가 원본 body 값을 그대로 넣으면 판정과 저장이 서로 다른 값을 가리킨다.

실제로 그렇게 됐다. 생성 route는 `String(body.productCondition)`·`Number(body.salesPeriod)`로
저장했는데, 수정(PATCH) route는 `nickname`·`salesPeriod`만 재변환하고 `productCondition`을 빠뜨렸다.

```
PATCH /api/shopping/settings/{내 설정 id}
{ "productCondition": ["USED"] }
```

`String(['USED'])`는 `'USED'`라서 검증을 통과하고, 저장되는 값은 **배열 그대로**다. 대상은 `text` 컬럼이다.
증상은 저장 시점이 아니라 그 값을 `'NEW' | 'USED'`로 믿고 읽는 화면에서 나타난다.

## Guidance

**강제변환으로 판정했으면 그 변환값을 저장한다.** 검증과 저장이 같은 변환을 거치는 한 이 방식은 안전하다.
어느 한쪽이라도 빠지면 판정이 무의미해진다.

```ts
// 위험 — 검증은 String(...)으로 봤는데 저장은 원본이다
values.productCondition = body.productCondition;

// 안전 — 검증이 시험한 것과 같은 값을 저장한다
if ('productCondition' in values) values.productCondition = String(values.productCondition);
```

**이 계약을 검증 함수의 JSDoc에 적는다.** 계약이 코드 두 곳에 흩어져 있고 어느 쪽에도 적혀 있지 않으면,
필드를 추가하는 다음 사람이 변환을 빠뜨렸는지 알 방법이 없다. 함수가 느슨한 이유와 호출자의 의무를
함수 자신이 말해야 한다.

**대안은 엄격 검증이다.** `typeof value !== 'string'`으로 거르면 호출자의 의무가 사라진다.
이 프로젝트는 계정 도메인의 기존 관례와 맞추려고 느슨한 쪽을 유지했지만, **새 도메인을 처음부터 짠다면
엄격한 쪽이 기본값으로 낫다** — 계약을 문서로 지키는 것보다 타입으로 지키는 편이 싸다.

## 판별 방법

필드별로 두 가지를 짝지어 확인한다.

| 검증 방식 | 저장 시 필요한 것 |
|---|---|
| `String(x)` / `Number(x)`로 변환 후 판정 | 저장도 같은 변환을 거쳐야 함 |
| `typeof x === 'boolean'` 같은 엄격 검사 | 그대로 저장해도 안전 |
| 객체 모양을 키 단위로 검사 | 그대로 저장해도 안전 (단, 모르는 키를 버리는 것은 별개 문제) |

허용 필드 목록을 훑으며 "이 필드는 어느 행인가"를 묻는 것만으로 누락이 드러난다.
실제로 이 방식으로 감사해 `productCondition` 하나만 누락이었음을 확인했다.

## 관련

- `absent-optional-value-arrives-as-null.md` — 같은 쓰기 경로에서 `null`이 `undefined`인 척하던 문제
- `normalize-before-validate-swallows-invalid-input.md` — 정규화가 검증보다 먼저 와서 입력을 삼키는 반대 방향 사례
- `jsonb-columns-on-one-write-path-need-one-sanitization-policy.md` — 같은 route 안에서 정책이 갈리는 문제
