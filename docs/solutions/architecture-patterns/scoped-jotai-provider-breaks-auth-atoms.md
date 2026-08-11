---
title: 스코프 Jotai Provider는 auth atom을 끊는다 — ExcelProvider 패턴을 화면 격리에 쓰면 안 되는 이유
date: 2026-08-06
category: architecture-patterns
module: mallRegistration, products, auth
problem_type: architecture_pattern
component: state-management
severity: high
applies_when:
  - 두 화면이 같은 Jotai atom을 공유해 상태가 넘어가는 문제를 격리하려 할 때
  - ExcelProvider(기능 스코프 Jotai Provider) 패턴을 다른 화면에 적용하려 할 때
  - 화면 트리에 `<Provider>`를 감싸 전역 오염을 막으려 할 때
symptoms:
  - Provider로 감싼 화면에서 목록이 영원히 로딩되거나 빈 상태로 남는다
  - React Query가 `enabled: !!workspaceOwnerId` 게이팅에 걸려 fetch 자체를 시도하지 않는다
  - 네트워크 탭에 요청이 아예 찍히지 않는다 (에러도 없다)
  - 같은 훅이 다른 화면에서는 정상 동작한다
tags:
  - jotai
  - provider
  - state-scope
  - nextauth
  - react-query
---

# 스코프 Jotai Provider는 auth atom을 끊는다

## Context

상품목록(`/products/list`)과 쇼핑몰상품등록(`/shopping/register`)은 서로 다른 화면인데 **같은 검색 필터 atom**(`features/products/store/search.store.ts`)을 본다. 등록 화면이 상품 목록을 보여주려고 `ProductSearchFilterSection`을 그대로 재사용하기 때문이다.

컴포넌트 재사용 자체는 옳다. 문제는 atom이 전역 store에 있어서 **상품목록에서 필터를 걸고 등록 화면으로 이동하면 필터가 따라온다**는 것이다. 두 화면은 별개이고 데이터를 공유하지 않으므로 이건 버그다.

이 프로젝트에는 이미 해결책처럼 보이는 선례가 있다 — `ExcelProvider`(`src/components/providers/ExcelProvider.tsx`)다. `.claude/rules/excel.md`에 "전역 오염 없이 필요한 화면 트리에서만 상태를 유지"하는 **기능 스코프 Provider**로 문서화돼 있고, `products/bulk`에서 잘 동작한다.

```tsx
// ExcelProvider — 하위 트리에 새 Jotai store를 만든다
export const ExcelProvider = ({ children }: JotaiProviderProps) => {
  return <JotaiProvider>{children}</JotaiProvider>;
};
```

그대로 따라 하면 될 것 같다. **하지만 이 화면에서는 쓸 수 없다.**

## Root Cause

`<Provider>`는 하위 트리 전체에 **새 store**를 만든다. 격리하려던 atom만 격리되는 게 아니라, **그 트리에서 읽는 모든 atom이 새 store의 초기값으로 리셋된다.**

이 앱의 인증 정보는 전역 store에 주입된다:

```tsx
// src/app/(authenticated)/layout.tsx
const setUserInfo = useSetAtom(setUserInfoAtom);   // ← 전역 store에 기록
```

```ts
// src/features/auth/store/auth.store.ts
export const ownerIdAtom = atom<string>('');                              // 초기값 ''
export const workspaceOwnerIdAtom = atom<string>((get) => get(ownerIdAtom));
```

등록 화면을 `<Provider>`로 감싸면 그 트리의 `ownerIdAtom`은 **layout이 기록한 값을 못 보는 별도 인스턴스**가 된다. 값은 초기값 `''`에 머문다. 그리고 모든 목록 훅은 이 값으로 게이팅한다:

```ts
enabled: !!workspaceOwnerId,   // '' → false → 쿼리가 영구히 비활성화
```

**결과: 화면이 통째로 안 뜬다.** 에러도 안 난다. 요청 자체를 시도하지 않으므로 네트워크 탭도 비어 있다. 원인을 찾기 어려운 형태로 실패한다.

`products/bulk`에서 `ExcelProvider`가 멀쩡한 이유는 **그 트리가 auth atom을 읽지 않기** 때문이다. 엑셀 상태는 자기 완결적이다. 패턴이 옳았던 게 아니라 **조건이 맞았을 뿐**이다.

## Guidance

**스코프 Provider를 쓰기 전에 "이 트리가 전역 store에서 주입받는 atom을 읽는가"를 먼저 확인한다.**

이 앱에서 그 답은 사실상 항상 "예"다. `(authenticated)` 아래 화면은 대부분 `workspaceOwnerIdAtom`으로 테넌트 격리를 하기 때문이다. 즉 **스코프 Provider는 auth를 읽지 않는 자기 완결적 기능 상태(Excel 업로드 같은)에만 쓸 수 있다.**

