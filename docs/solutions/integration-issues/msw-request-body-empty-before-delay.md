---
title: "MSW 핸들러에서 await delay() 이전에 request.json()을 호출하지 않으면 body가 빈 객체로 읽힘"
date: 2026-06-09
category: docs/solutions/integration-issues/
module: mocks
problem_type: integration_issue
component: development_workflow
symptoms:
  - "PATCH /api/profile 요청의 body가 빈 객체 {}로 읽힘"
  - body.email이 undefined로 평가되어 사용자 조회 실패
  - updateMockProfile의 findIndex가 -1을 반환하고 null 리턴
  - 핸들러가 의도하지 않은 404 응답을 반환함
root_cause: async_timing
resolution_type: code_fix
severity: high
tags:
  - msw
  - service-worker
  - request-body
  - async-timing
  - readable-stream
  - patch-handler
  - delay
  - handler-ordering
---

# MSW 핸들러에서 await delay() 이전에 request.json()을 호출하지 않으면 body가 빈 객체로 읽힘

## Problem

MSW Service Worker 모드에서 PATCH 핸들러 안에 `await delay(N)` 을 `await request.json()` 보다 먼저 배치하면, body가 빈 객체 `{}`로 읽혀 핸들러 내부 로직이 잘못된 404를 반환한다.

## Symptoms

- `PATCH /api/profile` 요청이 유효한 body를 보냈음에도 HTTP 404가 반환됨
- 에러 메시지 없이 핸들러가 정상 실행되는 것처럼 보이지만 `body.email === undefined`
- mock util의 `findIndex`가 항상 -1을 반환 → null → 404 분기

## What Didn't Work

코드 리뷰어가 "기존 PATCH 핸들러들(주문 수정 등)과 일관성을 맞추기 위해 `await delay(300)`을 추가하라"고 제안했다. 기존 핸들러 중 일부가 `delay` 이후 body를 읽는 구조였기 때문에 이 제안은 합리적으로 보였다. 하지만 이 패턴은 ReadableStream 소비 타이밍 문제를 그대로 도입한다.

```typescript
// ❌ 이렇게 추가하면 body가 비어버림
http.patch(`${baseUrl}/api/profile`, async ({ request }) => {
  await delay(300);                                           // ← delay 먼저
  const body = (await request.json()) as UpdateProfileBody;  // ← body 읽기
  const updated = updateMockProfile(body);
  if (!updated) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(updated);
}),
```

## Solution

**적용된 수정 (Fix A) — delay 제거:**

```typescript
// ✅ delay가 스펙 요건이 아닌 경우 제거
http.patch(`${baseUrl}/api/profile`, async ({ request }) => {
  const body = (await request.json()) as UpdateProfileBody;
  const updated = updateMockProfile(body);
  if (!updated) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(updated);
}),
```

**대안 수정 (Fix B) — delay가 반드시 필요한 경우 body를 먼저 읽기:**

```typescript
// ✅ delay가 필요하다면 body 읽기를 delay 이전에 배치
http.patch(`${baseUrl}/api/example`, async ({ request }) => {
  const body = (await request.json()) as SomeBodyType;  // 1. body 먼저
  await delay(300);                                      // 2. delay는 그 다음
  const updated = someUtil(body);
  if (!updated) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(updated);
}),
```

## Why This Works

Fetch API의 `Request.body`는 `ReadableStream`이다. ReadableStream은 단일 통과(single-pass)이며 pull 방식으로 동작한다. MSW Service Worker 환경에서 `await delay(N)` 같은 비동기 작업을 body 읽기 전에 실행하면, 브라우저가 해당 스트림의 내부 reader를 잠그거나 GC 대상으로 처리할 수 있다. 이후 `request.json()`이 스트림 reader를 획득하려 할 때 이미 소비되었거나 교란된(disturbed) 상태의 스트림을 받아 `{}`를 반환한다.

`request.json()`을 핸들러의 **첫 번째 `await`**로 호출하면 스트림이 소비되기 전에 body를 안전하게 읽을 수 있다.

## Prevention

**MSW 핸들러 규칙: request body를 읽는 핸들러에서는 `request.json()` (또는 `request.text()`, `request.formData()`)을 항상 첫 번째 `await`로 호출한다. `await delay()` 등 다른 비동기 호출은 body 읽기 이후에 배치한다.**

```typescript
// ✅ 올바른 순서
http.patch(`${baseUrl}/api/...`, async ({ request }) => {
  const body = await request.json();  // 1. body 읽기
  await delay(300);                   // 2. 그 다음 delay
  // ... 비즈니스 로직
}),
```

추가 주의사항:

- **기존 핸들러 점검:** `src/mocks/handlers/orders.ts`의 주문 수정 핸들러(`PATCH /api/orders/:orderId`)가 현재 `delay` 이후에 body를 읽는 동일한 위험 패턴을 가지고 있다. 현재 환경에서는 동작하지만 리팩터링 권장.
- **404 디버깅 시:** mock 핸들러에서 예상치 못한 404가 발생하면 mock 데이터보다 먼저 body 읽기 순서를 확인한다.
- **코드 리뷰 시:** "일관성을 위해 delay 추가"라는 제안이 있으면 body 읽기 순서를 반드시 확인한다.

## Related Issues

- `docs/solutions/integration-issues/msw-browser-server-memory-isolation-nextauth-login.md` — MSW 관련 다른 통합 이슈 (메모리 격리 문제)
- `src/mocks/handlers/orders.ts` — 주문 도메인 핸들러 파일 (delay 패턴 주의 대상)
- `src/mocks/handlers.ts` — 도메인 핸들러를 spread하는 index 파일 (핸들러 정의 없음)
- `docs/solutions/architecture-patterns/msw-domain-split-handlers.md` — MSW handlers 도메인별 분리 아키텍처 패턴
