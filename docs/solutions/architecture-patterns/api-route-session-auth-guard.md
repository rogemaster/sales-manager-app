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

export async function requireSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return {
    id: token.id,
    ownerId: token.ownerId ?? token.id, // 과거 null 데이터 하위호환 (workspaceOwnerIdAtom과 동일 fallback)
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

`src/types/next-auth.d.ts`가 이미 `JWT`에 `id`/`ownerId`/`grade`를 타입 확장해두고 있어서 캐스팅 없이 바로 쓸 수 있다.

### 사용 패턴

각 라우트 핸들러 맨 앞, **`try` 블록보다 먼저** 가드를 호출한다.

```typescript
export async function DELETE(req: NextRequest) {
  const session = await requireSuperAdminSession(req);
  if (session instanceof NextResponse) return session; // 401/403 즉시 반환

  try {
    // 이후 로직은 클라이언트가 보낸 ownerId/email이 아니라 session.ownerId/session.id 사용
  } catch (error) { /* 기존 500 처리 */ }
}
```

- 사용자 관리(`account/users` 3개 라우트)처럼 등급 제한이 필요하면 `requireSuperAdminSession`
- 본인 프로필 수정처럼 등급 무관하게 허용해야 하면 `requireSession`
- 인증 실패(401)와 서버 에러(500)는 별개 관심사이므로 가드를 `try` 블록 **밖**에 둔다

### 클라이언트가 보낸 식별자는 절대 신뢰하지 않는다

가드를 통과한 뒤에도 body의 `ownerId`/`email` 같은 식별자 필드는 무시하고 `session.ownerId`/`session.id`로 대체한다. 인증만 걸고 body의 identity 값은 그대로 신뢰하면 로그인은 했지만 타 테넌트 데이터를 건드리는 IDOR이 그대로 남는다.

## Why This Matters

- middleware matcher에 페이지 경로만 등록하는 관행이, "미들웨어가 인증을 담당한다"는 잘못된 안전감을 만든다. 실제로는 라우트별로 확인해야 한다.
- `auth-db-msw-boundary.md`의 판단 기준("유저 인증·식별에 직접 연관되면 DB")대로 새 route.ts를 추가할 때마다, 그 라우트가 middleware 보호 밖이라는 사실과 이 가드 패턴을 함께 적용하지 않으면 같은 구멍이 반복된다.
- 클라이언트 타입 제약(`CreateUserBody.grade: SubUserGrade` 등)은 컴파일 타임에만 유효하다 — 원시 HTTP 요청은 타입을 우회할 수 있으므로 권한이 중요한 필드는 서버에서도 별도로 검증해야 한다(예: `account/users/create`가 body의 `grade === 'super_admin'`을 명시적으로 거부).

## When to Apply

- `auth-db-msw-boundary.md` 기준으로 새 route.ts(실 DB 호출)를 만들 때 → 이 가드를 처음부터 포함
- 기존 route.ts에 필드를 추가할 때 → 그 필드가 "누구의 데이터인지"를 정하는 필드라면 세션에서 파생시킬지 검토
- 여러 id를 한 번에 처리하는(bulk) 실 API를 만들 때 → `single-item-ownership-header-pattern.md`의 fail-closed 원칙과 함께 적용

## Related

- `[[auth-db-msw-boundary]]` — 이 4개 라우트가 왜 MSW가 아니라 실 DB인지의 배경
- `[[single-item-ownership-header-pattern]]` — MSW 쪽 ownerId 검증 패턴(X-Owner-Id 헤더), bulk 액션의 fail-closed 원칙
- `[[user-hierarchy-ownerid-pattern]]` — ownerId 테넌트 격리 원 설계
- `src/shared/utils/apiAuth.ts`, `src/shared/utils/apiAuth.test.ts`
- `docs/superpowers/specs/2026-07-15-bulk-ownerid-fail-closed-and-api-auth-guard-design.md` — 설계 문서 전문
