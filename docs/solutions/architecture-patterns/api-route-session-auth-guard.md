---
title: 실 DB route.ts는 middleware 보호 밖 — 라우트 핸들러 자체에 세션 가드 필수
date: 2026-07-16
category: architecture-patterns
module: account, profile, auth
problem_type: architecture_pattern
component: authentication, authorization
severity: critical
applies_when:
  - auth-db-msw-boundary.md 기준으로 새 route.ts(실 DB 호출)를 추가할 때
  - route.ts가 인증됐다고 가정하고 body의 id/ownerId/email을 그대로 신뢰하려 할 때
  - 기존 route.ts에 새 필드 검증을 추가할 때
symptoms:
  - 로그인 세션 쿠키 없이 curl/Postman으로 API를 직접 호출해도 200이 온다
  - body에 다른 계정의 id/ownerId/email을 넣으면 그 계정의 데이터를 조회·수정·삭제할 수 있다
  - 브라우저로 페이지 접근 시엔 로그인 리다이렉트가 걸리는데 API를 직접 두드리면 안 걸린다
tags:
  - nextauth
  - middleware
  - route-handler
  - idor
  - authentication
  - authorization
  - security
---

# 실 DB route.ts는 middleware 보호 밖 — 라우트 핸들러 자체에 세션 가드 필수

## Context

`auth-db-msw-boundary.md`가 정의한 대로 `account/users`(DELETE/list/create)와 `profile`(PATCH)은 이 프로젝트에서 MSW가 아니라 실제 Postgres DB를 drizzle-orm으로 직접 호출하는 예외 라우트다. 설계 누수 점검(타입 중복/hook 중복/ownerId 격리/쇼핑몰 타입 일관성 4갈래 조사) 중 ownerId 재점검 항목에서, 이 4개 라우트가 **인증 자체가 전혀 없다**는 게 드러났다.

원인은 두 가지가 겹쳐 있었다:

1. `src/middleware.ts`의 `matcher`가 `/home/:path*`, `/account/:path*` 같은 **페이지 경로만** 나열하고 `/api/:path*`는 아예 포함하지 않는다. Next.js middleware는 matcher에 매칭되는 경로에서만 실행되므로, `/api/account/users`, `/api/profile` 같은 API 경로는 middleware를 거치지 않고 route handler로 직행한다.
2. route handler 내부에도 `getServerSession`/`getToken` 같은 인증 검증 코드가 전혀 없었고, `ownerId`(list/create)나 `email`(profile)을 body에서 그대로 읽어 그 값으로 DB를 조회·수정·삭제했다.

결과적으로 로그인 세션 없이(비로그인 상태로) 이 4개 API를 직접 호출해도 그대로 실행됐고, 로그인은 했지만 body에 다른 계정의 식별자를 넣으면 타 테넌트 데이터를 건드릴 수 있는 IDOR이었다. "페이지는 로그인 안 하면 리다이렉트되니 안전하다"는 인상과 실제 API 보안 상태가 완전히 어긋나 있었다.

## Guidance

### middleware matcher 확장이 아니라 라우트 핸들러 가드를 선택한 이유

두 가지 접근을 비교했다:

| 접근 | 문제 |
|---|---|
| A. `middleware.ts` matcher에 `/api/:path*` 추가 | 현재 미들웨어는 미인증 시 `/login`으로 **redirect**하는데, API는 401 JSON을 줘야 함 → 페이지/API 분기 로직이 추가로 필요. 게다가 "로그인했는지"만 확인할 뿐 ownerId 기반 IDOR은 여전히 라우트가 따로 막아야 해서, 이것만으로는 절반만 해결됨 |
| B. 라우트 핸들러에서 직접 세션 파생(**선택**) | `getToken()`으로 세션을 읽어 인증 여부와 ownerId/grade를 한 번에 확보. 미들웨어의 redirect/JSON 분기 문제를 피하면서 IDOR까지 같은 지점에서 해결 |

B를 택한 핵심 이유: **A는 B 없이는 IDOR을 못 막고, B는 A 없이도 인증+IDOR을 완전히 해결한다.** 그러면 A를 추가로 유지보수할 이유가 없다.

### 공통 유틸: `src/shared/utils/apiAuth.ts`

```typescript
export type ApiSession = { id: string; ownerId: string; grade: UserGrade; email: string };

/** DB 행으로 세션을 만든다. 삭제·비활성·알 수 없는 등급이면 null. */
export function resolveApiSession(user: SessionUserRow | null): ApiSession | null {
  if (!user || user.status !== 'active' || !USER_GRADES.includes(user.grade)) return null;
  return {
    id: user.id,
    ownerId: user.ownerId ?? user.id,
    grade: user.grade as UserGrade,
    email: user.email,
  };
}

export async function requireSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  let user: SessionUserRow | null;
  try {
    user = await loadSessionUser(token.id);
  } catch (error) {
    // 401로 답하면 브라우저가 로그아웃시킨다. 일시적 DB 장애로 전원이 쫓겨나지 않게 500으로 구분한다.
    console.error('세션 사용자 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }

  const session = resolveApiSession(user);
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return session;
}

// 등급 판정은 정책표(src/shared/utils/permission.ts)를 읽는다. UI의 usePermission과 같은 표다.
export async function requirePermission(req: NextRequest, permission: Permission): Promise<ApiSession | NextResponse> {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  if (!can(session.grade, permission)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  return session;
}
```

