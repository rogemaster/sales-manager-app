# 실 API 인증 가드 + Bulk ownerId Fail-Closed 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 DB를 호출하는 4개 API(`account/users` DELETE/list/create, `profile` PATCH)에 세션 기반 인증·권한 가드를 추가하고, 복수 id를 다루는 5개 MSW bulk 엔드포인트(`shopping/accounts` delete/status, `shopping/settings` delete/status, `order/collection/trigger`)의 ownerId 불일치 처리를 fail-closed로 통일한다.

**Architecture:** 공통 유틸 두 개를 신설한다 — 실 API용 `src/shared/utils/apiAuth.ts`(세션 파생), MSW용 `src/mocks/utils/verifyOwnership.ts`에 추가하는 `allOwnedBy`(bulk 소유권 일괄 검증). 각 라우트/핸들러는 이 유틸을 맨 앞에서 호출해 실패 시 즉시 반환하고, 통과 시 클라이언트가 보낸 identity 값(`ownerId`/`email`) 대신 유틸이 반환한 값으로 처리를 진행한다.

**Tech Stack:** Next.js 15 App Router, NextAuth(JWT strategy), drizzle-orm, MSW 2.x, TanStack Query, Jotai, Vitest.

## Global Constraints

- 스펙 원본: `docs/superpowers/specs/2026-07-15-bulk-ownerid-fail-closed-and-api-auth-guard-design.md`
- TypeScript strict mode 유지, `@/*` 경로 별칭 사용 (`src/*`)
- Prettier: `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`
- 에러 응답: 실 API(route.ts)는 `{ error: string }` JSON, MSW 핸들러는 `new HttpResponse(null, { status })` — 컨텍스트별 기존 컨벤션을 그대로 따른다 (섞어 쓰지 않는다)
- 401 = 세션 토큰 없음, 403 = 세션은 있으나 grade 불일치 또는 bulk id 중 하나라도 ownerId 불일치(fail-closed, 부분 처리 금지)
- `middleware.ts`는 이번 작업에서 손대지 않는다
- **git 커밋 금지**: 각 Task 완료 시 `git commit`을 실행하지 않는다. 모든 Task 구현이 끝난 뒤 사용자가 명시적으로 요청할 때만 Task 단위로 분리 커밋한다 (`CLAUDE.md` Git/PR 규칙, `feedback_sdd_commit_policy` 참고)
- MSW 핸들러에서 ownerId 검증 유틸을 직접 호출하는 것은 기존 컨벤션(`isOwnerMatch`를 핸들러에서 직접 호출)과 동일한 패턴이며 `msw-rules.md` 위반이 아니다

---

### Task 1: 실 API 세션 가드 유틸 (`apiAuth.ts`)

**Files:**
- Create: `src/shared/utils/apiAuth.ts`
- Test: `src/shared/utils/apiAuth.test.ts`

**Interfaces:**
- Produces: `ApiSession = { id: string; ownerId: string; grade: UserGrade; email: string }`, `requireSession(req: NextRequest): Promise<ApiSession | NextResponse>`, `requireSuperAdminSession(req: NextRequest): Promise<ApiSession | NextResponse>` — Task 3~6에서 소비

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/shared/utils/apiAuth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { getToken } = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken }));

import { requireSession, requireSuperAdminSession } from './apiAuth';

const makeReq = () => new NextRequest('http://localhost/api/test');

