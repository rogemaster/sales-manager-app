# 단건 조회 Ownership 검증 설계

- 작성일: 2026-07-13
- 상태: 승인 대기
- 선행 문서: `docs/superpowers/specs/2026-07-12-order-products-home-ownerid-tenant-isolation-design.md` (이 작업의 "범위 외 — 다음 작업"에서 이월)
- 참고 메모리: `project_order_ownerid_gap`, `project_user_hierarchy_design`

## 배경 및 범위

지난 라운드(`feat/order-products-home-ownerid-tenant-isolation`, PR #23 병합 완료)에서 `Order`/`Product`/`CollectionJob`/`ShoppingAccount`/`ShoppingSetting`의 **목록 조회 + 생성** 엔드포인트에는 `ownerId` 테넌트 격리를 적용했다. 하지만 **단건 조회/수정 엔드포인트는 5개 도메인 모두 예외 없이 `ownerId` 검증이 전혀 없다** — 리소스의 `ownerId` 필드는 이미 존재하지만 아무도 확인하지 않는 상태다. 이번 라운드에서 5개 도메인의 단건 엔드포인트를 한 번에 처리해, 도메인별로 격리 수준이 들쭉날쭉해지는 걸 방지한다.

여기서 "소유자(테넌트)"란 `domain-design.md`에 정의된 슈퍼계정 단위를 말한다. 슈퍼계정은 `ownerId === id`, 종속 서브유저는 `ownerId`에 소속 슈퍼계정의 `id`를 저장하므로, 로그인 계정의 `workspaceOwnerId`(`ownerId ?? id`)가 곧 테넌트 식별자다. 같은 테넌트에 속한 슈퍼계정·서브유저는 서로의 리소스에 접근 가능해야 하고, 다른 테넌트의 리소스는 접근이 차단되어야 한다.

### 범위 내

| 도메인 | 엔드포인트 | 메서드 |
|---|---|---|
| Order | `/api/orders/:orderId` | GET, PATCH |
| Order | `/api/orders/:orderId/claim` | GET |
| Order | `/api/orders/:orderId/comments` | GET, POST |
| Order | `/api/orders/:orderId/history` | GET |
| Order/Collection | `/api/order/collection/trigger` | POST |
| Product | `/api/products/:productId` | GET, PATCH |
| ShoppingAccount | `/api/shopping/accounts/:id` | GET, PATCH |
| ShoppingSetting | `/api/shopping/settings/:id` | GET, PATCH |

### 범위 외

- **list/create 등 이미 병합된 엔드포인트를 헤더 방식으로 재작업하는 것.** 브레인스토밍 중 "ownerId 전송 방식을 API 전체에 통일해야 하지 않냐"는 논의가 있었고, 원칙적으로는 일리 있는 지적이지만 이미 3차례 PR로 병합·검증된 코드를 재작업하는 건 이번 작업 범위를 크게 벗어나는 별도 리팩터링으로 판단해 보류했다. 다음에 "list/create도 헤더로 통일하자"는 요청이 있으면 별도 라운드로 진행한다.
- **Option C(서버가 인증 세션에서 직접 ownerId를 추출)** — 이 프로젝트는 MSW가 API를 가로채는 구조라 핸들러가 NextAuth 세션에 접근할 수 없다. 이를 가능하게 하려면 대상 도메인을 전부 실제 `route.ts` + 실 DB 백엔드로 전환해야 하는데(현재 실제 DB는 `users` 테이블뿐), 이는 "mock 제거 + DB 마이그레이션" 규모의 별개 프로젝트다.

## 공통 원칙

**전송 방식:** 클라이언트는 `workspaceOwnerIdAtom` 값을 모든 단건 조회/수정/서브액션 요청에 `X-Owner-Id` 헤더로 실어 보낸다. GET(body 없음)과 PATCH(도메인 업데이트 payload를 오염시키고 싶지 않은 경우) 모두 동일한 방식으로 처리되어, 서버 쪽 검증 로직이 메서드에 상관없이 통일된다.

**검증 로직:** 신규 공통 유틸 `src/mocks/utils/verifyOwnership.ts`:

```ts
export const isOwnerMatch = (resourceOwnerId: string, requestOwnerId: string | null): boolean =>
  !!requestOwnerId && resourceOwnerId === requestOwnerId;
```

**실패 시 응답:** 불일치·리소스 없음 모두 `404`로 통일한다(403이 아닌 404를 쓰는 이유: 다른 테넌트 리소스의 존재 여부 자체를 노출하지 않기 위해 — 기존 `updateMockOrder`/`updateMockShoppingAccount` 등이 이미 "없으면 404" 컨벤션을 쓰고 있어 그대로 확장).

## 섹션 1. Order 도메인

### `orders/:orderId` (GET/PATCH)

```ts
// src/mocks/handlers/orders.ts
http.get(`${baseUrl}/api/orders/:orderId`, ({ params, request }) => {
  const { orderId } = params;
  const ownerId = request.headers.get('X-Owner-Id');
  const base = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
  if (!base || !isOwnerMatch(base.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
  const extras = MOCK_ORDER_DETAIL_EXTRAS[orderId as string] ?? {};
  return HttpResponse.json({ ...base, ...extras });
}),

http.patch(`${baseUrl}/api/orders/:orderId`, async ({ request, params }) => {
  await delay(300);
  const { orderId } = params;
  const ownerId = request.headers.get('X-Owner-Id');
  const base = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
  if (!base || !isOwnerMatch(base.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
  const update = (await request.json()) as Partial<OrderDetail>;
  const updated = updateMockOrder(orderId as string, update);
  return HttpResponse.json(updated);
}),
```

### `orders/:orderId/claim`, `/comments`, `/history` — 부모 order 기준 검증

지금은 order가 아예 없어도 404 없이 `null`/`[]`를 반환하는데, 이번에 **부모 order의 ownerId를 확인해 불일치·미존재 시 모두 404로 통일**한다(기존 관대한 동작을 대체).

```ts
// src/mocks/handlers/orders.ts
const findOwnedOrder = (orderId: string, ownerId: string | null) => {
  const order = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
  return order && isOwnerMatch(order.ownerId, ownerId) ? order : null;
};

http.get(`${baseUrl}/api/orders/:orderId/claim`, ({ params, request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(MOCK_ORDER_CLAIMS[params.orderId as string] ?? null);
}),

http.get(`${baseUrl}/api/orders/:orderId/comments`, ({ params, request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(MOCK_ORDER_COMMENTS[params.orderId as string] ?? []);
}),

http.post(`${baseUrl}/api/orders/:orderId/comments`, async ({ request, params }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
  const { content } = (await request.json()) as { content: string };
  return HttpResponse.json(addMockOrderComment(params.orderId as string, content));
}),

http.get(`${baseUrl}/api/orders/:orderId/history`, ({ params, request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(MOCK_ORDER_HISTORIES[params.orderId as string] ?? []);
}),
```

### 클라이언트 — api 함수에 `ownerId` 파라미터 추가

```ts
// src/features/order/api/getOrder.ts
export const getOrder = async (orderId: string, ownerId: string): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('주문 조회 실패');
  return response.json();
};
```

동일한 패턴을 `getOrderClaim`, `getOrderComments`, `getOrderHistory`, `updateOrder`, `createOrderComment`에 적용한다(전부 두 번째 인자로 `ownerId`를 받아 헤더에 싣는다).

### 호출부 — `OrderDetailLayout.tsx`

```tsx
const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

const { data: order } = useQuery({
  queryKey: ['order', orderId, workspaceOwnerId],
  queryFn: () => getOrder(orderId, workspaceOwnerId),
  enabled: !!workspaceOwnerId,
});
// claim/comments/history/updateOrder/createOrderComment 호출도 동일하게 workspaceOwnerId를 추가 인자로 전달
```

## 섹션 2. Order/Collection — `order/collection/trigger`

`jobIds` 배열 중 헤더의 `ownerId`가 소유한 job만 필터링해 트리거한다. 요청 자체를 거부하지 않고, 다른 테넌트 job은 조용히 무시한다(사용자 확정 사항).

```ts
// src/mocks/handlers/collection.ts
http.post(`${baseUrl}/api/order/collection/trigger`, async ({ request }) => {
  await delay(300);
  const ownerId = request.headers.get('X-Owner-Id');
  const { jobIds } = (await request.json()) as TriggerCollectionBody;
  const ownedJobIds = MOCK_COLLECTION_JOBS.filter(
    (job) => jobIds.includes(job.id) && isOwnerMatch(job.ownerId, ownerId),
  ).map((job) => job.id);
  const triggeredCount = triggerOrderCollectionMock(ownedJobIds);
  return HttpResponse.json({ success: true, triggeredCount });
}),
```

```ts
// src/features/order/api/triggerOrderCollection.ts
export async function triggerOrderCollection(jobIds: string[], ownerId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ jobIds }),
  });
  if (!response.ok) throw new Error('주문수집 실행 실패');
  return response.json();
}
```

```ts
// src/features/order/api/useTriggerOrderCollection.ts
export const useTriggerOrderCollection = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (jobIds: string[]) => triggerOrderCollection(jobIds, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_JOBS_QUERY_KEY] });
    },
  });
};
```

## 섹션 3. Product 도메인

```ts
// src/mocks/handlers/products.ts
http.get(`${baseUrl}/api/products/:productId`, ({ params, request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const data = MOCK_PRODUCT_DATA.find((item) => item.productId === params.productId);
  if (!data || !isOwnerMatch(data.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(data);
}),

http.patch(`${baseUrl}/api/products/:productId`, async ({ request, params }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const data = MOCK_PRODUCT_DATA.find((item) => item.productId === params.productId);
  if (!data || !isOwnerMatch(data.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
  const update = (await request.json()) as Product;
  const updated = updateMockProduct(params.productId as string, update);
  return HttpResponse.json(updated);
}),
```

`getProduct`/`updateProduct` api 함수에 `ownerId` 파라미터 추가, `ProductModifyLayout.tsx`에서 `workspaceOwnerIdAtom`을 읽어 전달.

## 섹션 4. ShoppingAccount / ShoppingSetting 도메인

두 도메인은 이미 `GET`/`PATCH` 핸들러가 404 컨벤션을 갖고 있으므로 그 위에 `isOwnerMatch` 체크만 추가한다.

```ts
// src/mocks/handlers/shoppingAccounts.ts
http.patch(`${baseUrl}/api/shopping/accounts/:id`, async ({ request, params }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const existing = getMockShoppingAccount(params.id as string);
  if (!existing || !isOwnerMatch(existing.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
  const body = (await request.json()) as UpdateShoppingAccountBody;
  const updated = updateMockShoppingAccount(params.id as string, body);
  return HttpResponse.json(updated);
}),

http.get(`${baseUrl}/api/shopping/accounts/:id`, ({ params, request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const account = getMockShoppingAccount(params.id as string);
  if (!account || !isOwnerMatch(account.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(account);
}),
```

`shopping/settings/:id`도 동일 패턴(`getMockShoppingSetting`/`updateMockShoppingSetting` 사용).

클라이언트: `getShoppingAccount`/`updateShoppingAccount`/`getShoppingSetting`/`updateShoppingSetting` api 함수에 `ownerId` 파라미터 추가. 호출부는 훅 레벨(`useGetShoppingAccount`, `useUpdateShoppingAccount`, `useGetShoppingSetting`, `useUpdateShoppingSetting`)에서 `workspaceOwnerIdAtom`을 읽어 전달 — 컴포넌트(`ShoppingAccountModifyLayout.tsx`, `ShoppingSettingModifyLayout.tsx`)는 변경 없음.

## 검증 전략 (Vitest)

`isOwnerMatch`는 순수 함수이므로 단위 테스트를 추가한다.

- `src/mocks/utils/verifyOwnership.test.ts` (신규): 일치 케이스, 불일치 케이스, `requestOwnerId`가 `null`인 케이스를 검증.

핸들러 자체(MSW)는 기존 프로젝트 컨벤션상(Vitest 커버리지는 `src/mocks/utils/`에 한정) 별도 테스트를 추가하지 않고 수동 확인한다.

## 검증/엣지케이스

- `enabled: !!workspaceOwnerId` 가드를 모든 신규/변경 훅에 유지해, `workspaceOwnerId`가 아직 로드되지 않은 시점에 헤더가 빈 문자열로 나가는 것을 방지한다.
- `orders/:orderId/claim`·`/comments`·`/history`는 기존에 "order 없음"을 404로 다루지 않던 동작을 이번에 404로 바꾸는 것이므로, 이 세 엔드포인트를 사용하는 화면에서 order 자체가 없는 케이스(잘못된 orderId 접근 등)의 에러 처리가 이미 되어 있는지 확인한다.
- `order/collection/trigger`는 `jobIds`가 전부 다른 테넌트 소유일 경우 `triggeredCount: 0`을 반환하며 정상 응답(200)한다 — 요청 자체는 실패시키지 않는다.

## 다음 작업 (범위 외)

- list/create 등 이미 병합된 엔드포인트의 `ownerId` 전송 방식을 헤더로 통일할지 여부 — 이번 라운드에서는 보류. 필요 시 별도 라운드로 논의.
