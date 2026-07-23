# 실 API 인증 가드 + Bulk 엔드포인트 ownerId Fail-Closed 통일 설계

- 작성일: 2026-07-15
- 상태: 승인 대기
- 선행 문서: `docs/superpowers/specs/2026-07-13-single-item-ownership-validation-design.md`
- 참고 메모리: `project_order_ownerid_gap`, `project_user_hierarchy_design`

## 배경 및 범위

설계 누수 점검(타입 중복/hook 중복/ownerId 격리/쇼핑몰 타입 일관성) 4갈래 조사 중, ownerId 테넌트 격리 재점검에서 두 가지 문제가 추가로 발견됐다.

**문제 1 — 실제 DB API의 인증 공백(치명적):** `account/users`(list/create/delete), `profile` 4개 라우트는 MSW가 아니라 실제 `route.ts` + drizzle DB를 직접 호출하는 코드인데, `middleware.ts`의 matcher가 `/api/*`를 전혀 포함하지 않아 인증 없이 호출 가능하다. 게다가 `ownerId`(users list/create)와 `email`(profile)을 클라이언트가 보낸 값 그대로 신뢰해 다른 테넌트 데이터를 조회/수정/삭제할 수 있는 IDOR이기도 하다.

**문제 2 — bulk(복수 id) 엔드포인트의 ownerId 불일치 처리 방식 불일치:** 지난 라운드(`2026-07-13-single-item-ownership-validation-design.md`)에서 단건 조회/수정은 전 도메인에 `isOwnerMatch` 검증을 붙였지만, **여러 id를 한 번에 받는 bulk 엔드포인트는 점검 대상에서 빠져 있었다.** 이번 전수 조사 결과 5곳이 발견됐고, 처리 방식이 제각각이었다:
- **검증 자체 없음(4곳):** `shopping/accounts/delete`, `shopping/accounts/status`, `shopping/settings/delete`, `shopping/settings/status` — ownerId를 아예 읽지 않음
- **필터링 후 조용히 진행(1곳):** `order/collection/trigger` — 소유한 job만 걸러서 실행하고 나머지는 조용히 무시

브레인스토밍 중 "소유하지 않은 id가 섞여 들어왔다는 것 자체가 이미 비정상 신호인데, 조용히 필터링하면 그 신호가 사라지고 부분 성공/실패 차이로 정보가 새어나갈 수 있다"는 논의를 거쳐, **모든 bulk 엔드포인트를 fail-closed(하나라도 불일치 시 전체 거부, 아무것도 처리하지 않음)로 통일**하기로 확정했다.

### 범위 내

| 영역 | 대상 | 방식 |
|---|---|---|
| 실 API 인증 가드 | `account/users` DELETE/list/create, `profile` PATCH | 세션 가드 + 클라이언트 identity 파라미터 제거 |
| Bulk ownerId 검증 신설 | `shopping/accounts/delete`, `shopping/accounts/status`, `shopping/settings/delete`, `shopping/settings/status` | fail-closed 신규 적용 |
| Bulk ownerId 정책 전환 | `order/collection/trigger` | 필터링 → fail-closed로 전환 |

### 범위 외

- **미들웨어 matcher에 `/api/*` 추가.** 라우트 핸들러 내부에서 세션을 직접 검증(`getToken`)하는 것만으로 인증 공백과 IDOR을 동시에 해결할 수 있어, 미들웨어의 페이지용 redirect·API용 401 JSON 분기 로직을 추가로 떠안을 실익이 없다고 판단했다(브레인스토밍 접근법 B 채택, 근거는 하단 "아키텍처" 참고).
- **타입 중복/hook·함수 중복 정리.** 같은 조사에서 함께 발견됐지만 이 스펙과는 별개 주제라 다음 라운드에서 별도로 다룬다.
- **`orders`/`products`의 `bulk` 생성 엔드포인트.** id 존재 여부를 검증하는 게 아니라 신규 데이터를 생성하며 서버가 ownerId를 주입하는 구조라 이번 "불일치 id 처리" 논의와 무관하다.

## 아키텍처

### 실 API 인증 가드

신규 공통 유틸 `src/shared/utils/apiAuth.ts`:

```ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { UserGrade } from '@/features/auth/types/Auth';

export type ApiSession = { id: string; ownerId: string; grade: UserGrade; email: string };

export async function requireSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return {
    id: token.id as string,
    ownerId: token.ownerId as string,
    grade: token.grade as UserGrade,
    email: token.email as string,
  };
}

export async function requireSuperAdminSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  if (session.grade !== 'super_admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  return session;
}
```

