---
title: 로컬 개발 환경에서 로그인 시 CredentialsSignin(401) — webpack HMR이 fetch 패치를 깨뜨림
date: 2026-06-08
category: integration-issues
module: auth
problem_type: dev_server_framework_incompatibility
component: authentication
symptoms:
  - 로컬(`npm run dev`)에서 로그인 시 `CredentialsSignin` 에러(401) 발생
  - 응답 url이 `/api/auth/error?error=CredentialsSignin&provider=credentials`
  - 서버 로그에 `POST /api/login 404 in ...ms`가 찍힘 (MSW 핸들러가 있음에도 404)
  - Vercel(프로덕션)에서는 동일한 코드가 정상 동작함
root_cause: framework_incompatibility
resolution_type: configuration
severity: critical
tags:
  - nextauth
  - msw
  - instrumentation
  - hot-module-reloader
  - turbopack
  - webpack
  - dev-server
  - fetch-patching
---

# 로컬 개발 환경에서 로그인 시 CredentialsSignin(401) — webpack HMR이 fetch 패치를 깨뜨림

## Problem

로컬 개발 서버(`next dev`, webpack 기반)에서 `admin@example.com` 같은 정적 테스트 계정으로 로그인해도 `CredentialsSignin`(401) 에러가 발생했다. `instrumentation.ts`도 정상 실행되고 `/api/login` MSW 핸들러도 존재하는데, 서버 로그를 보면 다음과 같이 **MSW가 아닌 Next.js의 실제 라우터가 요청을 처리해 404를 반환**하고 있었다.

```
✓ Compiled /_not-found in 380ms (2294 modules)
인증 API 호출 실패: 404 Not Found
 POST /api/auth/callback/credentials 401 in 520ms
 POST /api/login 404 in 499ms
```

`/api/login`에 대한 route handler는 의도적으로 만들지 않았으므로(이 프로젝트는 MSW가 모든 API를 가로채는 구조), 404가 발생했다는 것은 **`authorize()`의 `fetch('/api/login')` 호출이 MSW의 인터셉터를 완전히 우회해 Next.js의 실제 라우터까지 도달했다**는 뜻이다.

## Root Cause

`globalThis.fetch`가 재할당되는 시점을 추적(`Object.defineProperty`로 getter/setter를 걸어 모든 재할당을 로깅)한 결과, 서버 부팅~첫 페이지 컴파일 사이에 다음과 같은 시퀀스가 발생했다.

```
1. 초기: 네이티브 fetch (instrumentation.ts 부팅 시점)
2. 재할당 → MSW의 인터셉터 (instrumentation.ts → server.listen()) ✓ 정상
3. 재할당 → Next.js의 "patched" 래퍼 (patchFetch, MSW의 fetch를 감싸는 정상 동작)
4. 재할당 → 네이티브 fetch (!!)
   호출 위치: HotReloaderWebpack.resetFetch
   (next/dist/server/lib/router-server.js, webpack 재컴파일 사이클의 "Watching._done" 훅에서 호출)
   → MSW의 패치를 완전히 덮어씀
5. 재할당 → Next.js의 "patched" 래퍼 (다시 patchFetch 실행)
   → 이번엔 (MSW가 아닌) 네이티브 fetch를 "원본(original)"으로 캡처
   → isFetchPatched() 가드가 재패치를 막아 이후 영구 고정
```

**결론**: `instrumentation.ts`가 부팅 시 MSW로 `globalThis.fetch`를 정상 패치한 직후, **webpack 기반 Hot Module Reloader(`HotReloaderWebpack.resetFetch`)가 재컴파일 사이클 도중 `globalThis.fetch`를 네이티브로 강제 초기화**한다. 그 직후 Next.js가 자체 `patchFetch()`를 다시 실행하면서 이번엔 (이미 초기화된) 네이티브 fetch를 "원본"으로 잘못 캡처해버려, 이후 서버 수명 동안 MSW의 인터셉터가 영구적으로 가려진다.

이것이 **Next.js 15 dev 모드(webpack)와 MSW v2의 fetch 패치 메커니즘 간의 프레임워크 차원 호환성 문제**이며, 사용자 코드의 버그가 아니다. 프로덕션(Vercel) 빌드에는 Hot Module Reloader 자체가 없으므로 이 문제가 발생하지 않는다 — `docs/solutions/integration-issues/vercel-deployment-login-redirect-issues.md`에 기술된 수정 이후 프로덕션은 정상 동작하지만, 로컬 dev에서는 별개의 이 이슈가 새로 드러난 것이다.