`requireSession`은 토큰에서 바로 세션을 만들지 않는다. 토큰의 `id`로 `loadSessionUser`(`src/shared/utils/sessionUser.ts`)가 DB 행을 다시 읽고, `resolveApiSession`이 그 행으로 세션을 판정한다 — **등급(`grade`)과 워크스페이스(`ownerId`)는 토큰이 아니라 DB 값**이다. 토큰은 로그인 시점 사본이라 최대 30일(세션 만료 주기) 낡을 수 있고, 그 사이 등급이 바뀌거나 계정이 삭제·비활성화돼도 토큰만으로는 알 수 없기 때문이다(세션 재검증, 스펙 D3). 401을 돌려주는 경우는 토큰이 없을 때, DB에 사용자가 없을 때, `status`가 `active`가 아닐 때, 또는 `grade`가 알 수 없는 값(`USER_GRADES`에 없음)일 때다. DB 조회 자체가 실패(예: 일시적 장애)하면 401이 아니라 **500**이다 — 401은 브라우저를 로그아웃시키므로, 일시적 DB 장애로 전원이 쫓겨나면 안 된다.

`src/types/next-auth.d.ts`가 이미 `JWT`에 `id`를 타입 확장해두고 있어서 캐스팅 없이 바로 쓸 수 있다.

### 토큰의 역할 — 신원 증명은 토큰, 유효성·권한은 DB

매 요청 DB를 다시 읽으므로 JWT의 무상태성(클레임을 DB 없이 믿는 것)은 API에서 포기한 상태다. 토큰에 남은 역할은 셋이다.

- **신원 증명** — 서명된 `token.id`가 "이 요청자가 누구인가"를 보장한다. DB 조회는 "그 id가 아직 유효한가"를 확인할 뿐이다.
- **페이지 이동 확인** — `middleware.ts`는 DB 없이 토큰만 본다(페이지 이동마다 DB 조회를 늘리지 않기로 함, 스펙 D5).
- **화면 표시** — `useSession`이 주는 이름·등급·아바타.

**토큰의 `grade`·`ownerId`는 화면용 사본이다.** 서버 코드에서 권한·워크스페이스 판정에 토큰 값을 읽지 않는다 — 반드시 `requireSession`이 돌려준 DB 값을 쓴다. 토큰 값을 다시 믿으면 삭제·강등이 최대 30일 늦게 반영되는 원래 문제로 돌아간다.

**세션 방식 선택 (2026-09-24).** 지금 구조는 "서명된 세션 id로서의 JWT + 매 요청 DB 확인"의 혼합형이다. 검토한 선택지:

| 방식 | 판단 |
|------|------|
| **A. 현재 구조** (채택) | 삭제·비활성 계정 즉시 차단을 완전히 충족한다. 비용은 API 1회당 기본키 조회 1번 |
| B. NextAuth DB 세션(`strategy: 'database'` + `sessions` 테이블) | 실운영 B2B라면 정석에 가깝다. 다만 NextAuth v4의 Credentials 공급자는 DB 세션을 공식 지원하지 않아 세션 생성을 직접 구현하거나 라이브러리를 바꿔야 한다 |
| C. 짧은 JWT + 주기적 재검증(`jwt` 콜백) | 조회는 줄지만 재검증 주기만큼 삭제된 계정이 통과한다 — 풀려던 문제를 줄일 뿐 없애지 못한다 |

A와 B는 "매 요청 서버가 상태를 확인한다"는 점에서 같고, 확인 대상이 `users` 행이냐 `sessions` 행이냐만 다르다. A에서 포기한 것은 **캐시**(실운영이면 Redis 등으로 조회 비용을 줄였을 것 — 포트폴리오 규모라 생략)와 **세션 단위 관리**다.

**B로 전환할 조건:**
- 기기별 로그아웃(특정 세션만 끊기)이 필요해질 때
- 비밀번호 변경 시 다른 기기의 세션을 전부 무효화해야 할 때
- 인증 라이브러리를 교체(예: Auth.js v5)하는 라운드가 생길 때 — Credentials 제약을 함께 풀 수 있다

### 사용 패턴

각 라우트 핸들러 맨 앞, **`try` 블록보다 먼저** 가드를 호출한다.

