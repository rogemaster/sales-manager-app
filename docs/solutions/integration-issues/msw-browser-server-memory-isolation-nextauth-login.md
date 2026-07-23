---
title: MSW 브라우저/서버 메모리 격리로 인한 NextAuth 자동 로그인 실패
date: 2026-06-04
category: integration-issues
module: auth/register
problem_type: integration_issue
component: authentication
symptoms:
  - 회원가입 완료 후 signIn('credentials') 호출 시 401 반환으로 자동 로그인 실패
  - 수동 로그인도 신규 등록된 계정으로 시도하면 동일하게 실패
  - 브라우저 MSW의 MOCK_USERS_DATA에는 신규 유저가 있지만 서버 MSW에는 없음
root_cause: scope_issue
resolution_type: workflow_improvement
severity: high
tags:
  - msw
  - nextauth
  - browser-server-isolation
  - mock-service-worker
  - credentials-provider
  - registration
---

# MSW 브라우저/서버 메모리 격리로 인한 NextAuth 자동 로그인 실패

## Problem

Next.js App Router + MSW 개발 환경에서 회원가입 후 NextAuth `signIn('credentials')`을 호출하면 자동 로그인이 실패한다. MSW가 브라우저(service worker)와 서버(Node.js) 두 컨텍스트에서 독립적인 메모리를 사용하기 때문에, 브라우저 MSW가 저장한 신규 유저를 서버 MSW가 찾지 못한다.

## Symptoms

- 회원가입 API 호출은 성공(201)하지만 이후 `signIn()` 호출이 실패
- NextAuth `authorize()` 내부에서 `/api/login` 호출 시 401 반환
- 새로 가입한 계정으로 로그인 페이지에서 수동 로그인해도 동일하게 실패
- 브라우저 DevTools에서 `MOCK_USERS_DATA`에 신규 유저가 존재하는 것을 확인할 수 있지만 서버 측 메모리에는 없음

## What Didn't Work

- **서버 전용 MSW 핸들러로 이동**: `check-email`, `register` 핸들러를 `node.ts`의 `serverOnlyHandlers`로 분리하고 브라우저 MSW에서 제거했으나, 서버 MSW(`setupServer`)는 서버에서 **나가는(outgoing)** fetch 요청만 가로채고 **들어오는(incoming)** HTTP 요청은 처리하지 못한다. 브라우저가 bypass → Next.js 서버 도달 → route handler 없음 → 404 발생.

- **/api/auth/ 경로 사용**: `/api/auth/check-email`, `/api/auth/register` 경로를 사용하면 NextAuth의 catch-all 라우트 핸들러(`src/app/api/auth/[...nextauth]/route.ts`)가 먼저 가로채 `'This action with HTTP POST is not supported by NextAuth.js'` 오류 발생.

- **Next.js route handler 생성**: `src/app/api/register/route.ts`를 만들면 서버 메모리에 직접 저장할 수 있으나, CLAUDE.md의 "route.ts 생성 절대 금지" 규칙 위반이고, Next.js 번들링에 따른 모듈 격리로 인해 route handler와 MSW 인스트루멘테이션이 동일한 `MOCK_USERS_DATA` 인스턴스를 공유한다는 보장이 없다.

## Solution

회원가입 API는 브라우저 MSW에서 처리하되, 가입 완료 후 자동 로그인 시도 대신 `CommonAlertDialog`로 안내 메시지를 표시하고 로그인 페이지로 이동한다.

```typescript
// src/features/auth/ui/register/hooks/useRegisterForm.ts
const { showAlert } = useAlert();

const handleFormSubmit = async (data: RegisterFormData) => {
  // ...유효성 검사...

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/register`, {
    method: 'POST',
    body: JSON.stringify({ ...data, businessLicenseName: businessLicense.name }),
  });
  if (!res.ok) throw new Error('가입 실패');

  // signIn() 대신 안내 alert + 로그인 페이지 이동
  showAlert({
    type: 'success',
    title: '가입이 완료되었습니다',
    message:
      '※ MSW 개발 환경으로 인해 실제 신규 가입은 지원되지 않습니다.\n' +
      '아래 테스트 계정으로 로그인해 주세요.\n\n' +
      '이메일: admin@example.com\n' +
      '비밀번호: admin123',
    confirmText: '로그인 페이지로 이동',
    onConfirm: () => router.push('/login'),
  });
};
```

커스텀 API 경로는 `/api/auth/` 밖에 배치한다:

```typescript
// ❌ NextAuth catch-all과 충돌
fetch('/api/auth/check-email')
fetch('/api/auth/register')

// ✅ 올바른 경로
fetch('/api/check-email')
fetch('/api/register')
```

## Why This Works

MSW는 두 가지 독립된 컨텍스트에서 실행된다:

| 컨텍스트 | 설정 파일 | 초기화 위치 | 역할 |
|----------|-----------|------------|------|
| 브라우저 service worker | `src/mocks/browser.ts` | `MSWProvider.tsx` | 브라우저 fetch 가로채기 |
| Node.js 서버 | `src/mocks/node.ts` | `src/instrumentation.ts` | 서버에서 나가는 fetch 가로채기 |

두 컨텍스트는 **별도 프로세스에서 실행**되어 Node.js 모듈 캐시가 완전히 분리된다. `MOCK_USERS_DATA` 배열이 두 곳에 독립적으로 존재하므로, 브라우저 MSW가 `MOCK_USERS_DATA.push(newUser)`를 해도 서버 MSW는 해당 데이터를 볼 수 없다.

`signIn('credentials', {...})`은 내부적으로 NextAuth의 `authorize()` 함수를 **서버사이드**에서 실행하고, `authorize()` 안에서 `fetch('http://localhost:3000/api/login')`을 서버→서버 방향으로 호출한다. 이 요청은 서버 MSW가 가로채어 서버 메모리의 `MOCK_USERS_DATA`를 조회하므로, 브라우저 MSW가 저장한 신규 유저를 찾을 수 없다.

## Prevention

- **`/api/auth/*` 경로 금지**: NextAuth의 catch-all 라우트가 해당 prefix를 선점한다. 커스텀 API는 반드시 `/api/*` (예: `/api/login`, `/api/register`)를 사용한다.

- **MSW 환경에서 NextAuth 연동 설계 시**: `signIn()` 호출이 포함된 플로우는 서버사이드 데이터 의존성을 사전 파악해야 한다. 신규 데이터를 브라우저 MSW로만 저장하면 NextAuth 인증에서 조회 불가능하다.

- **MSW 환경 한계 명시**: 실제 백엔드 없이는 신규 가입 유저로의 로그인을 지원할 수 없는 경우, `useAlert`로 테스트 계정 안내를 제공하는 것이 가장 실용적이다.

- **`AlertProvider` 위치**: `useAlert` 훅은 `AlertProvider` 컨텍스트 안에서만 동작한다. 인증 페이지(login, register 등)에서도 사용하려면 `AlertProvider`를 `(authenticated)` 레이아웃이 아닌 **root layout**에 배치해야 한다.

## Related Issues

- `docs/solutions/conventions/typescript-type-design-patterns.md` — 프로젝트 타입 패턴 참고
