---
title: disabled 쿼리는 isLoading이 false라 '찾을 수 없습니다'가 먼저 뜬다
date: 2026-08-03
category: ui-bugs
module: features/shoppingSetting, features/shoppingAccount, features/mallLinkedProduct
problem_type: ui-bug
component: frontend
severity: medium
applies_when:
  - TanStack Query의 `enabled` 옵션으로 쿼리를 게이팅할 때
  - 게이팅 조건이 세션·인증 정보처럼 비동기로 채워지는 값일 때
  - 단건 조회 화면에서 `isLoading`으로 로딩 분기를 만들고 그 뒤에 미존재 분기를 둘 때
symptoms:
  - 상세·수정 화면 URL로 새로고침하면 "찾을 수 없습니다"가 잠깐 떴다가 정상 화면으로 바뀐다
  - 로딩 스피너나 "불러오는 중..." 문구가 아예 보이지 않는다
  - 데이터는 결국 정상적으로 조회되는데 첫 화면만 잘못 나온다
tags:
  - tanstack-query
  - loading-state
  - session
  - hydration
  - enabled
---

# disabled 쿼리는 isLoading이 false라 '찾을 수 없습니다'가 먼저 뜬다

## Context

연동 데이터 수정 화면(`/shopping/linked-products/[id]`)을 만들면서, 이 코드베이스의 기존 상세 화면 패턴을 그대로 가져왔다.

```tsx
const { data: linked, isLoading } = useGetMallLinkedProduct(id);

if (isLoading) return <div>불러오는 중...</div>;
if (!linked) return <div>연동 데이터를 찾을 수 없습니다.</div>;
```

조회 훅은 소유자가 확정되기 전에 요청이 나가지 않도록 게이팅돼 있다.

```ts
return useQuery({
  queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY, id, workspaceOwnerId],
  queryFn: () => getMallLinkedProduct(id, workspaceOwnerId),
  enabled: !!workspaceOwnerId && !!id,
});
```

`workspaceOwnerIdAtom`은 `''`로 시작하고, `(authenticated)/layout.tsx`의 `useEffect`가 `useSession()` 결과를 받은 뒤에야 채운다. 즉 **첫 렌더 구간에서 쿼리는 disabled 상태**다.

문제는 그 구간에서 화면에 무엇이 뜨느냐다.

## Root Cause

TanStack Query v5에서 두 플래그의 정의가 다르다.

| 플래그 | 정의 | disabled 쿼리에서 |
|---|---|---|
| `isPending` | `status === 'pending'` | **`true`** |
| `isLoading` | `isPending && isFetching` | **`false`** |

disabled 쿼리는 `status: 'pending'`이면서 `fetchStatus: 'idle'`이다. 요청을 보내지 않으므로 `isFetching`이 `false`이고, 따라서 `isLoading`도 `false`다.

결과적으로 첫 렌더에서 `isLoading === false && data === undefined`가 성립해 **로딩 분기를 건너뛰고 미존재 분기로 떨어진다.** 사용자는 수정 화면 URL에서 새로고침할 때마다 "찾을 수 없습니다"를 먼저 보게 된다.

`isLoading`이라는 이름이 "로딩 중인가"로 읽히는 게 함정의 핵심이다. 실제 의미는 **"처음 불러오는 요청이 지금 날아가고 있는가"**이고, 요청이 아직 시작조차 안 된 상태는 여기에 포함되지 않는다.

## Solution

게이팅된 쿼리의 로딩 분기에는 `isLoading`이 아니라 `isPending`을 쓴다.

```tsx
// 이 쿼리는 세션에서 소유자 정보가 도착할 때까지 enabled로 게이팅된다.
// disabled 구간에서 isLoading은 false이므로(요청 자체가 안 나감) isPending을 써야
// "찾을 수 없습니다"가 잘못 노출되지 않는다.
const { data: linked, isPending } = useGetMallLinkedProduct(id);

if (isPending) return <div>불러오는 중...</div>;
if (!linked) return <div>연동 데이터를 찾을 수 없습니다.</div>;
```

**mutation의 `isPending`과 이름이 겹치면 쿼리 쪽에 별칭을 준다.** 반대로 하면 저장 버튼 비활성화 로직이 조용히 깨진다.

```tsx
const { data: setting, isPending: isSettingPending } = useGetShoppingSetting(id);
const { mutate: updateSetting, isPending } = useUpdateShoppingSetting(id); // 버튼용
```

## Why This Matters

- **타입 체커도 린트도 못 잡는다.** 두 플래그 모두 `boolean`이라 잘못 써도 컴파일된다.
- **개발 중에는 잘 안 보인다.** 세션이 캐시된 상태로 화면을 이동하면 소유자가 이미 채워져 있어 증상이 안 나타난다. URL 직접 진입이나 새로고침에서만 드러난다.
- **미존재 분기가 로딩보다 뒤에 있어도 소용없다.** 순서 문제가 아니라 조건 자체가 잘못된 것이다.

## Scope in This Codebase

2026-08-03 기준, "찾을 수 없습니다"류 미존재 분기를 가진 단건 화면은 정확히 셋이고 **셋 다 같은 결함을 갖고 있었다.**

- `src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx` (이때 신규 추가)
- `src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx`
- `src/features/shoppingAccount/ui/modify/ShoppingAccountModifyLayout.tsx`

셋 다 `isPending`으로 통일했다. 새 상세·수정 화면을 만들 때 위 패턴을 복사하면 자동으로 올바른 쪽을 쓰게 된다.

**목록 화면은 해당 없다.** 미존재 분기 대신 빈 테이블을 보여주므로 잘못된 정보가 노출되지 않는다.

## Related

- `docs/superpowers/specs/2026-08-03-mall-linked-product-edit-resend-design.md` — 이 결함이 발견된 라운드의 설계 문서
- `src/features/auth/store/auth.store.ts` — `workspaceOwnerIdAtom`이 비동기로 채워지는 지점
- `src/app/(authenticated)/layout.tsx` — 세션에서 소유자 정보를 주입하는 `useEffect`
