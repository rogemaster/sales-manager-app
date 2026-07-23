---
title: MSW handlers를 도메인별 파일로 분리하는 패턴
date: 2026-06-22
category: architecture-patterns
module: mocks
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - MSW handler file grows beyond ~100 lines
  - Adding a new domain to the mock API layer
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

### config.ts — 공유 baseUrl

```typescript
// src/mocks/config.ts
export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
```

모든 핸들러 파일은 이 파일에서 `baseUrl`을 import한다. 파일마다 직접 선언하지 않는다.

### handlers.ts — index only

```typescript
import { authHandlers } from './handlers/auth';
import { homeHandlers } from './handlers/home';
import { productHandlers } from './handlers/products';
import { orderHandlers } from './handlers/orders';
import { mallAccountHandlers } from './handlers/mallAccounts';
import { collectionHandlers } from './handlers/collection';
import { userHandlers } from './handlers/users';
import { profileHandlers } from './handlers/profile';
import { shoppingAccountHandlers } from './handlers/shoppingAccounts';

export const handlers = [
  ...authHandlers,
  ...homeHandlers,
  ...productHandlers,
  ...orderHandlers,
  ...mallAccountHandlers,
  ...collectionHandlers,
  ...userHandlers,
  ...profileHandlers,
  ...shoppingAccountHandlers,
];
```

핸들러 정의나 비즈니스 로직은 이 파일에 넣지 않는다.

### 도메인 핸들러 파일 패턴

```typescript
// src/mocks/handlers/orders.ts
import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { getOrders } from '../utils/getOrders';
import { updateMockOrder } from '../utils/updateOrder';

export const orderHandlers = [
  http.post(`${baseUrl}/api/orders/list`, async ({ request }) => {
    const body = await request.json();
    const result = getOrders(body);
    return HttpResponse.json(result);
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
// src/mocks/handlers/shoppingAccounts.ts
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

이 순서 규칙의 상세한 작동 원리는 [msw-patch-route-ordering-conflict.md](../integration-issues/msw-patch-route-ordering-conflict.md) 참고.

### 새 핸들러 추가 절차

1. 해당 도메인 파일 `src/mocks/handlers/<domain>.ts`를 찾는다.
2. 그 파일의 export 배열에 `http.*` 핸들러를 추가한다.
3. 새 도메인이면 `src/mocks/handlers/newDomain.ts`를 생성하고, `handlers.ts` 인덱스에 spread를 추가한다.
4. 로직이 단순 one-liner 이상이면 `src/mocks/utils/<verb><Domain>.ts`로 분리한다.
5. **절대 금지:** `src/app/api/*/route.ts` 파일 생성 — MSW가 개발 환경의 모든 API 요청을 가로채므로 Next.js route handler 파일은 필요 없다.

## Why This Matters

320줄 단일 파일의 실질적 문제:

- **탐색성**: 특정 라우트의 핸들러를 찾으려면 전체 파일을 스캔해야 한다.
- **병합 충돌**: 다른 도메인 기능을 작업하는 두 개발자가 같은 파일을 동시에 수정한다.
- **인지 부하**: 관련 없는 도메인 핸들러들이 읽기 흐름을 방해한다.
- **온보딩**: 어느 도메인이 mock 커버리지를 갖추고 있는지 한눈에 파악하기 어렵다.

도메인 분리는 `src/features/<domain>/` 피처 모듈 구조와 1:1로 대응되어 파일 위치가 예측 가능해진다.

`utils/` 디렉토리는 의도적으로 flat으로 유지했다. `handlers/` 레벨에서 이미 도메인 그룹핑이 해결되었고, `getOrders.ts`, `createProduct.ts` 같은 자기설명적 파일명 25개는 하위 디렉토리 없이도 탐색 가능하다.

## When to Apply

- 새 도메인이 추가될 때 (새 피처 모듈, 새 API 라우트 집합)
- 기존 도메인 핸들러 파일이 화면 한 페이지를 넘길 때
- 고정 경로와 동적 경로가 같은 prefix를 공유할 때 — 항상 등록 순서를 확인한다
- `browser.ts`와 `node.ts`는 수정 불필요 — 이들은 `handlers.ts` index의 `handlers` 배열을 import하므로 내부 구조 변경의 영향을 받지 않는다

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

### 새 도메인 추가 예시

```typescript
// src/mocks/handlers/purchaseAccounts.ts (새 파일)
import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { getPurchaseAccounts } from '../utils/getPurchaseAccounts';

export const purchaseAccountHandlers = [
  http.post(`${baseUrl}/api/purchase/accounts/list`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(getPurchaseAccounts(body));
  }),
];
```

```typescript
// src/mocks/handlers.ts에 한 줄 추가
import { purchaseAccountHandlers } from './handlers/purchaseAccounts';

export const handlers = [
  // ...기존 핸들러들...
  ...purchaseAccountHandlers,
];
```

## Related

- [msw-patch-route-ordering-conflict.md](../integration-issues/msw-patch-route-ordering-conflict.md) — 고정/동적 경로 충돌의 상세 작동 원리
- [msw-request-body-empty-before-delay.md](../integration-issues/msw-request-body-empty-before-delay.md) — 핸들러 내부 async 타이밍 주의사항
