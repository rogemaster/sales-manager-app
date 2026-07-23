---
title: mallAccountId라는 필드명인데 실제로는 로그인 아이디(mallId) 값이 저장되던 문제
date: 2026-07-12
category: logic-errors
module: features/order
problem_type: logic_error
component: frontend_stimulus
severity: medium
symptoms:
  - 필드명(mallAccountId)은 "계정 엔티티의 id"를 암시하지만 실제 mock 데이터/필터 로직은 로그인 아이디 문자열을 담고 비교함
  - 드롭다운/검색 필터가 우연히 정상 동작해서 겉으로는 버그로 드러나지 않음
  - 코드 리뷰나 신규 기능 추가 시 필드명만 보고 "계정 id로 조인하면 되겠지"라고 잘못 가정할 위험
root_cause: naming_mismatch
resolution_type: rename_and_type_correction
tags:
  - naming
  - order
  - collection
  - type-safety
  - mallId
  - field-naming
---

# mallAccountId라는 필드명인데 실제로는 로그인 아이디(mallId) 값이 저장되던 문제

## Problem

`order/collect`(주문수집)와 `order/list`(주문목록) 두 화면 모두 `mallAccountId`라는 필드를 갖고 있었다. 이름만 보면 계정 엔티티(`ShoppingAccount.id` 같은 것)를 참조하는 것처럼 보이지만, 실제로는 로그인 아이디 문자열(`mallId`, 예: `'coupang_seller1'`)이 담겨 있었다.

```typescript
// CollectionJob — 이름은 mallAccountId지만 (당시 필드명, 2026-07-17에 mallCode로 리네임됨 — 아래 업데이트 참고)
export interface CollectionJob {
  id: string;
  mallName: ShoppingMalls;
  mallAccountId: string;  // 실제 값: 'coupang_seller1' (로그인 아이디)
  status: CollectionStatus;
  // ...
}
```

> **2026-07-17 업데이트:** 위 예제의 `mallName` 필드도 오도적인 이름이었다(실제로는 몰 "코드"를 저장). "타입 중복/불일치 정리" 라운드에서 `CollectionJob.mallName` → `mallCode`로 추가 리네임했다. 현재 `CollectionJob`은 `{ id, mallCode, mallId, status, ... }` 형태다.

같은 프로젝트의 `ShoppingSetting.mallAccountId`는 실제로 `ShoppingAccount.id`(진짜 엔티티 id)를 참조하는 **정상적인** 필드였기 때문에, 이름만 보고는 두 `mallAccountId`가 서로 다른 걸 가리킨다는 걸 알 수 없었다.

## Symptoms

- `mocks/utils/getOrders.ts`의 `filterByMallAccountId`가 `item.shoppingMallId`(로그인 아이디 필드)와 비교하고 있었다 — 함수명과 실제 비교 대상이 어긋나 있었다.
- `CollectionMallFilter.tsx`의 드롭다운이 `a.mallId`를 옵션 값으로 쓰고 있어서, UI 레벨에서도 "이건 계정 id가 아니라 로그인 아이디"라는 게 드러났다.
- 타입스크립트 컴파일 에러는 없었다 — `string` 타입끼리 비교라 타입 시스템이 이 불일치를 잡아주지 못했다.

## How This Was Found

grep으로 "`mallAccountId`"라는 이름만 찾아서는 이게 문제인지 알 수 없다. 발견 방법은 **필드명이 아니라 실제 값의 출처를 추적하는 것**이었다:

1. mock 데이터 파일(`MockCollectionJobsData.ts`)에서 `mallAccountId`에 실제로 어떤 값이 들어있는지 확인 → `'coupang_seller1'`, `'gadmin1111'` 같은 로그인 아이디 형태였다.
2. 그 값을 UI에서 어떻게 쓰는지 역추적 → `CollectionMallFilter.tsx`가 `ShoppingAccount.mallId`와 같은 종류의 값을 그 필드에 넣고 있었다.
3. 같은 이름(`mallAccountId`)을 쓰는 다른 도메인(`ShoppingSetting`)과 대조 → 그쪽은 진짜 `ShoppingAccount.id`를 참조하고 있어서, "같은 이름인데 의미가 다르다"는 게 명확해졌다.

## Solution

`CollectionJob.mallAccountId`, `CollectionSearchParams.mallAccountId`, `OrderSearchType.mallAccountId`를 전부 `mallId`로 리네이밍했다. `ShoppingSetting.mallAccountId`는 정상이므로 건드리지 않았다.

```typescript
// Before
export interface CollectionJob {
  mallAccountId: string;  // 오해를 부르는 이름
}

// After
export interface CollectionJob {
  mallId: string;  // 실제 의미(로그인 아이디)와 일치
}
```

## Why This Works

이름이 값의 실제 의미와 일치하면, 다음에 이 필드를 사용하려는 개발자(또는 AI 에이전트)가 "이건 엔티티 id니까 다른 테이블과 조인해야겠다" 같은 잘못된 가정을 할 여지가 없어진다. 타입 시스템이 문자열 값의 의미까지 검증해주지 않기 때문에, 네이밍이 유일한 방어선이다.

## Prevention

- **새 필드를 추가하거나 기존 필드를 리네이밍할 때, mock 데이터에 실제로 어떤 값이 들어가는지 확인한다.** 필드명만 보고 "이런 뜻이겠지"라고 넘기지 않는다.
- **같은 이름이 여러 도메인에 등장하면 각각의 실제 참조 대상을 대조한다.** 이름이 같다고 의미가 같다는 보장은 없다 — 이번 사례처럼 한쪽은 정상, 한쪽은 오명명일 수 있다.
- **"계정 id"류 필드는 이름에 참조 대상을 명시한다.** `mallAccountId`처럼 모호한 이름 대신, 로그인 아이디면 `mallId`, 엔티티 참조면 주석으로 `// 참조: ShoppingAccount.id`를 남긴다(`ShoppingSetting.mallAccountId`가 이미 이 패턴을 따르고 있었다).

## Related

- `docs/solutions/architecture-patterns/mall-account-to-setting-one-to-many-pattern.md` — `ShoppingSetting.mallAccountId`가 정상적으로 `ShoppingAccount.id`를 참조하는 대조 사례
- `[[legacy-duplicate-entity-mallaccount-vs-shoppingaccount]]` — 같은 조사에서 함께 발견된 레거시 타입 중복 사례
- `docs/superpowers/specs/2026-07-12-shopping-malls-type-redefinition-design.md` — 이 리네이밍의 설계 문서
