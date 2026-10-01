---
title: 오래 걸리는 mutation의 "진행 중" 표시는 화면 상태가 아니라 mutation 캐시에서 읽는다
date: 2026-10-01
category: architecture-patterns
module: features/order/api/useRunOrderCollection, features/order/ui/collect
problem_type: architecture_pattern
component: frontend_state
severity: medium
applies_when:
  - 몇 초~수십 초 걸리는 mutation(수집·일괄 전송 등)의 진행 상태를 행 단위로 보여줄 때
  - 사용자가 그 사이 다른 화면으로 이동할 수 있을 때
  - 같은 대상으로 두 번 실행되면 결과가 두 배가 되는 작업일 때
symptoms:
  - 실행 중 다른 화면에 갔다 오면 "진행 중" 표시가 새로고침 전까지 남는다
  - 돌아온 화면의 버튼이 다시 켜져 서버에서 아직 도는 작업을 한 번 더 보낼 수 있다
  - 완료 알림이 뜨지 않는다
tags:
  - tanstack-query
  - useMutation
  - useMutationState
  - jotai
  - ui-state
---

# 오래 걸리는 mutation의 "진행 중" 표시는 mutation 캐시에서 읽는다

## Context

주문 수집(`/order/collect`)은 선택한 계정을 한 요청에서 차례로 수집해 최대 60초가 걸린다. 처음 구현은 이랬다.

```tsx
setCollectingAccountIds(ids);              // 전역 Jotai atom
run(body, {
  onSuccess: (r) => showAlert(...),        // mutate() 호출 단위 콜백
  onSettled: () => setCollectingAccountIds([]),
});
// 버튼: disabled={isPending}               // 이 컴포넌트 인스턴스의 useMutation
```

TanStack Query v5는 **`mutate()`에 넘긴 콜백을 컴포넌트가 언마운트되면 실행하지 않는다.** 수집 중 주문 목록으로 이동하면:

1. `onSettled`가 안 돌아 전역 atom이 비워지지 않는다 → 돌아오면 "수집중"이 영구히 남는다.
2. 돌아온 화면의 **새 `useMutation` 인스턴스는 `isPending`이 false** → 버튼이 켜져 같은 계정을 또 보낸다. 무작위 주문을 만드는 몰은 두 요청이 모두 이전 생성 시각을 읽어 주문이 두 배가 된다.
3. 결과 알림이 사라진다.

## Guidance

**진행 상태는 mutation 캐시에서 파생하고, 결과 처리는 훅 단위 콜백에 둔다.**

```ts
const KEY = ['runOrderCollection'];

export const useRunOrderCollection = () =>
  useMutation({
    mutationKey: KEY,
    mutationFn: runOrderCollection,
    onSuccess: ({ results }) => showAlert(buildCollectionResultAlert(results)), // 훅 단위 — 언마운트돼도 실행
    onSettled: () => queryClient.invalidateQueries(...),
  });

export const useCollectingAccountIds = () =>
  pendingCollectionAccountIds(
    useMutationState({
      filters: { mutationKey: KEY, status: 'pending' },
      select: (m) => m.state.variables as RunCollectionBody | undefined,
    }),
  );
```

- "수집중" 행과 버튼 잠금은 `useCollectingAccountIds()`가 정한다. 캐시는 화면 수명과 무관해서, 돌아와도 실제로 도는 요청이 그대로 보이고 끝나면 저절로 사라진다. 다른 인스턴스가 보낸 요청도 보이므로 중복 실행이 막힌다.
- 알림·선택 해제·무효화는 `useMutation` 옵션(훅 단위)에 둔다. `AlertProvider`가 최상위 레이아웃에 있어 다른 화면에서도 결과 알림이 뜬다.
- 변수에서 ID를 모으는 부분(`pendingCollectionAccountIds`)은 순수 함수로 떼어 테스트한다.

## Why

"진행 중"은 **서버에서 실제로 무엇이 돌고 있는가**의 사본이다. 화면 상태(atom·`useState`·인스턴스의 `isPending`)는 그 사본을 화면 수명에 묶어 두므로, 화면 수명이 요청보다 짧아지는 순간 사실과 갈라진다. mutation 캐시는 QueryClient에 있어 요청 수명과 같이 간다 — 사본을 하나 더 두지 않고 원본을 읽는 셈이다.

`mutate()` 호출 단위 콜백은 "이 화면이 살아 있을 때만 의미 있는 일"(예: 폼 초기화)에만 쓴다.

## 관련

- `src/features/order/api/useRunOrderCollection.ts`, `src/features/order/util/collectionPending.ts`
- `docs/superpowers/specs/2026-10-01-order-round3-collection-design.md` — 라운드 3 최종 리뷰에서 발견(로컬 문서)