각 라우트 핸들러는 함수 맨 앞(기존 `try` 블록 전)에서 이 가드를 호출하고, `instanceof NextResponse`면 즉시 반환한다. 통과 후에는 클라이언트가 보낸 `ownerId`/`email` 대신 세션에서 파생한 값만 사용한다.

- `account/users` DELETE/list/create → `requireSuperAdminSession` (사용자 관리는 super_admin 전용)
- `profile` PATCH → `requireSession` (등급 무관, 본인만)

### Bulk ownerId 검증

`src/mocks/utils/verifyOwnership.ts`에 제네릭 헬퍼를 추가해 4개 shopping bulk 핸들러와 collection trigger가 공유한다:

```ts
export const isOwnerMatch = (resourceOwnerId: string, requestOwnerId: string | null): boolean =>
  !!requestOwnerId && resourceOwnerId === requestOwnerId;

export const allOwnedBy = <T extends { id: string; ownerId: string }>(
  ids: string[],
  requestOwnerId: string | null,
  data: T[],
): boolean =>
  ids.every((id) => {
    const item = data.find((d) => d.id === id);
    return !!item && isOwnerMatch(item.ownerId, requestOwnerId);
  });
```

## 섹션 1. 실 API 인증 가드 — `account/users`, `profile`

```ts
// src/app/api/account/users/route.ts (DELETE)
export async function DELETE(req: NextRequest) {
  const session = await requireSuperAdminSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { ids } = await req.json();
    const owned = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, ids), eq(users.ownerId, session.ownerId)));
    if (owned.length !== ids.length) {
      return NextResponse.json({ error: '삭제 권한이 없는 사용자가 포함되어 있습니다.' }, { status: 403 });
    }
    await db.delete(users).where(inArray(users.id, ids));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('사용자 삭제 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

```ts
// src/app/api/account/users/list/route.ts (POST)
export async function POST(req: NextRequest) {
  const session = await requireSuperAdminSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { filters, page, pageSize } = await req.json(); // ownerId는 더 이상 body에서 읽지 않음
    const conditions = [eq(users.ownerId, session.ownerId)];
    // ... 이하 기존 필터 조건 동일
  } catch (error) { /* 기존과 동일 */ }
}
```

```ts
// src/app/api/account/users/create/route.ts (POST)
export async function POST(req: NextRequest) {
  const session = await requireSuperAdminSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { email, password, name, phone, grade, status, avatar, bio } = await req.json(); // ownerId 제거
    // ...
    await db.insert(users).values({ id, ownerId: session.ownerId, /* ... */ });
  } catch (error) { /* 기존과 동일 */ }
}
```

```ts
// src/app/api/profile/route.ts (PATCH)
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { name, phone, company, bio } = await req.json(); // email 제거
    await db.update(users).set({ name, phone, ...(company !== undefined && { company }), ...(bio !== undefined && { bio }), updatedAt: now })
      .where(eq(users.id, session.id));
    const [updated] = await db.select({ /* 기존 동일 */ }).from(users).where(eq(users.id, session.id)).limit(1);
    if (!updated) return new NextResponse(null, { status: 404 });
    return NextResponse.json({ ...updated, avatar: updated.avatar ?? '' });
  } catch (error) { /* 기존과 동일 */ }
}
```

### 클라이언트 — identity 파라미터 제거

- `src/features/account/api/getUsers.ts`: 시그니처를 `(filters, page, pageSize?)`로 축소 (`ownerId` 제거)
- `src/features/account/api/useGetUsers.ts`: `getUsers(filters, currentPage)` 호출로 변경. `workspaceOwnerId`는 `queryKey`/`enabled` 용도로 계속 사용
- `src/features/account/api/createUser.ts`: 시그니처를 `(body: CreateUserBody)`로 축소 (`ownerId` 제거)
- `src/features/account/api/useCreateUser.ts`: `createUser(body)` 호출로 변경. `workspaceOwnerId`가 이 훅에서 더 이상 안 쓰이므로 atom import도 제거
- `src/features/profile/api/updateProfile.ts`: `UpdateProfileBody`에서 `email` 필드 제거
- `src/features/profile/ui/ProfileEditLayout.tsx:50`: `mutate({ email, ...data }, ...)` → `mutate(data, ...)`
- `src/features/account/api/deleteUsers.ts`, `useDeleteUsers.ts`: 원래도 identity 파라미터를 안 보내므로 변경 없음

## 섹션 2. Bulk ownerId 검증 신설 — ShoppingAccount / ShoppingSetting

4개 핸들러에 동일 패턴 적용 (계정 2개 + 설정 2개):

```ts
// src/mocks/handlers/shoppingAccounts.ts
http.post(`${baseUrl}/api/shopping/accounts/delete`, async ({ request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const { ids } = (await request.json()) as { ids: string[] };
  if (!allOwnedBy(ids, ownerId, MOCK_SHOPPING_ACCOUNTS_DATA)) {
    return new HttpResponse(null, { status: 403 });
  }
  deleteMockShoppingAccounts(ids);
  return HttpResponse.json({ success: true });
}),

http.patch(`${baseUrl}/api/shopping/accounts/status`, async ({ request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
  if (!allOwnedBy(ids, ownerId, MOCK_SHOPPING_ACCOUNTS_DATA)) {
    return new HttpResponse(null, { status: 403 });
  }
  updateMockShoppingAccountsStatus(ids, isActive);
  return HttpResponse.json({ success: true });
}),
```

`shoppingSettings.ts`의 `delete`/`status` 핸들러도 `MOCK_SHOPPING_SETTINGS_DATA`를 대상으로 동일 패턴.

### 클라이언트 — `ownerId`를 헤더로 추가

- `deleteShoppingAccounts.ts`, `updateShoppingAccountsStatus.ts`, `deleteShoppingSettings.ts`, `updateShoppingSettingsStatus.ts`: 두 번째 인자로 `ownerId: string`을 받아 `X-Owner-Id` 헤더에 실음 (기존 `:id` 단건 라우트와 동일 컨벤션)
- 대응하는 `useDeleteShoppingAccounts`, `useUpdateShoppingAccountsStatus`, `useDeleteShoppingSettings`, `useUpdateShoppingSettingsStatus`: `workspaceOwnerIdAtom`을 읽어 mutationFn에 전달

```ts
// src/features/shoppingAccount/api/deleteShoppingAccounts.ts
export const deleteShoppingAccounts = async (ids: string[], ownerId: string): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 삭제 실패');
};
```

```ts
// src/features/shoppingAccount/api/useDeleteShoppingAccounts.ts
export const useDeleteShoppingAccounts = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingAccounts(ids, workspaceOwnerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] }),
  });
};
```

나머지 3개(계정 status, 설정 delete/status)도 동일 패턴.

## 섹션 3. Bulk ownerId 정책 전환 — `order/collection/trigger`

기존 "필터링 후 진행"을 제거하고, 검증 함수를 분리해 "하나라도 불일치 시 전체 거부"로 바꾼다.

```ts
// src/mocks/utils/triggerOrderCollection.ts
export function triggerOrderCollectionMock(jobIds: string[]): number {
  // ownerId 필터링 제거 — 호출 전 이미 전량 소유 검증 완료된 jobIds만 들어옴
  const now = Date.now();
  let triggered = 0;
  jobIds.forEach((id) => {
    const job = MOCK_COLLECTION_JOBS.find((j) => j.id === id);
    if (job && job.status !== 'COLLECTING') {
      job.status = 'COLLECTING';
      job.totalCount = Math.floor(Math.random() * 400) + 100;
      job.collectedCount = 0;
      collectionProgressMap[id] = now;
      triggered++;
    }
  });
  return triggered;
}
```

```ts
// src/mocks/handlers/collection.ts
http.post(`${baseUrl}/api/order/collection/trigger`, async ({ request }) => {
  await delay(300);
  const ownerId = request.headers.get('X-Owner-Id');
  const { jobIds } = (await request.json()) as TriggerCollectionBody;
  if (!allOwnedBy(jobIds, ownerId, MOCK_COLLECTION_JOBS)) {
    return new HttpResponse(null, { status: 403 });
  }
  const triggeredCount = triggerOrderCollectionMock(jobIds);
  return HttpResponse.json({ success: true, triggeredCount });
}),
```

클라이언트(`triggerOrderCollection.ts`, `useTriggerOrderCollection.ts`)는 이미 `X-Owner-Id` 헤더를 보내고 있어 변경 없음.

## 에러 처리 규칙

- **401** — 세션 토큰 없음 (`requireSession`/`requireSuperAdminSession` 공통, 실 API 4곳)
- **403** — 세션은 있으나 `grade !== 'super_admin'` (실 API 3곳), 또는 bulk 대상 id 중 하나라도 `ownerId` 불일치 (실 API DELETE 1곳 + MSW bulk 5곳) — 어느 경우든 **아무것도 처리하지 않고 전체 거부**
- **500** — 기존 DB 에러 처리 그대로 (가드 통과 후 로직에서만 적용)
- **응답 바디 형식은 컨텍스트별 기존 컨벤션을 그대로 따른다** — 실 API(route.ts)는 `{ error: string }` JSON(기존 400/500 응답과 통일), MSW 핸들러는 `new HttpResponse(null, { status })`(단건 ownership 검증 라운드에서 확립된 null-body 컨벤션 그대로 확장). 두 형식이 다른 건 불일치가 아니라 각자 이미 있던 컨벤션을 유지한 것이다.
- 클라이언트는 이번 라운드에서 401/403을 구분한 특별 처리(자동 로그아웃 등)를 하지 않는다. 정상적인 UI 흐름에서는 이미 인가된 사용자만 이 액션에 도달하므로, 실제 401/403은 API를 직접 두드리는 시도에서만 발생한다.

## 검증 전략 (Vitest)

- **신규 `src/shared/utils/apiAuth.test.ts`**: `next-auth/jwt`의 `getToken`을 모킹. `requireSession`(토큰 없음→401, 있음→세션 반환), `requireSuperAdminSession`(토큰 없음→401, grade 불일치→403, super_admin→세션 반환)
- **신규 `src/mocks/utils/verifyOwnership.test.ts`에 `allOwnedBy` 케이스 추가**: 전부 소유, 일부만 소유, 존재하지 않는 id 포함, `requestOwnerId`가 `null`인 케이스
- **route.ts 핸들러 자체(DELETE/list/create/profile)와 MSW bulk 핸들러 자체는 기존 컨벤션대로 자동 테스트 없이 수동 확인**:
  - 세션 쿠키 없이 4개 실 API 직접 호출 → 401
  - 비 super_admin 세션으로 3개 사용자관리 API 호출 → 403
  - super_admin 세션으로 타 계정 소유 id 섞어 DELETE/bulk 호출 → 403, 아무것도 삭제/변경되지 않았는지 확인
  - 정상 케이스(전부 본인 소유 id) → 200, 정상 처리 확인
  - `order/collection/trigger`에 타 테넌트 jobId 섞어 호출 → 403, `triggeredCount` 응답 자체가 없어야 함(이전엔 0으로 조용히 성공했던 것과 차이)

## 검증/엣지케이스

- `useGetUsers`/`useCreateUser`에서 `workspaceOwnerId`를 서버로 안 보내게 되어도, `enabled: !!workspaceOwnerId` 가드와 `queryKey` 포함은 유지한다(계정 전환 시 캐시 오염 방지 목적으로 여전히 유효).
- `account/users/create`는 `grade` 값을 클라이언트가 그대로 보내는 기존 구조를 유지한다 — `CreateUserBody.grade: SubUserGrade` 타입 레벨 제약(`domain-design.md`)으로 `super_admin` 부여 자체가 불가능하므로 별도 서버 검증 추가는 범위 외.
- `order/collection/trigger`의 응답 계약이 변경된다: 기존엔 타 테넌트 job이 섞여도 200 + `triggeredCount`(일부만 반영)였는데, 이제 403으로 바뀐다. 이 엔드포인트를 호출하는 `CollectionTableSection.tsx` 등 UI에서 403 에러 발생 시 기존 `throw new Error('주문수집 실행 실패')` 처리로 사용자에게 실패가 노출되는지 확인한다(현재 UI 코드는 화면 안에서 이미 자기 소유 job만 선택 가능한 목록을 쓰므로, 정상 흐름에서 403이 발생할 일은 없어야 한다).

## 다음 작업 (범위 외)

- 타입 중복/불일치, hook·함수 중복 정리 — 이번 조사에서 함께 발견됐으나 별도 라운드로 진행.
- 미들웨어 `/api/*` 보호 추가 여부 — 라우트 핸들러 레벨 가드로 충분하다고 판단해 보류. 향후 신규 실 API가 늘어나 가드 누락 리스크가 커지면 재검토.
