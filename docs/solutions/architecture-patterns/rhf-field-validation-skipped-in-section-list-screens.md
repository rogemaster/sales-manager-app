---
title: 섹션을 직접 나열하는 화면을 빠뜨리면 RHF 필수 검증이 무증상으로 빠진다
date: 2026-08-14
category: architecture-patterns
module: features/products
problem_type: architecture_pattern
component: frontend_stimulus
severity: high
applies_when:
  - Product 등 공유 도메인 타입에 폼 필수 필드를 추가할 때
  - 새 폼 섹션 컴포넌트를 만들어 여러 화면에 배치할 때
  - 같은 도메인 폼을 래퍼 컴포넌트(ProductForm)와 섹션 직접 나열 방식이 섞여 쓰는 코드베이스에서 작업할 때
symptoms:
  - 필수 필드를 비워도 특정 화면에서만 저장이 그대로 성공한다
  - 콘솔 에러도 타입 에러도 없고 테스트도 통과하는데 데이터에 빈 값이 들어간다
  - 등록/수정 화면에서는 검증이 걸리는데 다른 화면에서만 안 걸린다
related_components:
  - tooling
tags:
  - react-hook-form
  - validation
  - form
  - silent-failure
  - products
  - mallLinkedProduct
---

# 섹션을 직접 나열하는 화면을 빠뜨리면 RHF 필수 검증이 무증상으로 빠진다

## 문제

`Product`에 폼 필수 필드(`brand`·`manufacturer`)를 추가하면서 `ProductBrandModelSection` 컴포넌트를 만들었다. 이 프로젝트에는 상품 폼을 쓰는 화면이 3개인데, 배치 방식이 두 가지로 갈린다.

| 화면 | 방식 |
|---|---|
| `/products/create` | `<ProductForm />` 래퍼 사용 |
| `/products/[id]` | `<ProductForm />` 래퍼 사용 |
| `/shopping/linked-products/[id]` | **섹션 컴포넌트를 직접 나열** (2026-08-03 설계 결정) |

앞 둘은 `ProductForm.tsx` 한 곳만 고치면 자동 반영된다. 세 번째는 수동으로 추가해야 하고, **빠뜨려도 아무 에러가 나지 않는다.**

## 왜 무증상인가

React Hook Form은 `register`가 호출된 필드만 내부 필드 맵에 등록한다. `trigger()`·`handleSubmit()`의 검증 대상은 그 맵이다.

섹션 컴포넌트가 렌더되지 않으면 `register('brand', { required: ... })`가 아예 호출되지 않고, 따라서 `brand`는 검증 대상에 **존재하지 않는 필드**가 된다. 에러가 나는 게 아니라 조용히 통과한다.

연동상품 수정 화면은 저장 전에 이렇게 검증한다.

```tsx
const validateBothForms = async () => {
  const [isProductValid, isSettingValid] = await Promise.all([productForm.trigger(), settingForm.trigger()]);
  return isProductValid && isSettingValid;
};
```

`productForm.trigger()`는 등록된 필드만 보므로 `true`를 반환하고, 저장은 `productSnapshot: productForm.getValues()`로 빈 `brand`를 스냅샷에 넣는다. 타입은 `brand?: string`이라 컴파일도 통과한다.

**타입 체커·테스트·런타임 어느 층에서도 잡히지 않는다.** 이 프로젝트는 UI 컴포넌트에 테스트를 두지 않는 컨벤션이라 테스트로 막을 수도 없다.

## 대응

2026-08-14 라운드에서는 이 화면 반영을 **별도 Task로 분리하고 그 이유를 계획서에 명시**해 막았다. 리뷰어에게도 "새 섹션이 `settingForm`이 아니라 `productForm`의 `FormProvider` 안쪽에 있는지"를 핵심 검증 지점으로 지목했다.

## `Product`에 폼 필수 필드를 추가할 때 반영해야 할 화면 목록

타입 체커가 강제하지 않으므로 수동으로 따라야 한다. `.claude/rules/domain-design.md`의 "새 몰에 고유 속성 추가 시 체크리스트"와 같은 성격이다.

1. `src/features/products/types/product.types.ts` — 필드 추가
2. 폼 섹션 컴포넌트 — 신규 생성 또는 기존 섹션에 필드 추가
3. `src/features/products/ui/components/ProductForm.tsx` — 섹션 배치 (`/products/create`·`/products/[id]` 자동 반영)
4. **`src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx`** — 섹션 직접 나열 구조라 수동 추가. `<FormProvider {...productForm}>` **안쪽**에 넣어야 한다
5. `src/mocks/data/MockProductsData.ts` — 필수 필드면 기존 20건에 값을 채운다. 안 채우면 기존 상품 수정 화면이 저장 불가 상태가 된다
6. 엑셀 대량등록(`bulkTemplate.constant.ts` + `productExcelSaveStrategy.ts`) — 반영하지 않으면 엑셀로 만든 상품은 필수 필드가 빈 채로 생성된다

## 새 화면을 만들 때

섹션을 직접 나열해야 할 이유가 없다면 `ProductForm` 래퍼를 써라. 직접 나열은 연동상품 수정 화면처럼 **상품 폼과 설정 폼 두 개를 나란히 놓아야 해서** 기존 래퍼를 못 쓰는 경우에 한한다. 나열 방식을 택하면 위 목록에 화면이 하나 늘고, 이후 모든 필드 추가 라운드가 그 비용을 낸다.

관련: [`screen-owned-table-header-constants.md`](screen-owned-table-header-constants.md) — 같은 유형(공유 상수/컴포넌트를 화면별로 나눌 때 생기는 수동 동기화 부담)
