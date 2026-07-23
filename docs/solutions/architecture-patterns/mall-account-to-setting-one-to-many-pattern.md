---
title: 쇼핑몰 계정 1건에 설정(Setting) 다건을 허용하는 1:N 구조
date: 2026-07-08
category: architecture-patterns
module: features/shoppingSetting
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - 이미 등록된 계정/리소스에 "설정값"을 별도 엔티티로 분리해서 관리할 때
  - 하나의 상위 리소스에 여러 개의 하위 설정(변형)을 허용해야 할 때
  - 신규 등록 모달에서 이미 사용 중인 대상도 다시 선택 가능해야 하는지 판단할 때
tags:
  - shoppingSetting
  - shoppingAccount
  - one-to-many
  - mallAccountId
  - architecture
  - modal-design
---

# 쇼핑몰 계정 1건에 설정(Setting) 다건을 허용하는 1:N 구조

## Context

"쇼핑몰 정보설정" 화면을 만들면서, 기존에 이미 존재하던 "쇼핑몰 계정관리"(`src/features/shoppingAccount`, 로그인 계정/API키 관리)와 어떻게 다른지 구분이 필요했다. 처음에는 계정관리 기능에 "설정" 탭을 추가하는 방식도 검토했지만, 브레인스토밍 중 테이블에 **별칭(nickname)** 컬럼과 **복사**(설정값을 복제해 새 행 생성) 기능이 요구사항으로 나오면서, 계정 1건에 여러 개의 독립된 설정 행이 존재할 수 있는 구조라는 게 드러났다.

## Guidance

**`ShoppingAccount`(계정, 1건)와 `ShoppingSetting`(설정, N건)을 별개 엔티티로 분리하고, `ShoppingSetting.mallAccountId`로 계정을 참조한다.**

```typescript
// src/features/shoppingSetting/types/shoppingSetting.types.ts
export interface ShoppingSetting {
  id: string;
  mallAccountId: string;   // 참조: ShoppingAccount.id — 여기가 1:N 관계의 핵심
  mallCode: ShoppingMalls;
  mallId: string;          // denormalized — 필터/테이블 표시 성능을 위해 계정 정보를 복사
  nickname: string;        // 설정 건 단위 구분자 — 계정당 여러 설정을 구분하는 유일한 사용자 식별 정보
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```

### 신규추가 모달의 대상 범위 결정

"계정 등록 쇼핑몰 리스트"를 보여주는 신규추가 모달에서, **이미 설정이 등록된 계정도 다시 노출해야 하는지**가 애매했다. 1:N 구조를 확정한 순간 답이 정해진다 — 계정 1건에 설정이 여러 개 허용되므로, 이미 설정된 계정도 목록에서 제외하면 안 된다. 대신 "이미 N건 설정됨" 배지로 상태만 알려준다.

```typescript
// src/mocks/utils/getAvailableMallAccounts.ts
export const getMockAvailableMallAccounts = (ownerId: string): AvailableMallAccount[] => {
  return MOCK_SHOPPING_ACCOUNTS_DATA.filter((account) => account.ownerId === ownerId).map((account) => ({
    id: account.id,
    mallCode: account.mallCode,
    mallId: account.mallId,
    settingCount: MOCK_SHOPPING_SETTINGS_DATA.filter((s) => s.mallAccountId === account.id).length,
  }));
};
```

이 함수는 계정을 **필터링하지 않고 전부** 반환하며, `settingCount`는 단순 표시용 부가 정보다.

## Why This Matters

- **테이블의 "복사" 버튼이 성립하려면** 동일 `mallAccountId`를 가진 설정 행이 여러 개 존재할 수 있어야 한다. 계정:설정을 1:1로 설계했다면 복사 기능 자체가 모순된다.
- **"별칭" 컬럼이 필요한 이유**도 여기서 나온다 — 계정의 `nickname`과는 별개로, 설정 건을 구분하는 라벨이 필요하다.
- 반대로 계정관리(`shoppingAccount`)는 로그인 자격 증명(계정 1건 = 로그인 세션 1개)을 다루므로 1:1이 맞다. 두 기능을 같은 엔티티로 합쳤다면 이 차이가 뭉개졌을 것이다.

## When to Apply

- 새 "하위 설정/변형" 화면을 만들 때, 상위 리소스와의 관계가 1:1인지 1:N인지 먼저 확인한다 — "복사해서 여러 개 만들 수 있는가?"가 가장 빠른 판단 기준이다.
- 1:N이 맞다면, 신규 등록 모달의 대상 리스트는 "아직 안 쓴 것만"이 아니라 "전체 + 사용 현황 배지"로 설계한다.

## Related

- `src/features/shoppingSetting/types/shoppingSetting.types.ts` — `ShoppingSetting`, `AvailableMallAccount`
- `src/mocks/utils/getAvailableMallAccounts.ts` — 계정별 설정 건수 집계
- `src/features/shoppingSetting/ui/list/components/NewSettingModal.tsx` — "이미 N건 설정됨" 배지 노출
- `docs/superpowers/specs/2026-07-08-shopping-mall-settings-design.md` — 원 설계 결정 배경