describe('requireSession', () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it('토큰이 없으면 401 응답을 반환한다', async () => {
    getToken.mockResolvedValue(null);
    const result = await requireSession(makeReq());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('토큰이 있으면 세션 정보를 반환한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
    const result = await requireSession(makeReq());
    expect(result).toEqual({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
  });

  it('ownerId가 null이면 자기 id로 대체한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_1', ownerId: null, grade: 'super_admin', email: 'a@a.com' });
    const result = await requireSession(makeReq());
    expect(result).toEqual({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
  });
});

describe('requireSuperAdminSession', () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it('토큰이 없으면 401 응답을 반환한다', async () => {
    getToken.mockResolvedValue(null);
    const result = await requireSuperAdminSession(makeReq());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('grade가 super_admin이 아니면 403 응답을 반환한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_2', ownerId: 'usr_1', grade: 'operator', email: 'b@a.com' });
    const result = await requireSuperAdminSession(makeReq());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('grade가 super_admin이면 세션 정보를 반환한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
    const result = await requireSuperAdminSession(makeReq());
    expect(result).toEqual({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/shared/utils/apiAuth.test.ts`
Expected: FAIL — `Cannot find module './apiAuth'`

- [ ] **Step 3: 최소 구현**

```ts
// src/shared/utils/apiAuth.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { UserGrade } from '@/features/auth/types/Auth';

export type ApiSession = {
  id: string;
  ownerId: string;
  grade: UserGrade;
  email: string;
};

export async function requireSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  return {
    id: token.id,
    ownerId: token.ownerId ?? token.id,
    grade: token.grade,
    email: token.email ?? '',
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/shared/utils/apiAuth.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음 — Global Constraints 참고)

Run: `git status`
Expected: `src/shared/utils/apiAuth.ts`, `src/shared/utils/apiAuth.test.ts`가 untracked로 표시됨

---

### Task 2: MSW bulk 소유권 검증 헬퍼 (`allOwnedBy`)

**Files:**
- Modify: `src/mocks/utils/verifyOwnership.ts`
- Modify: `src/mocks/utils/verifyOwnership.test.ts`

**Interfaces:**
- Produces: `allOwnedBy<T extends { id: string; ownerId: string }>(ids: string[], requestOwnerId: string | null, data: T[]): boolean` — Task 7~9에서 소비
- Consumes: 없음 (기존 `isOwnerMatch`는 그대로 유지, 이 함수 내부에서 재사용)

- [ ] **Step 1: 실패하는 테스트 작성 (기존 파일에 추가)**

```ts
// src/mocks/utils/verifyOwnership.test.ts (기존 describe('isOwnerMatch', ...) 아래에 추가)
import { describe, it, expect } from 'vitest';
import { isOwnerMatch, allOwnedBy } from './verifyOwnership';

describe('allOwnedBy', () => {
  const data = [
    { id: 'a1', ownerId: 'own_1' },
    { id: 'a2', ownerId: 'own_1' },
    { id: 'a3', ownerId: 'own_2' },
  ];

  it('모든 id가 requestOwnerId 소유면 true를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a2'], 'own_1', data)).toBe(true);
  });

  it('하나라도 다른 ownerId 소유면 false를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a3'], 'own_1', data)).toBe(false);
  });

  it('존재하지 않는 id가 포함되면 false를 반환한다', () => {
    expect(allOwnedBy(['a1', 'a99'], 'own_1', data)).toBe(false);
  });

  it('requestOwnerId가 null이면 false를 반환한다', () => {
    expect(allOwnedBy(['a1'], null, data)).toBe(false);
  });

  it('빈 ids 배열이면 true를 반환한다', () => {
    expect(allOwnedBy([], 'own_1', data)).toBe(true);
  });
});
```

주의: 기존 파일 최상단의 `import { describe, it, expect } from 'vitest';`와 `import { isOwnerMatch } from './verifyOwnership';`는 이미 있으므로, 새 import는 `isOwnerMatch` 옆에 `allOwnedBy`를 추가하는 형태로 합친다 (중복 import 금지).

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/mocks/utils/verifyOwnership.test.ts`
Expected: FAIL — `allOwnedBy is not exported`

- [ ] **Step 3: 최소 구현**

```ts
// src/mocks/utils/verifyOwnership.ts
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/mocks/utils/verifyOwnership.test.ts`
Expected: PASS (9 tests — 기존 4개 + 신규 5개)

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음)

Run: `git status`
Expected: `src/mocks/utils/verifyOwnership.ts`, `src/mocks/utils/verifyOwnership.test.ts`가 modified로 표시됨

---

### Task 3: `account/users` DELETE — 인증 가드 + ownerId fail-closed

**Files:**
- Modify: `src/app/api/account/users/route.ts`

**Interfaces:**
- Consumes: Task 1의 `requireSuperAdminSession(req): Promise<ApiSession | NextResponse>` (`ApiSession.ownerId: string`)

- [ ] **Step 1: 현재 동작 확인 (수정 전)**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 현재 코드 기준 에러 없음 (baseline 확인용)

- [ ] **Step 2: 가드 + ownerId 검증 적용**

```ts
// src/app/api/account/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requireSuperAdminSession } from '@/shared/utils/apiAuth';

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

- [ ] **Step 3: 타입체크로 검증**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (0 errors)

- [ ] **Step 4: 코드 리뷰 체크리스트로 확인** (이 라우트는 실 DB 호출이라 자동 테스트 대상 아님 — 프로젝트 컨벤션)

- [ ] `session instanceof NextResponse` 체크가 `try` 블록보다 먼저 실행되는가
- [ ] `ids` 중 하나라도 `session.ownerId` 소유가 아니면 `db.delete`가 전혀 호출되지 않는가 (fail-closed)
- [ ] 클라이언트(`src/features/account/api/deleteUsers.ts`)는 원래도 `ownerId`를 안 보내므로 변경 불필요함을 재확인

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음)

Run: `git status`
Expected: `src/app/api/account/users/route.ts`가 modified로 표시됨

---

### Task 4: `account/users/list` — 인증 가드 + 클라이언트 정리

**Files:**
- Modify: `src/app/api/account/users/list/route.ts`
- Modify: `src/features/account/api/getUsers.ts`
- Modify: `src/features/account/api/useGetUsers.ts`

**Interfaces:**
- Consumes: Task 1의 `requireSuperAdminSession`

- [ ] **Step 1: 서버 라우트에 가드 적용, body의 ownerId 제거**

```ts
// src/app/api/account/users/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, gte, lte, ilike, and, sql } from 'drizzle-orm';
import { requireSuperAdminSession } from '@/shared/utils/apiAuth';

export async function POST(req: NextRequest) {
  const session = await requireSuperAdminSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { filters, page, pageSize } = await req.json();
    const { dateType, startDate, endDate, grade, searchType, searchValue } = filters;

    const conditions = [eq(users.ownerId, session.ownerId)];

    if (dateType === 'createdAt') {
      conditions.push(gte(users.createdAt, startDate));
      conditions.push(lte(users.createdAt, endDate));
    } else {
      conditions.push(gte(users.updatedAt, startDate));
      conditions.push(lte(users.updatedAt, endDate));
    }

    if (grade !== 'ALL') {
      conditions.push(eq(users.grade, grade));
    }

    if (searchValue) {
      if (searchType === 'email') {
        conditions.push(ilike(users.email, `%${searchValue}%`));
      } else {
        conditions.push(ilike(users.name, `%${searchValue}%`));
      }
    }

    const where = and(...conditions);

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users).where(where);

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = rows.map(({ password: _, ...user }) => user);
    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({ users: result, total, page, pageSize, totalPages });
  } catch (error) {
    console.error('사용자 목록 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 클라이언트 함수에서 `ownerId` 파라미터 제거**

```ts
// src/features/account/api/getUsers.ts
import { GetUsersResponse, UserSearchType } from '../types/user.types';

export const getUsers = async (
  filters: UserSearchType,
  page: number,
  pageSize: number = 20,
): Promise<GetUsersResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });
  if (!response.ok) throw new Error('사용자 목록 조회 실패');
  return response.json();
};
```

- [ ] **Step 3: 훅에서 호출부 갱신 (`workspaceOwnerId`는 queryKey/enabled 용도로 유지)**

```ts
// src/features/account/api/useGetUsers.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/userSearch.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getUsers } from './getUsers';

export const USER_LIST_QUERY_KEY = 'userList';

export const useGetUsers = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [USER_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getUsers(filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
```

- [ ] **Step 4: 타입체크로 검증**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (0 errors) — `getUsers` 호출부가 이 두 파일뿐인지 아래 명령으로 재확인

Run: `grep -rn "getUsers(" src --include=*.ts --include=*.tsx`
Expected: `getUsers.ts`의 정의부와 `useGetUsers.ts`의 호출부 2곳만 출력됨

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음)

Run: `git status`
Expected: 위 3개 파일이 modified로 표시됨

---

### Task 5: `account/users/create` — 인증 가드 + 클라이언트 정리

**Files:**
- Modify: `src/app/api/account/users/create/route.ts`
- Modify: `src/features/account/api/createUser.ts`
- Modify: `src/features/account/api/useCreateUser.ts`

**Interfaces:**
- Consumes: Task 1의 `requireSuperAdminSession`

- [ ] **Step 1: 서버 라우트에 가드 적용, body의 ownerId 대신 세션값으로 스탬핑**

```ts
// src/app/api/account/users/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/db/password';
import { v4 as uuidv4 } from 'uuid';
import { requireSuperAdminSession } from '@/shared/utils/apiAuth';

export async function POST(req: NextRequest) {
  const session = await requireSuperAdminSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { email, password, name, phone, grade, status, avatar, bio } = await req.json();

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 400 });
    }

    const now = new Date().toISOString().split('T')[0];
    const id = `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

    await db.insert(users).values({
      id,
      ownerId: session.ownerId,
      status: status ?? 'active',
      email,
      password: await hashPassword(password),
      name: name ?? '',
      avatar: avatar ?? null,
      phone: phone ?? '',
      bio: bio ?? '',
      company: '',
      location: '',
      grade,
      createdAt: now,
      updatedAt: now,
    });

    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...user } = result[0];
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('사용자 등록 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 클라이언트 함수에서 `ownerId` 파라미터 제거**

```ts
// src/features/account/api/createUser.ts
import { AccountUser, CreateUserBody } from '../types/user.types';

export const createUser = async (body: CreateUserBody): Promise<AccountUser> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('사용자 등록에 실패했습니다.');
  return response.json();
};
```

- [ ] **Step 3: 훅에서 `workspaceOwnerId` 참조 제거 (더 이상 필요 없음)**

```ts
// src/features/account/api/useCreateUser.ts
import { useMutation } from '@tanstack/react-query';
import { CreateUserBody } from '../types/user.types';
import { createUser } from './createUser';

export const useCreateUser = () => {
  return useMutation({
    mutationFn: (body: CreateUserBody) => createUser(body),
  });
};
```

- [ ] **Step 4: 타입체크로 검증**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (0 errors)

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음)

Run: `git status`
Expected: 위 3개 파일이 modified로 표시됨

---

### Task 6: `profile` PATCH — 인증 가드 + 클라이언트 정리

**Files:**
- Modify: `src/app/api/profile/route.ts`
- Modify: `src/features/profile/api/updateProfile.ts`
- Modify: `src/features/profile/ui/ProfileEditLayout.tsx`

**Interfaces:**
- Consumes: Task 1의 `requireSession` (등급 무관, super_admin 제한 없음)

- [ ] **Step 1: 서버 라우트에 가드 적용, body의 email 대신 세션의 id로 대상 특정**

```ts
// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';

export async function PATCH(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { name, phone, company, bio } = await req.json();

    const now = new Date().toISOString().split('T')[0];

    await db
      .update(users)
      .set({
        name,
        phone,
        ...(company !== undefined && { company }),
        ...(bio !== undefined && { bio }),
        updatedAt: now,
      })
      .where(eq(users.id, session.id));

    const [updated] = await db
      .select({
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        phone: users.phone,
        bio: users.bio,
        company: users.company,
        location: users.location,
        grade: users.grade,
      })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1);

    if (!updated) return new NextResponse(null, { status: 404 });

    return NextResponse.json({ ...updated, avatar: updated.avatar ?? '' });
  } catch (error) {
    console.error('프로필 수정 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 클라이언트 타입/함수에서 `email` 필드 제거**

```ts
// src/features/profile/api/updateProfile.ts
import { User } from '@/features/auth/types/Auth';

export type UpdateProfileBody = {
  name: string;
  phone: string;
  company?: string;
  bio?: string;
};

export const updateProfile = async (body: UpdateProfileBody): Promise<User> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('프로필 저장에 실패했습니다.');
  return response.json();
};
```

- [ ] **Step 3: 호출부에서 `email` 제거**

```tsx
// src/features/profile/ui/ProfileEditLayout.tsx (48번째 줄 onSubmit 내부만 변경)
const onSubmit = (data: ProfileEditFormData) => {
  mutate(data, {
    onSuccess: (updated) => {
      setUserInfo({ ...userInfo, ...updated });
      showAlert({
        type: 'success',
        message: '저장되었습니다.',
        onConfirm: () => router.back(),
      });
    },
    onError: () => {
      showAlert({ type: 'error', message: '저장에 실패했습니다.' });
    },
  });
};
```

- [ ] **Step 4: 타입체크로 검증**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (0 errors) — `email` 제거로 `ProfileEditFormData`와 `UpdateProfileBody` 형태가 정확히 일치해야 타입 에러 없이 `mutate(data, ...)`가 통과함

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음)

Run: `git status`
Expected: 위 3개 파일이 modified로 표시됨

---

### Task 7: `shopping/accounts` delete/status — MSW fail-closed 적용

**Files:**
- Modify: `src/mocks/handlers/shoppingAccounts.ts`
- Modify: `src/features/shoppingAccount/api/deleteShoppingAccounts.ts`
- Modify: `src/features/shoppingAccount/api/useDeleteShoppingAccounts.ts`
- Modify: `src/features/shoppingAccount/api/updateShoppingAccountsStatus.ts`
- Modify: `src/features/shoppingAccount/api/useUpdateShoppingAccountsStatus.ts`

**Interfaces:**
- Consumes: Task 2의 `allOwnedBy`

- [ ] **Step 1: 핸들러에 fail-closed 검증 추가**

```ts
// src/mocks/handlers/shoppingAccounts.ts
// 1. 새 import 한 줄 추가: import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
// 2. 기존 import { isOwnerMatch } from '../utils/verifyOwnership'; 를 아래로 교체:
import { isOwnerMatch, allOwnedBy } from '../utils/verifyOwnership';
```

```ts
// 기존 delete/status 핸들러를 아래로 교체
http.post(`${baseUrl}/api/shopping/accounts/delete`, async ({ request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const { ids } = (await request.json()) as { ids: string[] };
  if (!allOwnedBy(ids, ownerId, MOCK_SHOPPING_ACCOUNTS_DATA)) {
    return new HttpResponse(null, { status: 403 });
  }
  deleteMockShoppingAccounts(ids);
  return HttpResponse.json({ success: true });
}),

// status 핸들러는 :id 핸들러보다 먼저 등록해야 경로 충돌 방지
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

- [ ] **Step 2: 클라이언트 함수에 `ownerId` 파라미터 추가 (`X-Owner-Id` 헤더)**

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
// src/features/shoppingAccount/api/updateShoppingAccountsStatus.ts
export const updateShoppingAccountsStatus = async (
  ids: string[],
  isActive: boolean,
  ownerId: string,
): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ ids, isActive }),
  });
  if (!response.ok) throw new Error('사용여부 변경 실패');
};
```

- [ ] **Step 3: 훅에서 `workspaceOwnerIdAtom`을 읽어 전달**

```ts
// src/features/shoppingAccount/api/useDeleteShoppingAccounts.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { deleteShoppingAccounts } from './deleteShoppingAccounts';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';

export const useDeleteShoppingAccounts = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingAccounts(ids, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
```

```ts
// src/features/shoppingAccount/api/useUpdateShoppingAccountsStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { updateShoppingAccountsStatus } from './updateShoppingAccountsStatus';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';

export const useUpdateShoppingAccountsStatus = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
      updateShoppingAccountsStatus(ids, isActive, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
```

- [ ] **Step 4: 타입체크로 검증**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (0 errors)

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음)

