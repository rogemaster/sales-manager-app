---
title: Vercel 배포 후 로그인 실패 및 /home 307 리다이렉트 이슈
date: 2026-06-05
category: integration-issues
module: auth
problem_type: deployment_configuration
component: authentication
symptoms:
  - 배포 후 로그인 시 CredentialsSignin 에러 (401)
  - 로그인 성공 후 /home에서 307 Temporary Redirect → /login으로 이동
root_cause: missing_env_vars
resolution_type: configuration
severity: critical
tags:
  - vercel
  - nextauth
  - msw
  - instrumentation
  - environment-variables
  - deployment
---

# Vercel 배포 후 로그인 실패 및 /home 307 리다이렉트 이슈

## Problem

로컬 개발 환경에서는 정상 동작하지만 Vercel 배포 후 두 가지 문제가 연속으로 발생했다.

1. **로그인 실패**: `CredentialsSignin` 에러 — NextAuth `authorize()` 함수가 null 반환
2. **307 리다이렉트 루프**: 로그인 성공 후 `/home` 접근 시 `/login`으로 리다이렉트

## Root Cause

세 가지 설정 누락이 원인이었다.

### 원인 1: `instrumentation.ts`의 `NODE_ENV` 가드

```ts
// 문제 코드
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'development') {
    const { server } = await import('./mocks/node');
    server.listen();
  }
}
```

`NODE_ENV === 'development'` 조건으로 인해 프로덕션에서 MSW 서버가 시작되지 않았다.
NextAuth `authorize()` 함수는 서버사이드에서 `/api/login`을 fetch하는데, MSW가 없으면 해당 엔드포인트에 route handler가 없어 요청 실패 → null 반환 → `CredentialsSignin` 에러.

### 원인 2: `NEXT_PUBLIC_BASE_URL` 환경변수 프로토콜 누락

Vercel 환경변수에 `sales-manager-app-nine.vercel.app`(`https://` 없이) 저장.

```
handlers.ts 핸들러 등록 URL:  sales-manager-app-nine.vercel.app/api/login
authorize() fetch URL:        sales-manager-app-nine.vercel.app/api/login  ← 유효하지 않은 URL
```

`fetch()`는 프로토콜 포함 절대 URL이 필요하다. 프로토콜이 없으면 요청 자체가 실패한다.

### 원인 3: `NEXTAUTH_URL` / `NEXTAUTH_SECRET` Vercel 환경변수 미설정

`.env.local`은 로컬 전용으로 Vercel에 배포되지 않는다. Vercel 환경변수에 별도 설정이 없으면:

- `NEXTAUTH_SECRET` 없음 → 미들웨어의 `getToken()`이 JWT 서명 검증 실패 → null 반환
- `NEXTAUTH_URL` 없음 → JWT 쿠키 도메인/경로 설정 오류

결과적으로 로그인은 성공해도 세션 쿠키가 올바르게 설정되지 않아 미들웨어가 미인증으로 판단 → 307 리다이렉트.

## What Didn't Work

- **`layout.tsx`에 MSW 초기화 코드 추가**: 이전 커밋에서 시도했으나 효과 없음. Vercel serverless 환경에서 페이지 렌더링(`layout.tsx`)과 NextAuth route handler(`/api/auth/[...nextauth]`)는 **별개 실행 컨텍스트**라 상태를 공유하지 않는다. layout에서 `server.listen()`을 호출해도 NextAuth route handler의 fetch 요청에는 영향을 주지 못한다.

```tsx
// ❌ 효과 없음 — layout 렌더링과 NextAuth route handler는 별도 컨텍스트
export default async function RootLayout(...) {
  if (typeof window === 'undefined') {
    const server = setupServer(...handlers);
    server.listen();  // NextAuth authorize()에 영향 없음
  }
  ...
}
```

## Solution

### 1. `instrumentation.ts` — `NODE_ENV` 가드 제거

```ts
// ✅ 수정 후 — 프로덕션에서도 MSW 서버 시작
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { server } = await import('./mocks/node');
    server.listen();
  }
}
```

### 2. `layout.tsx` — 잘못된 MSW 초기화 코드 제거

`instrumentation.ts`가 올바른 초기화 위치이므로 `layout.tsx`의 MSW 관련 코드를 모두 제거.

### 3. `package.json` — `msw`를 `dependencies`로 이동

```json
// ❌ devDependencies
"msw": "^2.11.3"

// ✅ dependencies
"msw": "^2.11.3"
```

프로덕션 런타임에서 import되므로 `dependencies`에 위치해야 한다.

### 4. Vercel 환경변수 설정

| 키 | 값 |
|----|-----|
| `NEXT_PUBLIC_BASE_URL` | `https://sales-manager-app-nine.vercel.app` |
| `NEXTAUTH_URL` | `https://sales-manager-app-nine.vercel.app` |
| `NEXTAUTH_SECRET` | `.env.local`과 동일한 값 |

`NEXT_PUBLIC_BASE_URL`은 반드시 `https://` 프로토콜을 포함해야 한다.

## Why This Works

`instrumentation.ts`의 `register()` 함수는 Next.js가 서버를 초기화할 때 **모든 route handler보다 먼저** 실행된다. 여기서 `server.listen()`을 호출하면 MSW가 Node.js의 전역 fetch/http 모듈을 패치하여, 이후 `authorize()` 함수의 `/api/login` fetch 요청을 인터셉트할 수 있다.

| 초기화 위치 | 실행 시점 | NextAuth 인터셉트 가능 여부 |
|------------|----------|--------------------------|
| `layout.tsx` | 페이지 렌더링 시 (route handler와 별개 컨텍스트) | ❌ |
| `instrumentation.ts` | 서버 프로세스 시작 시 (모든 route handler 이전) | ✅ |

## Prevention

- **Vercel 배포 전 체크리스트**: `NEXT_PUBLIC_BASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`을 반드시 Vercel 환경변수에 설정한다.
- **URL 환경변수는 프로토콜 포함**: `https://` 없이 도메인만 저장하면 fetch 요청 실패.
- **`msw`는 `dependencies`에 위치**: 프로덕션 런타임에서 import되는 패키지는 `devDependencies`에 두지 않는다.
- **MSW 초기화는 `instrumentation.ts`에서만**: `layout.tsx`나 다른 컴포넌트에서 `setupServer().listen()`을 호출하지 않는다.

## Related Issues

- `docs/solutions/integration-issues/msw-browser-server-memory-isolation-nextauth-login.md` — MSW 브라우저/서버 메모리 격리 문제
