---
title: 새 검색 실행 시 selectedJobIds가 초기화되지 않는 버그
date: 2026-05-25
category: logic-errors
module: order-collect
problem_type: logic_error
component: frontend_stimulus
severity: high
symptoms:
  - 새 검색 실행 후에도 이전 검색에서 선택한 job ID들이 selectedJobIdsAtom에 잔류
  - "주문수집 버튼에 stale 선택 카운트가 표시됨 (예: 주문수집 (3건))"
  - 새 검색 결과에서 아무것도 선택하지 않았음에도 주문수집 버튼이 활성화 상태 유지
  - 주문수집 실행 시 현재 화면에 없는 stale job ID들이 API에 전송됨
root_cause: logic_error
resolution_type: code_fix
tags:
  - jotai
  - atom
  - selected-ids
  - state-reset
  - order-collect
---

# 새 검색 실행 시 selectedJobIds가 초기화되지 않는 버그

## Problem

주문수집 페이지에서 사용자가 행을 선택한 후 필터 조건을 변경하고 "검색"을 다시 실행하면, 이전 검색 결과에서 선택했던 `selectedJobIds`가 초기화되지 않고 그대로 남아 있었다. 검색 결과 목록은 교체되지만 선택 상태 atom은 독립적으로 유지되어 두 상태가 불일치하게 된다.

## Symptoms

- 새 검색 실행 후에도 이전 검색에서 선택한 job ID들이 `selectedJobIdsAtom`에 잔류
- 주문수집 버튼에 stale 선택 카운트가 표시됨 (예: "주문수집 (3건)")
- 새 검색 결과에서 아무것도 선택하지 않았음에도 주문수집 버튼이 활성화 상태 유지
- 주문수집 실행 시 현재 화면에 없는 stale job ID들이 API에 전송됨

## What Didn't Work

초기 구현에서 `handleSearch`는 `setSearchParams(...)`만 호출했다. 검색 파라미터를 새로 세팅하는 것에만 집중하여, 이전 검색 결과에 종속된 UI 상태(`selectedJobIds`)도 함께 초기화해야 한다는 side effect를 고려하지 못했다.

`collectSearchParamsAtom`과 `selectedJobIdsAtom`은 서로 다른 독립 Jotai atom에 분리되어 있어, 하나를 변경할 때 나머지를 함께 리셋해야 한다는 연관 관계가 코드에서 명시적으로 드러나지 않았다.

## Solution

`CollectionFilterSection.tsx`의 `handleSearch` 함수에서 검색 파라미터를 세팅하기 전에 `selectedJobIdsAtom`을 명시적으로 초기화한다.

**Before** (`src/features/order/ui/collect/CollectionFilterSection.tsx`):
```typescript
const handleSearch = () => {
  setSearchParams({ startDate, endDate, mallCode, mallAccountId });
};
```

**After**:
```typescript
const setSelectedJobIds = useSetAtom(selectedJobIdsAtom);

const handleSearch = () => {
  setSelectedJobIds([]);  // 이전 선택 상태 초기화 후 새 검색 실행
  setSearchParams({ startDate, endDate, mallCode, mallAccountId });
};
```

## Why This Works

`collectSearchParamsAtom`과 `selectedJobIdsAtom`은 독립적인 Jotai atom이다. 검색 파라미터가 변경되면 TanStack Query가 새 목록을 fetch하지만, Jotai atom인 `selectedJobIds`는 React Query의 데이터 갱신과 연동되어 있지 않다. 따라서 새 결과가 렌더링되어도 이전 선택 상태는 자동으로 사라지지 않는다.

검색 실행 시점이 두 상태를 동기화해야 하는 유일한 계기이므로, `handleSearch`에서 명시적으로 reset하는 것이 올바른 위치다.

## Prevention

- **검색 핸들러 구현 시 체크리스트**: 새 검색을 실행하는 함수를 구현할 때, 해당 검색 결과에 의존하는 모든 UI 상태(선택 상태, 체크박스, 페이지네이션 등)를 함께 초기화하는지 확인한다.
- **atom 초기화 순서 관례화**: reset → fetch 순서(선택 초기화 먼저, 파라미터 세팅 나중)를 관례로 삼는다.
- **코드 리뷰 체크포인트**: 검색/조회 핸들러를 리뷰할 때 "이 액션 이후 stale 상태가 남는 atom이 있는가?"를 명시적으로 확인한다.

## Related Issues

- `docs/superpowers/plans/2026-05-25-order-collection.md` — 원래 구현 계획. `handleSearch` 코드 블록에 `setSelectedJobIds([])` 누락으로 이 버그의 출처.
- `docs/superpowers/specs/2026-05-25-order-collection-design.md` — 주문수집 설계 스펙.
