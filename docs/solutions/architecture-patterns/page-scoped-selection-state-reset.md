---
title: 목록 선택 상태는 페이지 스코프 — 페이지 이동·재검색 시 반드시 초기화
date: 2026-08-02
category: architecture-patterns
module: features/mallLinkedProduct
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - 페이징된 목록 테이블에 체크박스(행 선택)를 추가할 때
  - 선택된 id 배열을 Jotai atom 등 화면 밖 스토어에 보관할 때
  - 선택 결과로 일괄 액션(일괄 수정·삭제·재전송)을 붙일 예정일 때
symptoms:
  - 2페이지에서 선택한 행이 1페이지로 돌아가도 atom에 남아 있어 일괄 액션이 화면에 안 보이는 행까지 처리한다
  - 헤더 '전체선택' 체크박스가 현재 페이지 기준인데 선택 배열은 전 페이지 누적이라 서로 어긋난다
  - 검색 조건을 바꿔 결과 집합이 완전히 달라졌는데 이전 결과의 선택이 그대로 살아 있다
related_components:
  - tooling
tags:
  - jotai
  - table
  - pagination
  - selection
  - state-scope
  - mallLinkedProduct
---

# 목록 선택 상태는 페이지 스코프 — 페이지 이동·재검색 시 반드시 초기화

## Context

쇼핑몰 연동 상품 목록(`/shopping/linked-products`)은 조회 전용으로 만들어져 체크박스가 없었다. 다음 라운드의 "연동 데이터 수정·재전송"을 위해 행 선택 UI만 먼저 추가하면서, 선택된 id를 `selectedLinkedIdsAtom`(Jotai)에 보관하는 구조를 잡았다.

이 목록은 서버 페이징이다. 즉 `linkedProducts` prop에는 **현재 페이지의 행만** 들어온다. 그런데 선택 id 배열은 컴포넌트 밖(atom)에 있으므로 페이지를 옮겨도 살아남는다. 여기서 두 스코프가 어긋난다:

- 헤더 '전체선택' 체크박스와 각 행의 checked 상태 → **현재 페이지 기준**
- `selectedLinkedIdsAtom`의 실제 내용 → **누적, 전역 수명**

2페이지에서 3건을 고르고 1페이지로 돌아오면 화면에는 아무것도 선택돼 보이지 않지만 atom에는 3건이 남아 있다. 지금은 선택 UI뿐이라 증상이 눈에 안 띄지만, 여기에 일괄 액션 버튼이 붙는 순간 **사용자가 보지도 못한 행이 조용히 처리 대상에 포함된다.** 검색 조건을 바꿔 결과 집합 자체가 달라진 경우도 마찬가지다.

## Guidance

**선택 상태의 수명을 "현재 보이는 결과 집합"에 명시적으로 묶는다. 결과 집합이 바뀌는 모든 지점에서 선택을 비운다.**

이 화면에서 결과 집합이 바뀌는 지점은 두 곳뿐이다 — 페이지 이동과 검색 실행. 두 곳 모두 이미 상태를 쓰는 액션 핸들러가 있으므로, 거기에 초기화를 한 줄씩 붙였다.

```typescript
// MallLinkedProductLayout.tsx — 페이지 이동
const handleChangePage = (page: number) => {
  setCurrentPage(page);
  setSelectedLinkedIds([]);
};

// MallLinkedSearchInput.tsx — 검색 실행 (draft → committed 커밋 시점)
const handleSearch = () => {
  setCommittedFilter({ ...draftFilter, searchValue });
  setCurrentPage(1);
  setSelectedLinkedIds([]);
};
```

검토했다가 택하지 않은 대안: 테이블 안에서 `useEffect`로 보이는 id 집합이 바뀔 때마다 사라진 선택을 걸러내는 방식. 한 곳에서 두 경우를 모두 잡는다는 장점이 있지만, 렌더 결과에 반응해 상태를 되쓰는 흐름이라 추적이 어렵다. **초기화가 필요한 지점이 액션 핸들러로 이미 명확하게 존재한다면 그쪽에 두는 게 읽기 쉽다.** 초기화 지점이 세 곳 이상으로 늘어나면 그때 파생/effect 방식을 다시 검토한다.

## Why This Matters

- **선택 UI만 먼저 넣는 라운드에서는 이 버그가 증상을 내지 않는다.** 일괄 액션이 붙는 다음 라운드에 가서야 "왜 안 고른 게 처리됐지"로 터지고, 그때는 원인이 액션 코드가 아니라 몇 커밋 전의 선택 스토어에 있어 찾기 어렵다.
- 타입 체커·테스트가 잡아주지 않는다. atom은 그냥 `string[]`이고, 잔여 id가 남는 건 정상 동작처럼 보인다.
- 서버 페이징 목록에서 "체크박스 컴포넌트는 페이지 스코프, 선택 스토어는 전역 스코프"라는 **스코프 불일치는 구조적으로 항상 생긴다.** 체크박스를 추가할 때마다 이 점검이 필요하다.

## When to Apply

- 페이징된 목록에 체크박스를 새로 추가할 때, 선택 atom을 만드는 그 커밋에서 초기화 지점도 같이 넣는다. "일괄 액션 붙일 때 처리하자"로 미루지 않는다.
- 선택 상태를 "전 페이지에 걸쳐 유지"하는 게 진짜 요구사항이라면(예: 여러 페이지를 돌며 골라 담기), 그때는 헤더 '전체선택'의 의미와 선택 건수 표시를 함께 설계해야 한다 — 기본값은 페이지 스코프다.
- 초기화가 필요한 지점을 셀 때는 페이지 이동뿐 아니라 **검색·필터 커밋, 정렬 변경, 목록 새로고침**까지 포함해서 센다.

## Related

- `src/features/mallLinkedProduct/store/selection.store.ts` — `selectedLinkedIdsAtom`
- `src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx` — 페이지 이동 초기화
- `src/features/mallLinkedProduct/ui/components/filter/MallLinkedSearchInput.tsx` — 검색 실행 초기화
- `src/features/mallRegistration/ui/components/MallRegistrationTable.tsx` — 같은 체크박스 패턴의 선례
- `docs/solutions/architecture-patterns/screen-owned-table-header-constants.md` — 체크박스 컬럼 추가 시 `colSpan` 계산 주의
- `docs/superpowers/specs/2026-08-01-mall-linked-product-list-design.md` — 원래 조회 전용으로 설계돼 체크박스가 제외됐던 근거
