---
title: 신규 기능이 기존 개념을 대체할 때 레거시 엔티티가 병렬로 남는 패턴
date: 2026-07-12
category: architecture-patterns
module: features/shoppingAccount, features/order
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - 새 기능이 기존 개념을 사실상 대체하지만 이전 타입/API/mock이 삭제되지 않았을 때
  - 이름은 다르지만 필드 구성이 거의 동일한 두 타입이 서로 다른 위치(`shared/` vs `features/`)에 존재할 때
  - `ownerId` 등 프로젝트 표준 패턴이 일부 엔티티에만 적용돼 있을 때
tags:
  - mallAccount
  - shoppingAccount
  - legacy-cleanup
  - duplicate-entity
  - ownerId
  - dead-code
---

# 신규 기능이 기존 개념을 대체할 때 레거시 엔티티가 병렬로 남는 패턴

## Context

`ShoppingMalls` 관련 타입을 재정의하는 작업 중, `src/shared/types/mallAccount.types.ts`의 `MallAccount`라는 타입을 발견했다. `src/features/shoppingAccount/`의 `ShoppingAccount`(쇼핑몰 로그인 계정 관리 정식 기능)와 필드 구성이 사실상 동일했지만 — `id`, `mallCode`, `mallId`, 로그인 정보, `createdAt`/`updatedAt` — `ownerId` 필드가 없었고, `order/collect`(주문수집) 화면의 몰별 계정 드롭다운에서 조회 전용으로만 쓰이고 있었다. `createMallAccount`/`deleteMallAccount`는 호출하는 UI가 전혀 없는 죽은 코드였다.

추가로 `MockShoppingMallAccountsData.ts`의 `MallAccountEntry`라는 **세 번째 유사 타입**까지 발견됐다 — 같은 개념이 3곳에 흩어져 있었던 셈이다.

## Guidance

**"신규 정식 기능이 생기면 그 이전에 같은 역할을 하던 임시/레거시 구현이 조용히 남는다"는 것을 전제로 조사한다.** 식별 신호:

1. **`ownerId` 유무** — 이 프로젝트는 슈퍼계정 종속 패턴(`ownerId`)을 표준으로 쓴다([[user-hierarchy-ownerid-pattern]]). 같은 개념의 두 타입 중 하나에만 `ownerId`가 없다면, 그것이 표준화 이전에 만들어진 레거시일 가능성이 높다.
2. **위치** — `src/shared/`에 있는 타입이 `src/features/[domain]/`에 있는 더 풍부한 타입과 개념이 겹치면, `shared`가 먼저 만들어졌고 나중에 `features` 하위의 정식 기능이 생겼을 가능성을 의심한다.
3. **CRUD 함수 중 일부만 살아있는지 확인** — `getMallAccounts`는 실사용, `createMallAccount`/`deleteMallAccount`는 미사용이었다. 조회만 남아있고 생성/삭제가 죽어있다면, 등록 기능은 이미 새 정식 기능으로 이전됐고 조회부만 마이그레이션이 안 된 상태일 가능성이 크다.

```typescript
// 레거시 — src/shared/types/mallAccount.types.ts (ownerId 없음)
export interface MallAccount {
  id: string;
  mallCode: ShoppingMalls;
  mallName: string;
  mallId: string;
  manager: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

// 정식 — src/features/shoppingAccount/types/shoppingAccount.types.ts (ownerId 있음)
export interface ShoppingAccount {
  id: string;
  mallCode: ShoppingMalls;
  mallId: string;
  password: string;
  isActive: boolean;
  nickname: string;
  // ...
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```

**해결 방법:** 레거시 타입을 삭제하고, 남아있던 유일한 실사용처(조회)를 정식 기능 쪽에 새 경량 API로 추가해 대체한다. 정식 기능의 페이지네이션 전체 조회 API를 그대로 재사용하지 않고, 용도(드롭다운 채우기)에 맞는 최소 응답 형태의 별도 함수를 만든다 — 이미 검증된 패턴(`shoppingSetting`의 `AvailableMallAccount`/`getAvailableMallAccounts`)이 있으면 그 구조를 그대로 따른다.

## Why This Matters

- `ownerId`가 없는 레거시 엔티티는 멀티테넌트 격리 원칙을 우회하는 구멍이 된다 — 이 프로젝트에서 실제로는 mock이라 드러나지 않았지만, 실제 백엔드로 교체되는 순간 테넌트 간 데이터가 섞일 수 있는 경로였다.
- 같은 개념이 3곳(`MallAccount`, `ShoppingAccount`, `MallAccountEntry`)에 흩어져 있으면 신규 개발자가 어느 것이 "정본"인지 판단하기 어렵고, 실수로 레거시 쪽에 기능을 추가할 위험이 커진다.
- 죽은 CRUD 함수(`createMallAccount`/`deleteMallAccount`)는 MSW 핸들러까지 등록된 채로 남아있어서, API 엔드포인트 목록만 봐서는 실제 사용 여부를 알 수 없었다 — grep으로 "타입 정의"만 찾으면 놓치고, "실제 호출부"까지 대조해야 드러난다.

## When to Apply

- 어떤 도메인에 "정식" 기능(`features/[domain]/`)이 새로 생겼는데, 비슷한 이름의 타입이 `shared/`나 다른 오래된 위치에도 있다면 두 개가 같은 개념을 가리키는지 먼저 확인한다.
- 확인 기준: 필드 구성 유사도 + `ownerId` 유무 + 실제 호출부(생성/삭제/조회 각각) 존재 여부.
- 레거시로 판명되면, 삭제 전에 **레거시의 유일한 살아있는 참조**를 정식 기능 쪽 API로 먼저 대체한 뒤에 삭제한다(순서를 바꾸면 중간에 빌드가 깨지는 상태를 거치게 된다).

## Examples

실제 코드 위치 (삭제됨, git 히스토리에서 확인 가능):
- `src/shared/types/mallAccount.types.ts`, `src/shared/api/{getMallAccounts,createMallAccount,deleteMallAccount}.ts`
- `src/mocks/handlers/mallAccounts.ts`, `src/mocks/utils/mallAccounts.ts`, `src/mocks/data/MockShoppingMallAccountsData.ts`

대체 후 정식 위치:
- `src/features/shoppingAccount/api/getShoppingAccountsByMall.ts`, `useGetShoppingAccountsByMall.ts`
- `src/mocks/utils/getShoppingAccountsByMall.ts` (`AvailableMallAccount` 패턴을 따름)

## Related

- `[[user-hierarchy-ownerid-pattern]]` — `ownerId` 종속 표준 패턴
- `[[mall-account-to-setting-one-to-many-pattern]]` — `ShoppingAccount`/`ShoppingSetting` 관계 설계 배경
- `docs/superpowers/specs/2026-07-12-shopping-malls-type-redefinition-design.md` — 이 정리 작업의 설계 문서
- `[[full-codebase-audit-before-type-refactor]]` — 이런 중복을 발견하게 된 조사 방법론
