---
title: 검색 필터는 메뉴 범위로 유지·초기화한다 — unmount가 아니라 경로로 판정하고, 초기화 대상은 나열하지 않는다
date: 2026-10-04
category: architecture-patterns
module: products, mallRegistration, shoppingAccount, shoppingSetting, mallLinkedProduct, order, account
problem_type: architecture_pattern
component: state-management
severity: medium
applies_when:
  - 새 목록 화면에 검색 필터 store를 만들 때
  - 전역 Jotai store에 둔 화면 상태를 "화면을 떠나면 초기화"하고 싶을 때
  - 목록 → 상세 → 목록 이동에서는 상태를 남기고 다른 메뉴로 가면 지워야 할 때
  - 여러 atom을 한 번에 기본값으로 되돌리는 초기화 함수를 만들 때
symptoms:
  - 다른 메뉴에 다녀와도 검색 필터·페이지가 마지막 값으로 남아 있다(탭을 닫거나 새로고침해야 풀린다)
  - 상세에 다녀오면 목록은 검색어로 걸러져 있는데 검색어 칸은 비어 있다
  - 검색 버튼을 누르지 않은 필터 값이 돌아왔을 때 확정값으로 적용돼 있다
tags:
  - jotai
  - atomWithReset
  - state-scope
  - search-filter
  - next-app-router
  - usePathname
---

# 검색 필터는 메뉴 범위로 유지·초기화한다

## Context

목록 화면의 검색 필터는 각 화면 `store/*.store.ts`의 Jotai `atom()`이다. 앱 전체가 `<Provider>` 없는 기본 store 하나를 쓰고, App Router의 클라이언트 이동은 모듈을 다시 읽지 않으므로 이 store는 **탭이 살아 있는 동안 계속 남는다.** 화면이 사라질 때 atom을 되돌리는 코드가 어디에도 없어서, 2026-10-04까지 모든 목록 화면이 "다른 메뉴에 다녀와도 필터가 그대로"였다.

사용자가 고른 동작은 **같은 메뉴(목록 + 그 상세·등록) 안에서는 유지, 메뉴를 벗어나면 초기화**다. 메뉴는 사이드바 항목이다. 주문목록 → 주문상세 → 주문목록은 유지, 주문목록 → 상품목록 → 주문목록은 초기화.

함께 드러난 어긋남 두 가지:

- 상품목록·쇼핑몰상품등록은 확정 필터를 `useState(편집 중 atom 값)`으로 들었다. 편집 중 값(atom)은 남고 확정값(지역 state)은 사라지므로, 돌아오면 **검색 버튼을 누르지 않은 편집값이 확정값으로 다시 만들어졌다.** 2026-04-09 처음 만들 때부터의 구조였다(`committedFiltersAtom` 패턴은 한 달 뒤 주문목록에서 생겼다).
- 검색어 입력칸 6개는 `useState('')`로 시작했다. 확정 검색어가 남아 있어도 칸은 비어 보였다.

## Guidance

### 1. unmount가 아니라 경로로 판정한다

"화면을 떠나면 초기화"의 가장 쉬운 구현은 목록 레이아웃의 `useEffect(() => reset, [])`다. 그런데 **목록 → 상세 이동에서도 목록 레이아웃은 unmount된다.** unmount 기준으로는 "상세에 다녀오면 유지"를 만들 수 없다.

그래서 `(authenticated)` 레이아웃에 감시 컴포넌트(`src/components/layout/SearchFilterScopeReset.tsx`)를 하나 두고 `usePathname()`의 변화를 본다. 이전 경로는 범위 안이고 새 경로는 범위 밖인 store만 초기화한다.

```ts
// src/shared/constant/filterScope.constant.ts — 순수 함수라 테스트한다
export const getFilterScopesToReset = (prevPath: string, nextPath: string): FilterScopeId[] =>
  FILTER_SCOPE_IDS.filter((id) => isInFilterScope(id, prevPath) && !isInFilterScope(id, nextPath));
```

범위 정의에서 틀리기 쉬운 곳은 **같은 깊이에 있는 다른 사이드바 메뉴**다. `/order/[id]`를 "`/order/` 아래 한 단계"로만 정의하면 `/order/collect`(주문수집 메뉴)가 주문목록의 상세로 잡힌다. 상세 판정은 형제 메뉴 이름을 빼고 한다(`listWithDetail('/order/list', '/order', ['list', 'collect', 'create'])`). 접두어만 같은 경로(`/shopping/accounts-old`)도 범위에 들면 안 된다 — `startsWith(base)`가 아니라 `path === base || path.startsWith(base + '/')`.

### 2. 초기화 대상을 나열하지 않는다

