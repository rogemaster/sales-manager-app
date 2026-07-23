---
title: MSW 타이밍 이슈로 인한 로그인 간헐적 404 — DB 직접 조회로 해결
date: 2026-06-24
category: integration-issues
module: auth/login
problem_type: integration_issue
component: authentication
symptoms:
  - 로컬 개발 환경에서 로그인 시 간헐적으로 404 에러 발생
  - 서버 재시작 직후 첫 로그인 시도에서 주로 발생
  - 재시도하면 성공하는 경우도 있어 재현이 불안정
root_cause: msw_structural_limitation
resolution_type: architecture_change
severity: high
tags:
  - msw
  - nextauth
  - server-side-fetch
  - authorize
  - neon-db
  - drizzle-orm
---

# MSW 타이밍 이슈로 인한 로그인 간헐적 404 — DB 직접 조회로 해결

## Problem

로컬 개발 환경에서 로그인 시 간헐적으로 404 에러가 발생한다. Next.js, NextAuth, MSW의 초기화 타이밍이 맞지 않을 때 발생하며, MSW의 구조적 한계로 인해 완전히 제거할 수 없는 문제다.

## Root Cause

```
[브라우저] 로그인 폼 제출
    ↓
[NextAuth] /api/auth/callback/credentials 처리 (서버사이드)
    ↓
[authorize()] fetch('http://localhost:3000/api/login')  ← 서버→서버 fetch
    ↓
[MSW service worker] ← 브라우저 전용, 서버사이드 fetch 불가 인터셉트
    ↓
[실제 Next.js route handler] /api/login route.ts가 없으므로 404
```

NextAuth의 `authorize()` 함수는 **서버사이드에서 실행**된다. MSW service worker는 브라우저 컨텍스트에서만 동작하므로 서버→서버 fetch를 가로챌 수 없다. MSW Node 인터셉터(`setupServer`)로 보완할 수 있지만, Next.js 서버 초기화 타이밍과 맞지 않으면 동일한 404가 발생할 수 있어 근본 해결이 아니다.

## What Didn't Work (우회책 분석)

| 방법 | 이유 |
|------|------|
| MSW Node 인터셉터 추가 | Next.js 초기화 타이밍 문제 잔존, 근본 원인 미해결 |
| `authorize()` 내 retry 로직 | MSW가 아예 안 뜬 상황이면 retry도 전부 실패 |
| `/api/login` route handler 생성 | 프로젝트 규칙 위반(route.ts 생성 금지), 결국 mock 데이터 의존 |

## Solution

`authorize()` 내부의 `fetch('/api/login')` 호출을 제거하고, Neon DB를 직접 조회한다.

```typescript
// src/app/api/auth/[...nextauth]/route.ts
async authorize(credentials) {
  // Before: fetch('/api/login') → MSW 타이밍 이슈
  // After: DB 직접 조회 → MSW 완전 우회

  const result = await db.select()
    .from(users)
    .where(eq(users.email, credentials.email))
    .limit(1);

  const user = result[0];
  if (!user) return null;

  const isValid = await verifyPassword(credentials.password, user.password);
  if (!isValid) return null;

  return { id: user.id, email: user.email, ... };
}
```

비밀번호는 Node.js 내장 `crypto` 모듈의 `scrypt`로 해싱한다 (`src/db/password.ts`).

## Why This Works

`authorize()`가 MSW를 전혀 경유하지 않는다. DB 연결은 서버 시작 시점에 독립적으로 초기화되므로 MSW 타이밍에 영향받지 않는다.

## Files Changed

- `src/app/api/auth/[...nextauth]/route.ts` — fetch 제거, DB 직접 조회
- `src/db/index.ts` — drizzle-orm + @neondatabase/serverless
- `src/db/schema.ts` — users 테이블 정의
- `src/db/password.ts` — scrypt 기반 해싱/검증 유틸
- `src/mocks/handlers/auth.ts` — `/api/login` 핸들러 제거

## Related

- `docs/solutions/architecture-patterns/auth-db-msw-boundary.md` — 인증만 DB, 나머지 MSW 경계 설계
- `docs/solutions/integration-issues/msw-browser-server-memory-isolation-nextauth-login.md` — 이전 MSW 격리 이슈