Run: `git status`
Expected: 위 5개 파일이 modified로 표시됨

---

### Task 8: `shopping/settings` delete/status — MSW fail-closed 적용

**Files:**
- Modify: `src/mocks/handlers/shoppingSettings.ts`
- Modify: `src/features/shoppingSetting/api/deleteShoppingSettings.ts`
- Modify: `src/features/shoppingSetting/api/useDeleteShoppingSettings.ts`
- Modify: `src/features/shoppingSetting/api/updateShoppingSettingsStatus.ts`
- Modify: `src/features/shoppingSetting/api/useUpdateShoppingSettingsStatus.ts`

**Interfaces:**
- Consumes: Task 2의 `allOwnedBy`

- [ ] **Step 1: 핸들러에 fail-closed 검증 추가**

```ts
// src/mocks/handlers/shoppingSettings.ts
// 1. 새 import 한 줄 추가: import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
// 2. 기존 import { isOwnerMatch } from '../utils/verifyOwnership'; 를 아래로 교체:
import { isOwnerMatch, allOwnedBy } from '../utils/verifyOwnership';
```

```ts
// 기존 status/delete 핸들러를 아래로 교체
http.patch(`${baseUrl}/api/shopping/settings/status`, async ({ request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
  if (!allOwnedBy(ids, ownerId, MOCK_SHOPPING_SETTINGS_DATA)) {
    return new HttpResponse(null, { status: 403 });
  }
  updateMockShoppingSettingsStatus(ids, isActive);
  return HttpResponse.json({ success: true });
}),

http.post(`${baseUrl}/api/shopping/settings/delete`, async ({ request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const { ids } = (await request.json()) as { ids: string[] };
  if (!allOwnedBy(ids, ownerId, MOCK_SHOPPING_SETTINGS_DATA)) {
    return new HttpResponse(null, { status: 403 });
  }
  deleteMockShoppingSettings(ids);
  return HttpResponse.json({ success: true });
}),
```