초기화 함수를 `set(aAtom, 기본값); set(bAtom, 기본값); …`으로 쓰면, 나중에 필터 atom을 하나 추가하면서 이 목록에 넣는 것을 빠뜨렸을 때 **그 필터만 조용히 남는다.** 오류는 나지 않는다.

그래서 atom을 만드는 자리가 곧 등록이 되게 했다.

```ts
// src/shared/utils/filterGroup.ts
export const createFilterGroup = () => {
  const resets: ((set: Setter) => void)[] = [];
  return {
    atom: <T>(initialValue: T) => {
      const member = atomWithReset(initialValue);
      resets.push((set) => set(member, RESET));
      return member;
    },
    resetAtom: atom(null, (_get, set) => resets.forEach((reset) => reset(set))),
  };
};

// store
const filters = createFilterGroup();
export const resetFilterAtom = filters.resetAtom;
export const orderStatusAtom = filters.atom<string>('ALL');
```

`filters.atom`으로 만든 atom은 빠짐없이 초기화된다. 묶음에 넣지 않을 것(체크박스 선택·모달 상태)은 평소처럼 `atom()`으로 만들면 되므로, "무엇이 초기화되는가"가 선언 한 줄에서 보인다.

### 3. 범위와 store 연결은 컴파일러가 대조하게 한다

범위 표와 store를 잇는 곳은 `Record<FilterScopeId, …>`다. 범위 id를 추가하고 연결을 빠뜨리면 컴파일 오류가 난다.

```ts
const RESET_ATOMS: Record<FilterScopeId, WritableAtom<null, [], void>> = {
  products: resetProductFilterAtom,
  order: resetOrderFilterAtom,
  // …
};
```

남는 구멍은 하나다 — **범위에 등록하지 않은 새 목록 화면**은 아무 오류 없이 예전처럼 필터가 탭 수명 동안 남는다. 그래서 규칙 문서(`.claude/rules/ui-conventions.md` "메뉴 범위" 절)에 "새 목록 화면은 묶음 + 범위 등록 둘 다"를 적었다.

### 4. 유지하는 것은 화면에 보이는 것과 일치시킨다

유지를 택하면 "남은 값"과 "화면 표시"가 어긋나는 곳이 같이 드러난다.

- 확정값·페이지가 지역 state면 상세에 다녀올 때 사라진다 → store로 옮긴다.
- 검색어를 입력칸 지역 state로 드는 화면은 확정값으로 시작한다: `useState(useAtomValue(committedFiltersAtom).searchValue)`. 목록이 검색어로 걸러져 있는데 칸이 비어 보이면 사용자는 필터가 없다고 읽는다.

## Why This Matters

- 상태를 전역 store에 두는 순간 "언제 지우는가"는 따로 설계해야 하는 문제다. 지우는 코드가 없으면 **기본 동작은 "영원히 유지"**이고, 그것이 의도인지는 코드만 봐서는 알 수 없다.
- "화면을 떠나면"을 unmount로 옮기면 라우트 구조(상세가 별도 페이지인가)에 따라 의미가 달라진다. 사용자의 "메뉴" 개념은 라우트 트리가 아니라 사이드바에 있다.
- 나열식 초기화는 필터가 늘 때마다 한 군데를 더 기억해야 하는 구조다. 등록을 생성과 묶으면 기억할 것이 없어진다.

## When to Apply

- 새 목록 화면을 만들 때 — `createFilterGroup`으로 store를 만들고 `filterScope.constant.ts`·`SearchFilterScopeReset`에 등록한다.
- 목록 외의 화면 상태(마법사 단계, 임시 선택 등)를 메뉴 단위로 지워야 할 때도 같은 범위 판정을 쓸 수 있다.
- 반대로, 한 화면 안에서만 의미 있는 상태(상품목록 썸네일 표시처럼 "화면을 떠나면 해제"가 요구사항인 것)는 지역 state가 맞다 — 상세에 다녀와도 해제되는 것이 의도다.

## Related

- `[[scoped-jotai-provider-breaks-auth-atoms]]` — 스코프 `<Provider>`로 격리하면 auth atom까지 끊긴다. 이 문서의 방식은 store를 나누지 않고 같은 store 안에서 값을 되돌린다.
- `[[page-scoped-selection-state-reset]]` — 체크박스 선택은 페이지 이동·재검색 때 이미 비운다. 그래서 메뉴 범위 초기화 묶음에 넣지 않았다.
- `[[screen-owned-table-header-constants]]` — 검색 필터 store는 화면이 소유한다. 소유가 정해져 있어야 "어느 메뉴의 store를 지울지"가 정해진다.
- 설계 근거(로컬): `docs/superpowers/specs/2026-10-04-search-filter-menu-scope-design.md`