## What Didn't Work

- **`instrumentation.ts`/`authorize()` 코드를 직접 수정**: 양쪽 모두 정상적으로 실행되고 있었다 (MSW의 `server.listen()`도 성공, `authorize`의 fetch 호출도 정상 실행). 문제는 코드 로직이 아니라 **두 호출 사이에서 프레임워크가 `globalThis.fetch`를 가로채 바꿔버리는 타이밍**에 있었으므로, 애플리케이션 코드 수정으로는 해결할 수 없었다.
- **`authorize()`에서 mock 로직(`loginUser`)을 직접 import해서 호출**: 동작은 하지만, fetch 기반의 `authorize` 흐름(=실제 백엔드 연동 시와 동일한 인터페이스)을 포기해야 한다. 이 프로젝트는 추후 실제 백엔드와의 결합을 염두에 두고 있으므로, 이 방식은 나중에 다시 fetch 기반으로 되돌려야 하는 기술 부채가 된다.

## Solution

`package.json`의 dev 스크립트를 webpack 기반에서 **Turbopack**으로 전환한다. 코드 변경은 전혀 필요 없다.

```diff
  "scripts": {
-   "dev": "next dev",
+   "dev": "next dev --turbo",
```

전환 후 동일한 `authorize()` 코드, 동일한 MSW 핸들러로 로그인이 정상 동작함을 확인했다.

```
✓ Compiled /api/auth/[...nextauth] in 451ms
POST /api/auth/callback/credentials 200 in 88ms   ← 로그인 성공, /api/login 404 없음
```

## Why This Works

`HotReloaderWebpack.resetFetch`는 **webpack 기반 핫 리로더에 특정된 동작**이다. Turbopack은 별도의 핫 리로딩 구현을 사용하며 이런 식으로 `globalThis.fetch`를 재컴파일 사이클마다 네이티브로 되돌리지 않는다. 따라서 `instrumentation.ts`에서 MSW가 패치한 `globalThis.fetch`가 중간에 깨지지 않고 그대로 유지되어, `authorize()`의 fetch 호출이 정상적으로 MSW에 도달한다.

또한 Turbopack 전환은 `authorize()`가 fetch 기반으로 `/api/login`을 호출하는 구조(=실제 백엔드 연동 시에도 그대로 재사용 가능한 구조)를 그대로 유지하면서 문제를 해결하므로, 이 프로젝트의 "추후 백엔드 결합" 방향성과도 부합한다. 부수적으로 컴파일 속도도 webpack 대비 더 빠르다.

## Prevention

- **MSW + NextAuth(서버사이드 fetch 인터셉션) 조합을 사용하는 Next.js 프로젝트는 dev 서버를 Turbopack으로 운영한다.** webpack 기반 `next dev`는 핫 리로드 사이클 중 `globalThis.fetch`를 재설정해 MSW의 서버사이드 인터셉션을 영구적으로 깨뜨릴 수 있다.
- **로컬 로그인 401(`CredentialsSignin`)이 재현되면 가장 먼저 서버 로그에서 `POST /api/login`의 상태 코드를 확인한다.** `404`가 찍히면 MSW가 아닌 Next.js의 실제 라우터가 요청을 처리한 것이므로, 이 문서의 fetch 패치 충돌 문제일 가능성이 높다 (자격 증명 오류나 데이터 누락 문제가 아님).
- **`instrumentation.ts` / `authorize()` 코드 자체는 정상이므로 수정하지 않는다.** 문제는 두 시점 사이의 프레임워크 레벨 fetch 재할당이다.

## Related Issues

- `docs/solutions/integration-issues/vercel-deployment-login-redirect-issues.md` — 프로덕션(Vercel) 배포 시 발생한 별개의 로그인/리다이렉트 이슈 (이 문서의 이슈는 그 수정 이후 로컬 dev에서 새로 드러난 것)
- `docs/solutions/integration-issues/msw-browser-server-memory-isolation-nextauth-login.md` — MSW 브라우저/서버 메모리 격리 문제
