---
title: MSW handlers를 도메인별 파일로 분리하는 패턴
date: 2026-06-22
last_updated: 2026-09-25
category: architecture-patterns
module: mocks
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - MSW handler file grows beyond ~100 lines
  - Adding a handler to the remaining mock API layer (order area only — new domains are route handlers)
  - "A PATCH route uses both a static segment (e.g. /status) and a dynamic segment (e.g. /:id) under the same prefix"
symptoms:
  - handlers.ts becomes hard to navigate and maintain as domains multiply
  - PATCH requests to /status are incorrectly matched by the /:id handler
related_components:
  - tooling
tags:
  - msw
  - mock
  - handlers
  - route-conflict
  - architecture
  - domain-split
  - next-js
---

# MSW handlers를 도메인별 파일로 분리하는 패턴

## Context

MSW mock 레이어가 9개 도메인으로 확장되면서 단일 `src/mocks/handlers.ts` 파일이 320줄이 되었고, 인증·주문·상품·쇼핑 계정 등 서로 관련 없는 핸들러들이 한 파일에 섞였다. 새 API 핸들러를 추가할 때마다 도메인에 관계없이 이 파일 하나를 수정해야 했고, 특정 라우트의 핸들러를 찾으려면 전체를 스캔해야 했다.

리팩터링을 통해 핸들러를 `src/mocks/handlers/` 하위 도메인별 파일로 분리하고, `handlers.ts`는 spread만 담당하는 thin index로 전환했다.

## Guidance

### 디렉토리 구조

```
src/mocks/
├── handlers.ts              # thin index — 도메인 배열만 spread
├── config.ts                # 공유 baseUrl 상수
├── handlers/                # 도메인별 핸들러 파일
│   ├── auth.ts              # check-email, register, login, logout
│   ├── home.ts              # home/stats, recent-products, order-stats
│   ├── products.ts          # products CRUD + bulk
│   ├── orders.ts            # orders CRUD + comments/claim/history
│   ├── mallAccounts.ts      # mall-accounts CRUD
│   ├── collection.ts        # order/collection jobs + trigger
│   ├── users.ts             # account/users CRUD
│   ├── profile.ts           # profile PATCH
│   └── shoppingAccounts.ts  # shopping/accounts CRUD
├── data/                    # 정적 mock 데이터 (변경 없음)
└── utils/                   # 비즈니스 로직 유틸 (flat 구조 유지)
```

> 위 트리는 분리 당시(2026-06-22) 구조다. 이후 인증·사용자·상품·쇼핑몰·홈 상품 통계가 route handler + Neon으로 옮겨가며 해당 핸들러 파일이 삭제됐고, 2026-09-24 기준 `handlers/`에는 주문 영역의 `home.ts`(order-stats)·`orders.ts`·`collection.ts`만 남았다. 현재 구조는 `.claude/rules/msw-rules.md` 참고. 분리 패턴(얇은 인덱스, `config.ts`, 고정 경로 먼저 등록)은 그대로 유효하다.

### config.ts — 공유 baseUrl

```typescript
// src/mocks/config.ts
export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
```

모든 핸들러 파일은 이 파일에서 `baseUrl`을 import한다. 파일마다 직접 선언하지 않는다.

### handlers.ts — index only

```typescript
// src/mocks/handlers.ts (2026-09-24 기준 — 주문 영역만 남았다)
import { homeHandlers } from './handlers/home';
import { orderHandlers } from './handlers/orders';
import { collectionHandlers } from './handlers/collection';

export const handlers = [...homeHandlers, ...orderHandlers, ...collectionHandlers];
```

핸들러 정의나 비즈니스 로직은 이 파일에 넣지 않는다.

### 도메인 핸들러 파일 패턴

```typescript
// src/mocks/handlers/orders.ts
import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { getMockOrders } from '../utils/getOrders';
import { updateMockOrder } from '../utils/updateOrder';

export const orderHandlers = [
  http.post(`${baseUrl}/api/orders/list`, async ({ request }) => {
    const { ownerId, filters, page, pageSize } = await request.json();
    return HttpResponse.json(getMockOrders(ownerId, filters, page, pageSize));
  }),
  http.patch(`${baseUrl}/api/orders/:orderId`, async ({ request, params }) => {
    const update = await request.json();
    const updated = updateMockOrder(params.orderId as string, update);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),
];
```

### CRITICAL: 라우트 충돌 방지

고정 경로(`/status`)와 동적 경로(`/:id`)가 같은 prefix를 공유할 때, MSW는 등록 순서대로 첫 번째 매칭 핸들러를 사용한다. **고정 경로 핸들러를 반드시 먼저 등록**하지 않으면 `/:id`가 문자열 `"status"`를 가로챈다.

```typescript
// src/mocks/handlers/shoppingAccounts.ts (당시 예시 — 2026-09-21 route로 옮겨가며 삭제됨)
export const shoppingAccountHandlers = [
  // 고정 경로 FIRST — /:id가 "status"를 가로채는 것을 방지
  http.patch(`${baseUrl}/api/shopping/accounts/status`, async ({ request }) => {
    // 일괄 상태 변경 로직
  }),
  // 동적 경로는 그 다음
  http.patch(`${baseUrl}/api/shopping/accounts/:id`, async ({ request, params }) => {
    // 단건 수정 로직
  }),
];
```

