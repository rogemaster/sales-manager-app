---
title: 폼 필드 DOM id가 동적 id={field.key} 섹션과 충돌해 라벨 포커스가 튄다
date: 2026-08-14
category: ui-bugs
module: features/products
problem_type: ui_bug
component: frontend_stimulus
severity: medium
applies_when:
  - 상품 폼에 새 입력 필드를 추가할 때(같은 페이지에 상품정보고시 섹션이 함께 렌더된다)
  - Label htmlFor / Input id 쌍을 새로 작성할 때
  - 상수 배열을 순회하며 id={field.key}로 입력을 렌더하는 섹션이 같은 페이지에 있을 때
symptoms:
  - 라벨을 클릭하면 엉뚱한 입력으로 포커스가 이동한다
  - 스크린리더가 서로 다른 두 입력에 같은 라벨을 읽는다
  - 저장되는 값은 정상이라 기능 테스트로는 발견되지 않는다
related_components:
  - tooling
tags:
  - accessibility
  - dom-id
  - form
  - label
  - products
  - informationDisclosure
---

# 폼 필드 DOM id가 동적 `id={field.key}` 섹션과 충돌해 라벨 포커스가 튄다

## 증상

`/products/[id]`에서 상품정보고시 카테고리를 선택한 뒤 고시 섹션의 "생산자,수입품의 경우 수입자를 함께 표기" 라벨을 클릭하면, 포커스가 그 입력이 아니라 **페이지 위쪽 "제조업체" 입력**으로 이동한다. 스크린리더도 두 입력에 같은 라벨을 읽는다.

저장값은 정상이다 — React Hook Form은 `name` 기준으로 동작하고 `id`를 쓰지 않는다. 순수하게 포커스·접근성 문제라 기능 테스트로는 절대 안 걸린다.

## 원인

`ProductInformationDisclosureSection`은 상수 배열을 순회하며 입력을 렌더한다.

```tsx
<Input id={field.key} {...register(`informationDisclosure.fields.${field.key}`)} />
```

`informationDisclosure.constants.ts`에는 `manufacturer`(생산자…), `modelName`(품목 또는 명칭) 같은 키가 여러 카테고리에 걸쳐 들어 있다. 여기에 새 상품 폼 섹션이 `id="manufacturer"`, `id="modelName"`을 쓰면서 **한 문서에 같은 id가 2개** 생겼다.

브라우저는 `htmlFor`를 문서 순서상 **첫 번째** 엘리먼트로 해석한다. 새 섹션이 고시 섹션보다 위에 있으므로 고시 섹션 라벨이 위쪽 입력을 가리키게 된다.

카테고리를 고르기 전에는 고시 입력이 렌더되지 않아 id가 유일하다 — **고시 카테고리를 선택한 뒤에만 재현된다.**

## 해결

이 프로젝트에는 이미 `product` 접두사 컨벤션이 있었는데 새 컴포넌트가 따르지 않은 것이 원인이었다.

```tsx
// ProductBasicInfo.tsx — 기존 컨벤션
<Label htmlFor="productName">상품명 *</Label>
<Input {...register('name', ...)} />

// ProductPriceAndQuantityInfo.tsx
<Label htmlFor="salePrice">판매가 *</Label>
```

새 섹션의 4개 필드를 `productBrand`·`productManufacturer`·`productModelName`·`productModelId`로 바꿔 해결했다. **`register(...)` 경로는 그대로 둔다** — 바꾸면 저장 데이터가 깨진다.

## 규칙

상품 폼에 입력을 추가할 때 `id`/`htmlFor`는 **`product` 접두사를 붙인 이름**을 쓴다. RHF 필드 경로와 같을 필요가 없고, 오히려 같으면 위 충돌에 노출된다.

충돌 여부를 확인하려면 새 id 문자열로 `src` 전체를 grep하고, 동적 렌더 섹션이 참조하는 상수 파일(`informationDisclosure.constants.ts`)에 같은 키가 있는지도 함께 본다. 정적 grep만으로는 `id={field.key}` 쪽이 안 잡힌다.

**주의:** 기존 코드에 반례가 하나 있다. `ProductPriceAndQuantityInfo.tsx`의 `htmlFor="supplyPrice"`는 `register('netPrice')`와 짝이 안 맞아 라벨-입력 연결 자체가 끊겨 있다(별개의 기존 결함). 이 파일을 복사 원본으로 삼을 때 그 부분까지 따라가지 말 것.