```typescript
export async function DELETE(req: NextRequest) {
  const session = await requirePermission(req, 'user.delete');
  if (session instanceof NextResponse) return session; // 401/403 즉시 반환

  try {
    // 이후 로직은 클라이언트가 보낸 ownerId/email이 아니라 session.ownerId/session.id 사용
  } catch (error) { /* 기존 500 처리 */ }
}
```

- 등급 제한이 필요한 쓰기(정책표 `PERMISSIONS`에 키가 있는 동작)는 `requirePermission(req, '<permission>')` — 2026-09-23 `requireSuperAdminSession`을 대체했다. 정책을 route에 하드코딩하지 않고 표를 읽어야 UI와 어긋나지 않는다
- 본인 프로필 수정처럼 등급 무관하게 허용해야 하면 `requireSession`
- 인증 실패(401)와 서버 에러(500)는 별개 관심사이므로 가드를 `try` 블록 **밖**에 둔다

### 클라이언트가 보낸 식별자는 절대 신뢰하지 않는다

가드를 통과한 뒤에도 body의 `ownerId`/`email` 같은 식별자 필드는 무시하고 `session.ownerId`/`session.id`로 대체한다. 인증만 걸고 body의 identity 값은 그대로 신뢰하면 로그인은 했지만 타 테넌트 데이터를 건드리는 IDOR이 그대로 남는다.

## Why This Matters

- middleware matcher에 페이지 경로만 등록하는 관행이, "미들웨어가 인증을 담당한다"는 잘못된 안전감을 만든다. 실제로는 라우트별로 확인해야 한다.
- `auth-db-msw-boundary.md`의 판단 기준("유저 인증·식별에 직접 연관되면 DB")대로 새 route.ts를 추가할 때마다, 그 라우트가 middleware 보호 밖이라는 사실과 이 가드 패턴을 함께 적용하지 않으면 같은 구멍이 반복된다.
- 클라이언트 타입 제약(`CreateUserBody.grade: SubUserGrade` 등)은 컴파일 타임에만 유효하다 — 원시 HTTP 요청은 타입을 우회할 수 있으므로 권한이 중요한 필드는 서버에서도 별도로 검증해야 한다(예: `account/users/create`가 body의 `grade === 'super_admin'`을 명시적으로 거부). 서브유저 등급 제한은 `createUserSchema`(`src/features/account/util/userCreateSchema.ts`)의 `z.enum(['admin', 'operator'])`가 한다 — 폼과 route가 이 스키마 하나를 공유한다.
- 권한 테스트(`src/app/api/routePermissions.test.ts`)는 `@/shared/utils/sessionUser`만 모킹하고 `@/db`는 접근 시 즉시 throw하는 Proxy로 막아 둔다. 그래야 "권한이 부족한 등급이면 업무 데이터(DB)에 닿기 전에 403/401"이라는 계약을 실제로 검증하게 된다 — `requireSession`/`requirePermission` 내부 구현이 바뀌어도 이 모킹 경계(세션 재검증 조회 vs 업무 데이터 접근)만 지키면 테스트가 계속 유효하다.
- 이 가드가 되돌리는 401을 클라이언트 api 함수가 `throwIfUnauthorized`(`src/shared/utils/unauthorized.ts`)로 `UnauthorizedError`로 바꾸고 나면, 그 오류를 잡는 모든 catch 블록은 삼키지 말고 다시 던지거나(순수 유틸) `signOut({ callbackUrl: '/login' })`을 불러야 한다(React Query 밖 UI 호출부). 그래야 삭제·비활성 계정의 세션이 만료됐을 때 실제로 로그아웃까지 이어진다.

## When to Apply

- `auth-db-msw-boundary.md` 기준으로 새 route.ts(실 DB 호출)를 만들 때 → 이 가드를 처음부터 포함
- 기존 route.ts에 필드를 추가할 때 → 그 필드가 "누구의 데이터인지"를 정하는 필드라면 세션에서 파생시킬지 검토
- 여러 id를 한 번에 처리하는(bulk) 실 API를 만들 때 → `single-item-ownership-header-pattern.md`의 fail-closed 원칙과 함께 적용

## Related

- `[[auth-db-msw-boundary]]` — 이 4개 라우트가 왜 MSW가 아니라 실 DB인지의 배경
- `[[single-item-ownership-header-pattern]]` — MSW 쪽 ownerId 검증 패턴(X-Owner-Id 헤더), bulk 액션의 fail-closed 원칙
- `[[user-hierarchy-ownerid-pattern]]` — ownerId 테넌트 격리 원 설계
- `src/shared/utils/apiAuth.ts`, `src/shared/utils/apiAuth.test.ts`
- `src/shared/utils/permission.ts` — 등급 정책표(정본), `src/app/api/routePermissions.test.ts` — route 권한 거부 계약 테스트
- `docs/superpowers/specs/2026-07-15-bulk-ownerid-fail-closed-and-api-auth-guard-design.md` — 설계 문서 전문
