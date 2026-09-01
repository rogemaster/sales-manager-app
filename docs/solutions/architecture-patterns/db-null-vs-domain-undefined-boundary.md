---
title: DB의 null과 도메인 타입의 undefined가 어긋나 옵셔널 필드 렌더가 깨진다
date: 2026-09-01
category: architecture-patterns
module: db, features/products
problem_type: type_boundary
component: data_mapping
severity: medium
applies_when:
  - mock 배열로 돌던 도메인을 실제 DB(Drizzle/Neon)로 이전할 때
  - 도메인 인터페이스가 옵셔널 필드를 `field?: T`로 선언해 둔 상태에서 nullable 컬럼을 읽을 때
  - `value ?? fallback` / `!value` / `value !== undefined` 같은 가드가 화면 곳곳에 흩어져 있을 때
symptoms:
  - mock에서는 잘 나오던 값이 DB 이전 후 "0원"·"-"처럼 엉뚱하게 렌더된다
  - `netPrice !== undefined`가 항상 true라 빈 값 분기가 안 탄다
  - 타입에는 `T | undefined`인데 런타임 값이 null이다
tags:
  - drizzle
  - neon
  - null
  - undefined
  - type-boundary
  - migration
---

# DB의 null과 도메인 타입의 undefined가 어긋나 옵셔널 필드 렌더가 깨진다

## Context

상품을 MSW mock 배열에서 Neon으로 옮기면서 목록의 공급가(`netPrice`) 표시가 깨졌다.

- mock 시절: 값이 없으면 키 자체가 없거나 `undefined`였다 → `netPrice !== undefined` 가드가 정상 동작
- DB 이후: nullable 컬럼이 비어 있으면 드라이버가 **`null`**을 준다 → `null !== undefined`는 **true**라서 "값이 있다"로 판정되고, 그 뒤 숫자 포매팅이 `null`을 받아 엉뚱하게 렌더된다

도메인 타입은 `netPrice?: number`(= `number | undefined`)라고 선언돼 있으니, **타입은 계속 거짓말을 한다.** 컴파일러는 아무것도 잡아주지 못한다.

## 해결 — 두 층위

**즉시 조치(현재 적용):** 값 유무를 판정하는 자리를 `== null`로 바꾼다. 느슨한 비교라 `null`과 `undefined`를 한 번에 거른다.

```tsx
// ProductTableBody.tsx
{product.netPrice == null ? '-' : `${product.netPrice.toLocaleString()}원`}
```

**근본 조치(미적용, 다음 라운드 후보):** route가 응답을 만들기 직전에 row → 도메인 타입 매핑 함수를 한 번 통과시켜 `null`을 `undefined`로 정규화한다. 그러면 소비처가 `?:` 선언을 믿을 수 있게 되고, 가드를 화면마다 기억할 필요가 없어진다.

지금은 nullable 컬럼이 11개(`customerCode`·`netPrice`·`modelName`·`modelId`·`originCountryCode`·`originCountryEtc`·`taxType`·`adultProductType`·`option`·`subOption`·`keyWords`)이고, `netPrice` 외에는 소비처가 `?? ''`·`?? []`·옵셔널 체이닝으로 **우연히** 방어돼 있어 증상이 없다. 우연이라는 점이 중요하다 — 새 소비처가 `!== undefined`를 쓰는 순간 같은 버그가 재발한다.

## 판별 질문

**이 필드가 "없음"을 표현하는 방식이 층마다 같은가?**

| 층 | "없음"의 표현 |
|---|---|
| DB 컬럼 (nullable) | `null` |
| Drizzle row | `null` |
| 도메인 인터페이스 `field?: T` | `undefined` |
| React Hook Form 미입력 필드 | `undefined` 또는 `''` |
| `JSON.stringify` 이후 | `undefined` 키는 **사라짐** |

한 요청이 이 층들을 전부 지난다. 어느 한 층에서 다른 표현으로 바뀌면 그 지점에 변환이 있어야 하고, 없으면 조용히 어긋난다.

## When to Apply

- mock → DB 이전 작업을 할 때 → **nullable 컬럼 목록을 먼저 뽑고**, 각 필드의 소비처가 `undefined`를 전제하는지 grep한다. `!== undefined`, `=== undefined`, `!value`가 전부 후보다
- 새 nullable 컬럼을 추가할 때 → 도메인 타입을 `field?: T`로 둘지 `field: T | null`로 둘지 먼저 정한다. 프로젝트 관례는 `?:`이므로, 그렇다면 route에 정규화 책임이 생긴다
- 옵셔널 값의 유무 판정 → `== null` (느슨한 비교)을 쓴다. eslint `eqeqeq`가 켜져 있어도 `null` 비교는 관례적으로 허용된다

## Related

- [`json-stringify-drops-undefined-breaks-field-clearing.md`](../logic-errors/json-stringify-drops-undefined-breaks-field-clearing.md) — 같은 경계의 다른 구간(`undefined` 키가 직렬화에서 사라진다)
- [`typescript-type-design-patterns.md`](../conventions/typescript-type-design-patterns.md) — 도메인 타입 설계 관례
- `docs/superpowers/specs/2026-09-01-product-image-r2-storage-design.md` §9 — 매핑 함수 도입이 오픈 이슈로 기록돼 있다