충돌은 **메서드까지 같을 때만** 난다. 지금 남은 `orders.ts`의 `POST /orders/bulk`와 `GET·PATCH /orders/:orderId`는 메서드가 달라 충돌하지 않지만, 고정 경로를 먼저 두는 순서는 지켜져 있다. Next.js route handler는 파일 경로로 라우팅하므로 이 문제가 없다 — 등록 순서 규칙은 MSW 핸들러에만 해당한다.

이 순서 규칙의 상세한 작동 원리는 `docs/solutions/integration-issues/msw-patch-route-ordering-conflict.md` 참고.

### 새 핸들러 추가 절차

**새 API는 기본적으로 `src/app/api/.../route.ts` + Neon으로 만든다.** MSW 핸들러는 아직 DB로 옮기지 않은 주문 영역의 mock을 넓힐 때만 추가한다(`.claude/rules/msw-rules.md`). 그 경우:

1. 해당 도메인 파일 `src/mocks/handlers/<domain>.ts`를 찾는다.
2. 그 파일의 export 배열에 `http.*` 핸들러를 추가한다. 고정 경로는 같은 prefix의 동적 경로보다 먼저 등록한다.
3. 로직이 단순 one-liner 이상이면 `src/mocks/utils/<verb><Domain>.ts`로 분리한다.

> 분리 당시(2026-06-22)에는 5번째 단계로 *"`route.ts` 생성 절대 금지 — MSW가 모든 API를 가로챈다"*가 있었다. 2026-09-24 기준 이 규칙은 뒤집혔다 — 주문 외 모든 API가 route handler다.

## Why This Matters

320줄 단일 파일의 실질적 문제:

- **탐색성**: 특정 라우트의 핸들러를 찾으려면 전체 파일을 스캔해야 한다.
- **병합 충돌**: 다른 도메인 기능을 작업하는 두 개발자가 같은 파일을 동시에 수정한다.
- **인지 부하**: 관련 없는 도메인 핸들러들이 읽기 흐름을 방해한다.
- **온보딩**: 어느 도메인이 mock 커버리지를 갖추고 있는지 한눈에 파악하기 어렵다.

도메인 분리는 `src/features/<domain>/` 피처 모듈 구조와 1:1로 대응되어 파일 위치가 예측 가능해진다.

`utils/` 디렉토리는 의도적으로 flat으로 유지했다. `handlers/` 레벨에서 이미 도메인 그룹핑이 해결되었고, `getOrders.ts`, `createProduct.ts` 같은 자기설명적 파일명 25개는 하위 디렉토리 없이도 탐색 가능하다.

## When to Apply

- 기존 도메인 핸들러 파일이 화면 한 페이지를 넘길 때
- 고정 경로와 동적 경로가 같은 prefix를 공유할 때 — 항상 등록 순서를 확인한다
- `browser.ts`는 수정 불필요 — `handlers.ts` index의 `handlers` 배열을 import하므로 내부 구조 변경의 영향을 받지 않는다 (서버용 `node.ts`는 2026-09-24 서버 MSW와 함께 삭제됐다)

## Examples

### Before: 단일 handlers.ts (320줄, 요약)

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const handlers = [
  http.post(`${baseUrl}/api/auth/login`, ...),
  http.post(`${baseUrl}/api/products/list`, ...),
  http.patch(`${baseUrl}/api/products/:id`, ...),
  http.post(`${baseUrl}/api/orders/list`, ...),
  http.patch(`${baseUrl}/api/orders/:orderId`, ...),
  // ... 300줄 이상 계속
];
```

### After: handlers.ts는 index, 도메인 파일이 핸들러 소유

```typescript
// src/mocks/handlers.ts — 12줄
export const handlers = [
  ...authHandlers,
  ...productHandlers,
  ...orderHandlers,
  // ...
];
```

```typescript
// src/mocks/handlers/products.ts — 상품 도메인 핸들러만
export const productHandlers = [
  http.post(`${baseUrl}/api/products/list`, ...),
  http.post(`${baseUrl}/api/products`, ...),
  http.patch(`${baseUrl}/api/products/:id`, ...),
  http.delete(`${baseUrl}/api/products/:id`, ...),
];
```

### 새 도메인은 MSW 파일이 아니라 route로 만든다

분리 당시에는 매입처 같은 새 도메인을 `handlers/purchaseAccounts.ts` 파일 추가 + 인덱스 spread 한 줄로 붙이는 예시를 들었다. 지금은 새 도메인을 MSW로 만들지 않는다 — `src/app/api/<domain>/.../route.ts`에 `requireSession`/`requirePermission`으로 시작하는 route handler를 만든다(`.claude/rules/msw-rules.md`, `[[api-route-session-auth-guard]]`).

## Related

- `docs/solutions/integration-issues/msw-patch-route-ordering-conflict.md` — 고정/동적 경로 충돌의 상세 작동 원리
- `docs/solutions/integration-issues/msw-request-body-empty-before-delay.md` — 핸들러 내부 async 타이밍 주의사항