- [ ] **Step 2: 클라이언트 함수에 `ownerId` 파라미터 추가 (`X-Owner-Id` 헤더)**

```ts
// src/features/shoppingSetting/api/deleteShoppingSettings.ts
export const deleteShoppingSettings = async (ids: string[], ownerId: string): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 삭제 실패');
};
```

```ts
// src/features/shoppingSetting/api/updateShoppingSettingsStatus.ts
export const updateShoppingSettingsStatus = async (
  ids: string[],
  isActive: boolean,
  ownerId: string,
): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ ids, isActive }),
  });
  if (!response.ok) throw new Error('사용여부 변경 실패');
};
```

- [ ] **Step 3: 훅에서 `workspaceOwnerIdAtom`을 읽어 전달**

```ts
// src/features/shoppingSetting/api/useDeleteShoppingSettings.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { deleteShoppingSettings } from './deleteShoppingSettings';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';

export const useDeleteShoppingSettings = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingSettings(ids, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
```

```ts
// src/features/shoppingSetting/api/useUpdateShoppingSettingsStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { updateShoppingSettingsStatus } from './updateShoppingSettingsStatus';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';

export const useUpdateShoppingSettingsStatus = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
      updateShoppingSettingsStatus(ids, isActive, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
```

- [ ] **Step 4: 타입체크로 검증**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (0 errors)

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음)