화면 간 상태 격리가 필요한데 Provider를 못 쓴다면 대안은 이렇다:

| 방법 | 언제 |
|------|------|
| 경계에서 리셋 (mount/unmount 시 초기화) | 두 화면이 **동시에 열릴 수 없을 때**. 가장 싸다 |
| 화면별 atom 분리 + 필터 컴포넌트 파라미터화 | 컴포넌트 재사용을 유지하면서 상태만 갈라야 할 때 |
| `jotai-scope` 등으로 **특정 atom만** 스코프 | 위 둘로 안 될 때. 의존성 추가 필요 |

경계 리셋을 택할 경우 **첫 렌더 타이밍에 주의한다.** `useEffect`의 리셋은 첫 렌더 **이후**에 실행되므로, 화면이 `useState(currentFilter)`처럼 atom 값을 초기값으로 읽고 있으면 **이미 상속된 필터로 첫 조회가 나간다.** 이런 화면은 초기값도 기본값 상수에서 시작해야 한다.

## Why This Matters

- **성공 사례만 문서화하면 그 패턴이 만능처럼 읽힌다.** `.claude/rules/excel.md`는 `ExcelProvider`를 권장 패턴으로 소개하면서 "향후 적용 예정: `order/create`"까지 적어 뒀지만, **언제 쓰면 안 되는지**가 없었다. 규칙을 그대로 따랐다가 화면이 죽는 경로가 열려 있었다.
- 실패 방식이 나쁘다. 예외도 콘솔 에러도 없고, 요청이 안 나가는 것만 보인다. `enabled` 게이팅이 원인인 걸 모르면 API·MSW·네트워크를 먼저 의심하게 된다.
- 같은 함정이 `workspaceOwnerIdAtom`뿐 아니라 **전역에 주입되는 모든 atom**(`emailAtom`, `gradeAtom` 등)에 적용된다. 권한 분기가 있는 화면이면 등급이 기본값 `'operator'`로 떨어져 조용히 UI가 달라진다.

## When to Apply

- 새 화면에 `<Provider>`를 감싸려 할 때 — 그 트리에서 `workspaceOwnerIdAtom`·`emailAtom`·`gradeAtom`을 읽는 컴포넌트가 있는지 먼저 grep
- `.claude/rules/excel.md`의 기능 스코프 Provider 항목을 근거로 삼을 때 — 자기 완결적 상태에 한정된 패턴임을 기억
- 화면 간 필터/상태가 넘어가는 문제를 만났을 때 — 위 대안 표에서 고른다

## 후속 (2026-08-11 해결)

**필터 전이는 상태 격리가 아니라 소유권 분리로 해결됐다.** 쇼핑몰상품등록 화면이 자기 store(`mallRegistration/store/search.store.ts`)와 자기 필터 컴포넌트(`mallRegistration/ui/components/searchFilter/`)를 갖도록 바꿨고, products의 store·UI를 참조하던 import 2줄이 사라지면서 필터가 넘어올 경로 자체가 없어졌다.

즉 이 문제는 **격리 기법을 고를 문제가 아니었다.** 애초에 `/products/list`의 검색 필터 컴포넌트를 `/shopping/register`가 가져다 쓴 것이 잘못이었고, 전역 atom 공유는 그 결과로 따라온 증상이었다. 위 "대안 표"의 세 방법은 전부 증상 쪽을 다루는 것이라, 원인을 그대로 두고 골랐다면 어느 쪽을 택했든 구조는 잘못된 채로 남았다.

**이 문서의 Root Cause 절은 여전히 유효하다** — 스코프 Provider가 auth atom을 끊는다는 사실 자체는 이 화면과 무관하게 성립하므로, 새 화면에 `<Provider>`를 감쌀 때 그대로 적용된다.

- **교훈:** 두 화면이 상태를 공유해서 문제라면, 격리 방법을 찾기 전에 **왜 공유하고 있는지**를 먼저 본다. 컴포넌트를 남의 도메인에서 가져왔다면 그게 원인이다. 같은 프로젝트의 `[[screen-owned-table-header-constants]]`가 테이블 헤더 상수에서 이미 같은 결론에 도달해 있었다.

## Related

- `.claude/rules/excel.md` — `ExcelProvider` 기능 스코프 Provider 패턴 (성공 사례, 자기 완결적 상태 한정)
- `.claude/rules/domain-design.md` — `workspaceOwnerIdAtom` 기반 테넌트 격리
- `[[auth-db-msw-boundary]]` — 인증 정보가 DB/세션에서 오는 구조
