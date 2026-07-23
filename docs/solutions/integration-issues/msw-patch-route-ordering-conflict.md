---
title: MSW handlers.ts에서 PATCH /:id 와일드카드가 PATCH /status 고정 경로를 가로채는 충돌
date: 2026-06-15
category: integration-issues
module: mocks
problem_type: integration_issue
component: development_workflow
severity: high
symptoms:
  - "PATCH /api/.../status 요청이 상태 변경 핸들러 대신 단건 수정 핸들러로 라우팅됨"
  - status 경로의 params.id에 'status' 문자열이 들어와 DB 조회 실패
  - 일괄 상태 변경 API가 404 또는 잘못된 응답을 반환
root_cause: msw_handler_ordering
resolution_type: code_fix
tags:
  - msw
  - handler-ordering
  - route-conflict
  - wildcard
  - patch
---

# MSW handlers.ts에서 PATCH /:id 와일드카드가 PATCH /status 고정 경로를 가로채는 충돌

## Problem

MSW `handlers` 배열에서 `PATCH /api/resource/:id` 핸들러가 `PATCH /api/resource/status` 핸들러보다 앞에 등록되면, `/status` 경로에 대한 요청이 `:id` 와일드카드 핸들러에 먼저 매칭되어 상태 변경 로직에 도달하지 못한다.

## Symptoms

- `PATCH /api/shopping/accounts/status` 요청 시 `updateMockShoppingAccountsStatus`가 아닌 `updateMockShoppingAccount`가 호출됨
- `params.id === 'status'`로 조회하여 mock 데이터에서 일치 항목 없음 → null 반환 → 404
- 일괄 사용여부 변경 버튼 클릭 시 서버 에러 발생

## What Didn't Work

핸들러를 일반적인 CRUD 순서(목록 → 단건 → 수정 → 삭제)로 등록하면 수정 핸들러 `PATCH /:id`가 `PATCH /status`보다 앞에 위치하게 된다. MSW는 배열 순서대로 첫 번째 매칭 핸들러를 실행하므로 `:id`가 'status'를 캡처해 버린다.

```typescript
// ❌ 잘못된 순서 — :id가 /status를 가로챔
http.patch(`${baseUrl}/api/shopping/accounts/:id`, ...),    // ← 먼저 등록
http.patch(`${baseUrl}/api/shopping/accounts/status`, ...), // ← 절대 도달 안 함
```

## Solution

**고정 경로(static path)를 와일드카드 경로보다 항상 앞에 등록한다.**

```typescript
// ✅ 올바른 순서 — 고정 경로 먼저
http.patch(`${baseUrl}/api/shopping/accounts/status`, async ({ request }) => {
  const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
  updateMockShoppingAccountsStatus(ids, isActive);
  return HttpResponse.json({ success: true });
}),

http.patch(`${baseUrl}/api/shopping/accounts/:id`, async ({ request, params }) => {
  const body = (await request.json()) as UpdateShoppingAccountBody;
  const updated = updateMockShoppingAccount(params.id as string, body);
  if (!updated) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(updated);
}),
```

## Why This Works

MSW는 `handlers` 배열을 순서대로 순회하며 첫 번째 매칭 핸들러를 실행한다(Express 미들웨어와 동일한 방식). URL 패턴 매칭에서 `:id`는 임의의 문자열 세그먼트와 매칭되므로 `status`도 유효한 `:id` 값이다. 고정 문자열 경로(`/status`)를 와일드카드(`:id`) 앞에 배치하면 고정 경로가 우선 매칭된다.

## Prevention

- **`handlers.ts` 등록 규칙:** 동일 베이스 경로에 고정 세그먼트와 와일드카드 세그먼트가 공존할 때 고정 세그먼트를 항상 먼저 등록한다.
- **적용 패턴:** `POST /list`, `POST /delete`, `PATCH /status` 같은 액션 경로는 `GET /:id`, `PATCH /:id`, `DELETE /:id` 보다 앞에 위치해야 한다.
- **코드 리뷰 시:** 새 핸들러 추가 후 기존 `:id` 와일드카드 핸들러와 베이스 경로가 겹치는지 확인한다.

```
// handlers.ts 권장 등록 순서 (동일 리소스 기준)
POST   /resource/list     ← 목록 조회 (고정)
POST   /resource/delete   ← 다중 삭제 (고정)
PATCH  /resource/status   ← 일괄 상태 변경 (고정) ← 와일드카드보다 앞
POST   /resource          ← 단건 생성
GET    /resource/:id      ← 단건 조회 (와일드카드)
PATCH  /resource/:id      ← 단건 수정 (와일드카드)
DELETE /resource/:id      ← 단건 삭제 (와일드카드)
```

## Related

- `src/mocks/handlers/shoppingAccounts.ts` — 실제 수정이 적용된 도메인 핸들러 파일
- `src/mocks/handlers.ts` — 도메인 핸들러를 spread하는 index 파일 (핸들러 정의 없음)
- `docs/solutions/integration-issues/msw-request-body-empty-before-delay.md` — MSW 핸들러 관련 다른 통합 이슈
- `docs/solutions/architecture-patterns/msw-domain-split-handlers.md` — MSW handlers 도메인별 분리 아키텍처 패턴