Run: `git status`
Expected: 위 5개 파일이 modified로 표시됨

---

### Task 9: `order/collection/trigger` — 필터링 → fail-closed 전환

**Files:**
- Modify: `src/mocks/utils/triggerOrderCollection.ts`
- Modify: `src/mocks/handlers/collection.ts`

**Interfaces:**
- Consumes: Task 2의 `allOwnedBy`
- Produces: `triggerOrderCollectionMock(jobIds: string[]): number` — 시그니처 변경(`ownerId` 파라미터 제거, 사전 검증된 jobIds만 받음). 이 함수의 유일한 호출부는 `collection.ts` 핸들러이므로 다른 Task에 영향 없음

- [ ] **Step 1: 내부 유틸에서 ownerId 필터링 제거 (사전 검증 전제로 단순화)**

```ts
// src/mocks/utils/triggerOrderCollection.ts
import { MOCK_COLLECTION_JOBS } from '../data/MockCollectionJobsData';

// 수집 시작 시각 (ms) 저장 — 경과 시간으로 진행률 계산
const collectionProgressMap: Record<string, number> = {};

export function getCollectionProgressMap(): Record<string, number> {
  return collectionProgressMap;
}

export function triggerOrderCollectionMock(jobIds: string[]): number {
  const now = Date.now();
  let triggered = 0;

  jobIds.forEach((id) => {
    const job = MOCK_COLLECTION_JOBS.find((j) => j.id === id);
    if (job && job.status !== 'COLLECTING') {
      job.status = 'COLLECTING';
      job.totalCount = Math.floor(Math.random() * 400) + 100; // 100~500건
      job.collectedCount = 0;
      collectionProgressMap[id] = now;
      triggered++;
    }
  });

  return triggered;
}
```

- [ ] **Step 2: 핸들러에서 사전 검증 후 호출**

```ts
// src/mocks/handlers/collection.ts (상단 import에 추가)
import { MOCK_COLLECTION_JOBS } from '../data/MockCollectionJobsData';
import { allOwnedBy } from '../utils/verifyOwnership';
```

```ts
// 기존 trigger 핸들러를 아래로 교체
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

- [ ] **Step 3: 클라이언트 변경 불필요 확인**

Run: `grep -n "X-Owner-Id" src/features/order/api/triggerOrderCollection.ts`
Expected: 이미 헤더를 보내고 있어 매치됨 — 클라이언트 수정 없이 그대로 재사용

- [ ] **Step 4: 타입체크로 검증**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (0 errors) — `triggerOrderCollectionMock` 호출부가 `collection.ts` 한 곳뿐인지 아래로 재확인

Run: `grep -rn "triggerOrderCollectionMock(" src`
Expected: `triggerOrderCollection.ts`의 정의부와 `collection.ts`의 호출부 2곳만 출력됨

- [ ] **Step 5: 변경사항 확인** (git commit은 하지 않음)

Run: `git status`
Expected: 위 2개 파일이 modified로 표시됨

---

## 전체 완료 후

- [ ] 전체 테스트 스위트 실행: `npm run test` → 전부 PASS 확인
- [ ] 전체 타입체크: `npx tsc --noEmit -p tsconfig.json` → 0 errors 확인
- [ ] 린트: `npm run lint` → 에러 없음 확인
- [ ] `npm run dev`로 개발 서버 실행 후 브라우저에서 수동 확인 (스펙의 "검증/엣지케이스" 참고): 사용자 등록/삭제/목록, 프로필 수정, 쇼핑몰 계정·설정 삭제/상태변경, 주문수집 트리거가 정상 동작하는지
- [ ] 사용자에게 Task 단위 분리 커밋 진행 여부 확인 (git 작업은 사용자 명시적 요청 시에만)
