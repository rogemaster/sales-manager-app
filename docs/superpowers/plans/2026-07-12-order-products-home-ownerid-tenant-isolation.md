# Order/Products/Home ownerId 테넌트 격리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `order`/`collection`/`products`/`home` 도메인의 목록 조회·생성 API에 `ownerId` 테넌트 격리를 배선해, `ShoppingAccount`/`ShoppingSetting`과 동일한 수준으로 슈퍼계정 간 데이터가 섞이지 않도록 한다.

**Architecture:** `ShoppingAccount`가 이미 쓰는 `getXxx(ownerId, filters, ...)` / `createXxx(body, ownerId)` 패턴을 그대로 복제한다. `Order`/`CollectionJob`/`Product` 타입에 `ownerId: string`을 추가하고, mock 데이터는 기존 리터럴 배열을 그대로 둔 채 export 시점에 `.map()`으로 `ownerId`를 주입한다. `home` 대시보드는 `order`/`products`를 그대로 집계하므로 마지막에 처리한다.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Jotai, TanStack Query, MSW, Vitest.

**선행 문서:** `docs/superpowers/specs/2026-07-12-order-products-home-ownerid-tenant-isolation-design.md`

## Global Constraints

- 커밋은 사용자가 명시적으로 요청한 경우에만 실제로 실행한다 (CLAUDE.md Git/PR 규칙). 각 Task의 "커밋" 스텝은 안내용이며, 실행 주체는 자동으로 실행하지 않는다.
- 테스트 커버리지는 `src/mocks/utils/`(순수 비즈니스 로직)에만 존재하는 프로젝트 컨벤션이다. UI 컴포넌트, React Query 훅, fetch API 함수는 테스트 파일을 만들지 않는다.
- 새 API 추가 시 `src/app/api/.../route.ts` 파일을 생성하지 않는다 — MSW 핸들러(`src/mocks/handlers/*.ts`)에만 추가한다.
- `home/stats`, `home/recent-products`는 `GET`에서 `POST`로 전환한다 (msw-rules: "필터 조건을 body로 전달하는 조회는 POST").
- 범위는 목록 조회 + 생성(단건/대량)만. 단건 조회(`:orderId`, `:productId` 등)·수정·댓글·이력·`collection/trigger`는 이번 계획에서 변경하지 않는다.
- Prettier: `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`.
- Task 순서를 지킨다 — Task 4(home)는 Task 1(order)의 `Order.ownerId`와 Task 3(products)의 `Product.ownerId`에 의존한다. Task 5(엑셀)는 Task 1의 `bulkCreateOrders(data, ownerId)`와 Task 3의 `bulkCreateProducts(data, ownerId)` 시그니처에 의존한다.
- **Task 1 실행 중 발견 및 반영된 수정:** `orderExcelSaveStrategy`/`productExcelSaveStrategy`가 각각 `Order[]`/`Product[]`를 반환하도록 선언돼 있어, `ownerId`가 필수 필드가 되는 순간 반환 타입 불일치로 빌드가 깨진다. 해결책: `bulkCreateOrders`/`bulkCreateProducts`의 데이터 파라미터 타입을 `Order[]`/`Product[]`가 아니라 `Omit<Order, 'ownerId'>[]`/`Omit<Product, 'ownerId'>[]`로 설계한다 — `ownerId`는 이미 별도 인자로 받으므로 각 객체 안에 다시 요구할 필요가 없다(더 정확한 설계). Task 1에서 `bulkCreateOrders`와 `orderExcelSaveStrategy`의 반환 타입을 함께 고쳤다(아래 Task 1 Step 8 참고). Task 3도 동일하게 `bulkCreateProducts`/`productExcelSaveStrategy`를 함께 고친다.
- **알려진 전이 상태:** Task 1 완료~Task 5 완료 전까지 `npm run build`는 `src/components/excel/utils/getExcelSaveStrategy.ts:19`에서 `Expected 2 arguments, but got 1`(주문 분기) 에러로 실패하는 게 정상이다 — `getExcelSaveStrategy`에 `ownerId` 파라미터를 추가하는 건 Task 5의 몫이기 때문. Task 3 완료 후에는 상품 분기에서도 동일한 에러가 추가된다. Task 1~4의 빌드 검증 스텝은 **이 특정 에러만** 있고 다른 에러가 없는지 확인하는 방식으로 진행한다. Task 5 완료 후에는 `npm run build`가 완전히 클린해야 한다.

---

### Task 1: `order` 도메인 — `Order.ownerId` 추가 + `orders/list`·`orders/bulk` 배선

**Files:**
- Modify: `src/features/order/types/order.types.ts`
- Modify: `src/mocks/data/MockOrdersData.ts`
- Modify: `src/mocks/utils/getOrders.ts`
- Modify: `src/mocks/utils/getOrders.test.ts`
- Modify: `src/mocks/handlers/orders.ts`
- Modify: `src/features/order/api/getOrders.ts`
- Modify: `src/features/order/api/useGetOrders.ts`
- Modify: `src/features/order/api/bulkCreateOrders.ts`
- Modify: `src/components/excel/strategies/orderExcelSaveStrategy.ts`

**Interfaces:**
- Consumes: `workspaceOwnerIdAtom`(`@/features/auth/store/auth.store`, `atom<string>`)
- Produces: `Order.ownerId: string`, `getMockOrders(ownerId: string, filters: OrderSearchType, page: number, pageSize: number)`, `getOrders(ownerId: string, filters: OrderSearchType, page: number, pageSize?: number)`, `bulkCreateOrders(data: Omit<Order, 'ownerId'>[], ownerId: string)` — Task 5가 `bulkCreateOrders`의 이 시그니처를 사용

- [ ] **Step 1: `Order` 타입에 `ownerId` 추가**

`src/features/order/types/order.types.ts`에서 `Order` 인터페이스의 마지막 필드(`invoiceNumber?: string;`) 다음 줄에 추가:

```ts
export interface Order {
  orderNumber: string;
  shopOrderNumber: string;
  orderStatus: OrderStatusTypes;
  paymentDate: string;
  orderCollectionDate: string;
  shoppingMallName: ShoppingMalls;
  shoppingMallId: string;
  shopProductId: string;
  orderProductName: string;
  orderPrice: number;
  orderTotalQuantity: number;
  orderOption?: string;
  orderSubOption?: string;
  orderSubTotalQuantity?: string;
  orderDeliveryType: DeliveryTypeId;
  orderDeliveryPrice: number;
  orderName: string;
  payeeName: string;
  orderPhoneNumber: string;
  payeePhoneNumber: string;
  orderZipCode: string;
  orderAddress: string;
  payeeZipCode: string;
  payeeAddress: string;
  deliveryMessage?: string;
  deliveryCompany?: string;   // 택배사
  invoiceNumber?: string;     // 송장번호
  ownerId: string;
}
```

- [ ] **Step 2: `MockOrdersData.ts`에 `ownerId` 일괄 주입**

`src/mocks/data/MockOrdersData.ts`의 첫 4줄:

```ts
import { Order } from '@/features/order/types/order.types';

// 샘플 주문 데이터 (날짜: 2026-01-01 ~ 2026-05-17, 약 5일 간격으로 균등 배분)
export const MOCK_ORDERS_DATA: Order[] = [
```

다음으로 교체 (이하 기존 리터럴 객체 배열 내용은 그대로 유지, 첫 줄만 변경):

```ts
import { Order } from '@/features/order/types/order.types';

const SUPER_A_ID = 'usr_2f20748f';

// 샘플 주문 데이터 (날짜: 2026-01-01 ~ 2026-05-17, 약 5일 간격으로 균등 배분)
const RAW_ORDERS: Omit<Order, 'ownerId'>[] = [
```

파일의 마지막 줄:

```ts
];
```

다음으로 교체:

```ts
];

export const MOCK_ORDERS_DATA: Order[] = RAW_ORDERS.map((o) => ({ ...o, ownerId: SUPER_A_ID }));
```

- [ ] **Step 3: 기존 테스트에 `ownerId` 필터 케이스 추가 (RED)**

`src/mocks/utils/getOrders.test.ts`의 `vi.hoisted` 블록 내부 `ORDERS` 배열 정의를 찾아, 각 `makeOrder` 호출에 `ownerId`를 추가하고 새 테스트를 추가한다.

`makeOrder` 기본 객체(`vi.hoisted` 내부)에 `ownerId: 'owner-1'` 필드를 추가:

```ts
const { ORDERS } = vi.hoisted(() => {
  const makeOrder = (overrides: Partial<Order>): Order => ({
    orderNumber: 'ORD-001',
    shopOrderNumber: 'SHOP-001',
    orderStatus: 'NEW_ORDER',
    paymentDate: '2024-01-15',
    orderCollectionDate: '2024-01-15',
    shoppingMallName: 'COUP',
    shoppingMallId: 'mall-1',
    shopProductId: 'prod-1',
    orderProductName: '나이키 운동화',
    orderPrice: 100000,
    orderTotalQuantity: 1,
    orderDeliveryType: 'FREE',
    orderDeliveryPrice: 0,
    orderName: '홍길동',
    payeeName: '홍길동',
    orderPhoneNumber: '010-1234-5678',
    payeePhoneNumber: '010-1234-5678',
    orderZipCode: '12345',
    orderAddress: '서울시 강남구',
    payeeZipCode: '12345',
    payeeAddress: '서울시 강남구',
    ownerId: 'owner-1',
    ...overrides,
  });

  return {
    ORDERS: [
      makeOrder({ orderNumber: 'ORD-001', shoppingMallName: 'COUP', shoppingMallId: 'mall-1', orderStatus: 'NEW_ORDER', paymentDate: '2024-01-15', orderName: '홍길동', orderProductName: '나이키 운동화' }),
      makeOrder({ orderNumber: 'ORD-002', shoppingMallName: 'NSST', shoppingMallId: 'mall-2', orderStatus: 'CONFIRMED_ORDER', paymentDate: '2024-01-20', orderName: '김철수', orderProductName: '아디다스 슬리퍼' }),
      makeOrder({ orderNumber: 'ORD-003', shoppingMallName: 'COUP', shoppingMallId: 'mall-1', orderStatus: 'INVOICE_REGISTER', paymentDate: '2024-02-01', orderName: '이영희', orderProductName: '뉴발란스 운동화' }),
      makeOrder({ orderNumber: 'ORD-004', ownerId: 'owner-2', shoppingMallName: 'COUP', shoppingMallId: 'mall-1', orderStatus: 'NEW_ORDER', paymentDate: '2024-01-15', orderName: '박민수', orderProductName: '타 owner 주문' }),
    ],
  };
});
```

`defaultFilters`는 그대로 두고(변경 없음), `getMockOrders` 호출부에 `ownerId` 인자를 추가한다 — 파일 내 모든 `getMockOrders(...)` 호출을 `getMockOrders('owner-1', ...)`로 변경. 예:

```ts
describe('getMockOrders', () => {
  describe('필터 없음', () => {
    it('아무 필터도 없으면 전체 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 10);
      expect(result.total).toBe(3);
      expect(result.orders).toHaveLength(3);
    });
  });
  // ... 이하 파일 내 모든 getMockOrders(defaultFilters, ...) 호출을 getMockOrders('owner-1', defaultFilters, ...) 형태로 동일하게 변경
```

`describe('필터 없음', ...)` 블록 바로 다음에 새 `describe` 블록을 추가:

```ts
  describe('owner 필터', () => {
    it('ownerId가 다른 주문은 제외한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 10);
      expect(result.orders.find((o) => o.orderNumber === 'ORD-004')).toBeUndefined();
    });

    it('존재하지 않는 ownerId면 빈 배열을 반환한다', () => {
      const result = getMockOrders('owner-999', defaultFilters, 1, 10);
      expect(result.total).toBe(0);
    });
  });
```

- [ ] **Step 4: 테스트 실행 → 실패 확인**

Run: `npm run test -- getOrders`
Expected: FAIL — `getMockOrders`가 아직 `ownerId` 파라미터를 받지 않아 타입 에러 또는 `owner-2` 데이터가 필터링되지 않아 `total`이 기대값과 불일치

- [ ] **Step 5: `getOrders.ts` mock util에 `ownerId` 필터 구현**

`src/mocks/utils/getOrders.ts`에서 `export const getMockOrders = (filters: OrderSearchType, page: number, pageSize: number) => {` 로 시작하는 블록을:

```ts
export const getMockOrders = (filters: OrderSearchType, page: number, pageSize: number) => {
  const { dateType, startDate, endDate, shoppingMall, mallId, orderStatus, searchType, searchValue } = filters;

  const byDate = filterByDate(dateType, startDate, endDate, MOCK_ORDERS_DATA);
  const byMall = filterByShoppingMall(shoppingMall, byDate);
  const byAccountId = filterByMallId(mallId, byMall);
  const byStatus = filterByOrderStatus(orderStatus, byAccountId);
  const filtered = filterBySearchValue(searchType, searchValue, byStatus);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const orders = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { orders, total, page, pageSize, totalPages };
};
```

다음으로 교체:

```ts
export const getMockOrders = (ownerId: string, filters: OrderSearchType, page: number, pageSize: number) => {
  const { dateType, startDate, endDate, shoppingMall, mallId, orderStatus, searchType, searchValue } = filters;

  const byOwner = MOCK_ORDERS_DATA.filter((o) => o.ownerId === ownerId);
  const byDate = filterByDate(dateType, startDate, endDate, byOwner);
  const byMall = filterByShoppingMall(shoppingMall, byDate);
  const byAccountId = filterByMallId(mallId, byMall);
  const byStatus = filterByOrderStatus(orderStatus, byAccountId);
  const filtered = filterBySearchValue(searchType, searchValue, byStatus);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const orders = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { orders, total, page, pageSize, totalPages };
};
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `npm run test -- getOrders`
Expected: PASS (전체)

- [ ] **Step 7: `orders/list`, `orders/bulk` MSW 핸들러에 `ownerId` 배선**

`src/mocks/handlers/orders.ts`에서:

```ts
  http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
    await delay(500);
    const data = (await request.json()) as Order[];
    MOCK_ORDERS_DATA.push(...data);
    return HttpResponse.json({ success: true, count: data.length });
  }),

  http.post(`${baseUrl}/api/orders/list`, async ({ request }) => {
    await delay(300);
    const { filters, page, pageSize } = (await request.json()) as {
      filters: OrderSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockOrders(filters, page, pageSize));
  }),
```

다음으로 교체:

```ts
  http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
    await delay(500);
    const { ownerId, orders } = (await request.json()) as { ownerId: string; orders: Omit<Order, 'ownerId'>[] };
    MOCK_ORDERS_DATA.push(...orders.map((o) => ({ ...o, ownerId })));
    return HttpResponse.json({ success: true, count: orders.length });
  }),

  http.post(`${baseUrl}/api/orders/list`, async ({ request }) => {
    await delay(300);
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: OrderSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockOrders(ownerId, filters, page, pageSize));
  }),
```

- [ ] **Step 8: 클라이언트 API 함수 + 훅에 `ownerId` 배선**

`src/features/order/api/getOrders.ts` 전체를 다음으로 교체:

```ts
import { Order, OrderSearchType } from '../types/order.types';

export interface GetOrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getOrders = async (ownerId: string, filters: OrderSearchType, page: number, pageSize: number = 20) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, filters, page, pageSize }),
  });

  if (!response.ok) throw new Error('주문 목록 조회 실패');

  return response.json() as Promise<GetOrdersResponse>;
};
```

`src/features/order/api/useGetOrders.ts` 전체를 다음으로 교체:

```ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getOrders } from './getOrders';

export const ORDER_LIST_QUERY_KEY = 'orderList';

export const useGetOrders = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [ORDER_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getOrders(workspaceOwnerId, filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
```

`src/features/order/api/bulkCreateOrders.ts` 전체를 다음으로 교체:

```ts
import { Order } from '../types/order.types';

export const bulkCreateOrders = async (data: Omit<Order, 'ownerId'>[], ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, orders: data }),
  });

  if (!response.ok) throw new Error('주문 대량 등록 실패');

  return response.json() as Promise<{ success: boolean; count: number }>;
};
```

- [ ] **Step 9: `orderExcelSaveStrategy.ts` 반환 타입을 `bulkCreateOrders`의 새 시그니처에 맞춤**

`Order.ownerId`가 필수 필드가 되면서, 엑셀 행을 `Order[]`로 매핑하던 `orderExcelSaveStrategy`의 반환 타입 선언이 깨진다. 필드 매핑 로직 자체는 건드리지 않고 반환 타입 선언만 고친다.

`src/components/excel/strategies/orderExcelSaveStrategy.ts`에서:

```ts
export const orderExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Order[] => {
```

다음으로 교체 (이하 함수 본문은 완전히 그대로 유지):

```ts
export const orderExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Omit<Order, 'ownerId'>[] => {
```

- [ ] **Step 10: 빌드 확인 (알려진 전이 상태 — Global Constraints 참고)**

Run: `npm run build`
Expected: `src/components/excel/utils/getExcelSaveStrategy.ts:19`에서 `Expected 2 arguments, but got 1` **한 건만** 에러로 남고 다른 에러는 없어야 한다 (이 파일에 `ownerId` 파라미터를 추가하는 건 Task 5의 몫). 이 특정 에러 외에 다른 컴파일 에러가 있다면 이번 Task의 실수이니 확인이 필요하다.

- [ ] **Step 11: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add src/features/order/types/order.types.ts src/mocks/data/MockOrdersData.ts \
        src/components/excel/strategies/orderExcelSaveStrategy.ts \
        src/mocks/utils/getOrders.ts src/mocks/utils/getOrders.test.ts \
        src/mocks/handlers/orders.ts src/features/order/api/getOrders.ts \
        src/features/order/api/useGetOrders.ts src/features/order/api/bulkCreateOrders.ts
git commit -m "feat: order 도메인 목록/대량등록에 ownerId 테넌트 격리 추가"
```

---

### Task 2: `collection` 도메인 — `CollectionJob.ownerId` 추가 + `order/collection/jobs` 배선

**Files:**
- Modify: `src/features/order/types/collection.types.ts`
- Modify: `src/mocks/data/MockCollectionJobsData.ts`
- Modify: `src/mocks/utils/getCollectionJobs.ts`
- Create: `src/mocks/utils/getCollectionJobs.test.ts`
- Modify: `src/mocks/handlers/collection.ts`
- Modify: `src/features/order/api/getCollectionJobs.ts`
- Modify: `src/features/order/api/useGetCollectionJobs.ts`

**Interfaces:**
- Consumes: `workspaceOwnerIdAtom`
- Produces: `CollectionJob.ownerId: string`, `getCollectionJobsMock(ownerId: string, params: CollectionSearchParams)`, `getCollectionJobs(ownerId: string, params: CollectionSearchParams)`

- [ ] **Step 1: `CollectionJob` 타입에 `ownerId` 추가**

`src/features/order/types/collection.types.ts` 전체를 다음으로 교체:

```ts
// src/features/order/types/collection.types.ts
import { ShoppingMalls } from '@/types/common.type';

export type CollectionStatus = 'WAITING' | 'COLLECTING' | 'COMPLETED' | 'FAILED';

export interface CollectionJob {
  id: string;
  mallName: ShoppingMalls;
  mallId: string;
  status: CollectionStatus;
  lastCollectedAt: string | null;
  totalCount?: number;
  collectedCount?: number;
  ownerId: string;
}

export interface CollectionSearchParams {
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  mallId: string;
}

export interface TriggerCollectionBody {
  jobIds: string[];
}
```

- [ ] **Step 2: `MockCollectionJobsData.ts`에 `ownerId` 일괄 주입**

`src/mocks/data/MockCollectionJobsData.ts` 전체를 다음으로 교체:

```ts
// src/mocks/data/MockCollectionJobsData.ts
import { CollectionJob } from '@/features/order/types/collection.types';

const SUPER_A_ID = 'usr_2f20748f';

const RAW_COLLECTION_JOBS: Omit<CollectionJob, 'ownerId'>[] = [
  {
    id: 'JOB-001',
    mallName: 'COUP',
    mallId: 'coupang_seller1',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-25 09:00:00',
    totalCount: 150,
    collectedCount: 150,
  },
  {
    id: 'JOB-002',
    mallName: 'GMK',
    mallId: 'gadmin1111',
    status: 'WAITING',
    lastCollectedAt: null,
  },
  {
    id: 'JOB-003',
    mallName: 'NSST',
    mallId: 'naver_store1',
    status: 'FAILED',
    lastCollectedAt: '2026-05-24 15:30:00',
    totalCount: 200,
    collectedCount: 87,
  },
  {
    id: 'JOB-004',
    mallName: 'AUC',
    mallId: 'auction_admin1',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-25 08:00:00',
    totalCount: 300,
    collectedCount: 300,
  },
  {
    id: 'JOB-005',
    mallName: '11ST',
    mallId: 'elevenst_shop1',
    status: 'WAITING',
    lastCollectedAt: null,
  },
  {
    id: 'JOB-006',
    mallName: 'INTP',
    mallId: 'ipark_seller',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-23 11:00:00',
    totalCount: 80,
    collectedCount: 80,
  },
];

export const MOCK_COLLECTION_JOBS: CollectionJob[] = RAW_COLLECTION_JOBS.map((j) => ({ ...j, ownerId: SUPER_A_ID }));
```

- [ ] **Step 3: 신규 실패 테스트 작성**

`src/mocks/utils/getCollectionJobs.test.ts` 생성:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { CollectionJob } from '@/features/order/types/collection.types';

const makeJob = (overrides: Partial<CollectionJob>): CollectionJob => ({
  id: 'JOB-001',
  mallName: 'COUP',
  mallId: 'coupang_seller1',
  status: 'WAITING',
  lastCollectedAt: null,
  ownerId: 'owner-1',
  ...overrides,
});

const { JOBS } = vi.hoisted(() => ({ JOBS: [] as CollectionJob[] }));
vi.mock('../data/MockCollectionJobsData', () => ({ MOCK_COLLECTION_JOBS: JOBS }));

JOBS.push(
  makeJob({ id: 'JOB-001', ownerId: 'owner-1', mallName: 'COUP' }),
  makeJob({ id: 'JOB-002', ownerId: 'owner-1', mallName: 'NSST' }),
  makeJob({ id: 'JOB-003', ownerId: 'owner-2', mallName: 'COUP' }),
);

import { getCollectionJobsMock } from './getCollectionJobs';

const defaultParams = { startDate: '', endDate: '', mallCode: 'ALL' as const, mallId: 'ALL' };

describe('getCollectionJobsMock', () => {
  it('ownerId가 일치하는 작업만 반환한다', () => {
    const result = getCollectionJobsMock('owner-1', defaultParams);
    expect(result).toHaveLength(2);
    expect(result.find((j) => j.id === 'JOB-003')).toBeUndefined();
  });

  it('존재하지 않는 ownerId면 빈 배열을 반환한다', () => {
    const result = getCollectionJobsMock('owner-999', defaultParams);
    expect(result).toHaveLength(0);
  });

  it('ownerId와 mallCode 필터를 함께 적용한다', () => {
    const result = getCollectionJobsMock('owner-1', { ...defaultParams, mallCode: 'COUP' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('JOB-001');
  });
});
```

- [ ] **Step 4: 테스트 실행 → 실패 확인**

Run: `npm run test -- getCollectionJobs`
Expected: FAIL — `getCollectionJobsMock`가 아직 `ownerId` 파라미터를 받지 않음(타입 에러 또는 `owner-2` 데이터 포함으로 인한 길이 불일치)

- [ ] **Step 5: `getCollectionJobs.ts` mock util에 `ownerId` 필터 구현**

`src/mocks/utils/getCollectionJobs.ts`에서 `export function getCollectionJobsMock(params: CollectionSearchParams): CollectionJob[] {` 로 시작하는 함수 시그니처와 마지막 `return` 블록을:

```ts
export function getCollectionJobsMock(params: CollectionSearchParams): CollectionJob[] {
  const progressMap = getCollectionProgressMap();
  const now = Date.now();

  MOCK_COLLECTION_JOBS.forEach((job) => {
    const startTime = progressMap[job.id];
    if (job.status === 'COLLECTING' && startTime !== undefined) {
      const progress = Math.min((now - startTime) / COLLECTION_DURATION_MS, 1);
      job.collectedCount = Math.floor(progress * (job.totalCount ?? 100));
      if (progress >= 1) {
        job.status = 'COMPLETED';
        job.lastCollectedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
        delete progressMap[job.id];
      }
    }
  });

  return MOCK_COLLECTION_JOBS.filter((job) => {
    if (params.mallCode !== 'ALL' && job.mallName !== params.mallCode) return false;
    if (params.mallId !== 'ALL' && job.mallId !== params.mallId) return false;
    return true;
  });
}
```

다음으로 교체:

```ts
export function getCollectionJobsMock(ownerId: string, params: CollectionSearchParams): CollectionJob[] {
  const progressMap = getCollectionProgressMap();
  const now = Date.now();

  MOCK_COLLECTION_JOBS.forEach((job) => {
    const startTime = progressMap[job.id];
    if (job.status === 'COLLECTING' && startTime !== undefined) {
      const progress = Math.min((now - startTime) / COLLECTION_DURATION_MS, 1);
      job.collectedCount = Math.floor(progress * (job.totalCount ?? 100));
      if (progress >= 1) {
        job.status = 'COMPLETED';
        job.lastCollectedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
        delete progressMap[job.id];
      }
    }
  });

  return MOCK_COLLECTION_JOBS.filter((job) => {
    if (job.ownerId !== ownerId) return false;
    if (params.mallCode !== 'ALL' && job.mallName !== params.mallCode) return false;
    if (params.mallId !== 'ALL' && job.mallId !== params.mallId) return false;
    return true;
  });
}
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `npm run test -- getCollectionJobs`
Expected: PASS (3개 전부)

- [ ] **Step 7: MSW 핸들러에 `ownerId` 쿼리파라미터 배선**

`src/mocks/handlers/collection.ts`에서:

```ts
  http.get(`${baseUrl}/api/order/collection/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const params: CollectionSearchParams = {
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
      mallCode: (url.searchParams.get('mallCode') ?? 'ALL') as ShoppingMalls | 'ALL',
      mallId: url.searchParams.get('mallId') ?? 'ALL',
    };
    return HttpResponse.json(getCollectionJobsMock(params));
  }),
```

다음으로 교체:

```ts
  http.get(`${baseUrl}/api/order/collection/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const ownerId = url.searchParams.get('ownerId') ?? '';
    const params: CollectionSearchParams = {
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
      mallCode: (url.searchParams.get('mallCode') ?? 'ALL') as ShoppingMalls | 'ALL',
      mallId: url.searchParams.get('mallId') ?? 'ALL',
    };
    return HttpResponse.json(getCollectionJobsMock(ownerId, params));
  }),
```

- [ ] **Step 8: 클라이언트 API 함수 + 훅에 `ownerId` 배선**

`src/features/order/api/getCollectionJobs.ts` 전체를 다음으로 교체:

```ts
// src/features/order/api/getCollectionJobs.ts
import { CollectionJob, CollectionSearchParams } from '../types/collection.types';

export async function getCollectionJobs(ownerId: string, params: CollectionSearchParams): Promise<CollectionJob[]> {
  const query = new URLSearchParams({
    ownerId,
    startDate: params.startDate,
    endDate: params.endDate,
    mallCode: params.mallCode,
    mallId: params.mallId,
  });
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/jobs?${query}`);
  if (!response.ok) throw new Error('수집 작업 목록 조회 실패');
  return response.json();
}
```

`src/features/order/api/useGetCollectionJobs.ts` 전체를 다음으로 교체:

```ts
// src/features/order/api/useGetCollectionJobs.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { collectSearchParamsAtom } from '../store/collect.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getCollectionJobs } from './getCollectionJobs';
import { CollectionJob } from '../types/collection.types';

export const COLLECTION_JOBS_QUERY_KEY = 'collectionJobs';

export const useGetCollectionJobs = () => {
  const searchParams = useAtomValue(collectSearchParamsAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [COLLECTION_JOBS_QUERY_KEY, workspaceOwnerId, searchParams],
    queryFn: () => getCollectionJobs(workspaceOwnerId, searchParams),
    enabled: !!workspaceOwnerId,
    refetchInterval: (query) => {
      const jobs: CollectionJob[] = query.state.data ?? [];
      return jobs.some((job) => job.status === 'COLLECTING') ? 2000 : false;
    },
  });
};
```

- [ ] **Step 9: 빌드 확인**

Run: `npm run build`
Expected: 컴파일 성공

- [ ] **Step 10: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add src/features/order/types/collection.types.ts src/mocks/data/MockCollectionJobsData.ts \
        src/mocks/utils/getCollectionJobs.ts src/mocks/utils/getCollectionJobs.test.ts \
        src/mocks/handlers/collection.ts src/features/order/api/getCollectionJobs.ts \
        src/features/order/api/useGetCollectionJobs.ts
git commit -m "feat: collection 도메인 작업 목록 조회에 ownerId 테넌트 격리 추가"
```

---

### Task 3: `products` 도메인 — `Product.ownerId` 추가 + `list`·`create`·`bulk` 배선

**Files:**
- Modify: `src/features/products/types/product.types.ts`
- Modify: `src/mocks/data/MockProductsData.ts`
- Modify: `src/mocks/utils/getProducts.ts`
- Create: `src/mocks/utils/getProducts.test.ts`
- Modify: `src/mocks/handlers/products.ts`
- Modify: `src/features/products/api/getProducts.ts`
- Modify: `src/features/products/api/createProduct.ts`
- Modify: `src/features/products/api/bulkCreateProducts.ts`
- Modify: `src/features/products/ui/list/ProductListLayout.tsx`
- Modify: `src/features/products/ui/create/ProductCreateLayout.tsx`
- Modify: `src/components/excel/strategies/productExcelSaveStrategy.ts`

**Interfaces:**
- Consumes: `workspaceOwnerIdAtom`
- Produces: `Product.ownerId: string`, `getMockProducts(ownerId: string, searchParams: ProductSearch)`, `getProducts(ownerId: string, data: ProductSearch)`, `createProduct(data: CreateProductRequest, ownerId: string)`, `bulkCreateProducts(data: Omit<Product, 'ownerId'>[], ownerId: string)` — Task 5가 `bulkCreateProducts`의 이 시그니처를 사용. Task 1과 동일한 이유로 `Product[]`가 아니라 `Omit<Product, 'ownerId'>[]`를 쓴다(Global Constraints 참고).

- [ ] **Step 1: `Product` 타입에 `ownerId` 추가**

`src/features/products/types/product.types.ts`에서:

```ts
export interface Product {
  productId: string;
  customerCode?: string;
  name: string;
  categoryId: string;
  netPrice?: number;
  price: number;
  state: ProductStateType;
  deliveryType: string;
  deliveryPrice: number;
  mainImage: string | File;
  detailPage: string;
  option?: OptionCombination[];
  totalQuantity: number;
  subOption?: OptionCombination[];
  keyWords?: string[];
  createDate: Date;
  updateDate: Date;
  informationDisclosure: ProductInformationDisclosure;
}
```

다음으로 교체:

```ts
export interface Product {
  productId: string;
  customerCode?: string;
  name: string;
  categoryId: string;
  netPrice?: number;
  price: number;
  state: ProductStateType;
  deliveryType: string;
  deliveryPrice: number;
  mainImage: string | File;
  detailPage: string;
  option?: OptionCombination[];
  totalQuantity: number;
  subOption?: OptionCombination[];
  keyWords?: string[];
  createDate: Date;
  updateDate: Date;
  informationDisclosure: ProductInformationDisclosure;
  ownerId: string;
}
```

같은 파일에서:

```ts
export type CreateProductRequest = Omit<Product, 'productId' | 'createDate' | 'updateDate'>;
```

다음으로 교체:

```ts
export type CreateProductRequest = Omit<Product, 'productId' | 'ownerId' | 'createDate' | 'updateDate'>;
```

- [ ] **Step 2: `MockProductsData.ts`에 `ownerId` 일괄 주입**

`src/mocks/data/MockProductsData.ts`의 첫 4줄:

```ts
import { Product } from '@/features/products/types/product.types';
import { faker, fakerKO } from '@faker-js/faker';

export const MOCK_PRODUCT_DATA: Product[] = [
```

다음으로 교체 (이하 기존 리터럴 객체 배열 내용은 그대로 유지, 첫 줄만 변경):

```ts
import { Product } from '@/features/products/types/product.types';
import { faker, fakerKO } from '@faker-js/faker';

const SUPER_A_ID = 'usr_2f20748f';

const RAW_PRODUCTS: Omit<Product, 'ownerId'>[] = [
```

파일의 마지막 줄:

```ts
];
```

다음으로 교체:

```ts
];

export const MOCK_PRODUCT_DATA: Product[] = RAW_PRODUCTS.map((p) => ({ ...p, ownerId: SUPER_A_ID }));
```

- [ ] **Step 3: 신규 실패 테스트 작성**

`src/mocks/utils/getProducts.test.ts` 생성:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';

const makeProduct = (overrides: Partial<Product>): Product => ({
  productId: 'smp000001',
  name: '테스트 상품',
  categoryId: 'c00001',
  price: 10000,
  state: 'ON_SALE',
  deliveryType: 'FREE',
  deliveryPrice: 0,
  mainImage: '',
  detailPage: '',
  totalQuantity: 100,
  createDate: new Date('2024-01-10'),
  updateDate: new Date('2024-01-10'),
  informationDisclosure: { key: '', id: '', name: '', fields: {} },
  ownerId: 'owner-1',
  ...overrides,
});

const { PRODUCTS } = vi.hoisted(() => ({ PRODUCTS: [] as Product[] }));
vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));

PRODUCTS.push(
  makeProduct({ productId: 'smp000001', ownerId: 'owner-1', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000002', ownerId: 'owner-1', state: 'SOLD_OUT' }),
  makeProduct({ productId: 'smp000003', ownerId: 'owner-2', state: 'ON_SALE' }),
);

import { getMockProducts } from './getProducts';

const defaultSearch = { dateType: '', startDate: '', endDate: '', saleType: 'ALL', categoryId: 'ALL', searchValue: '' };

describe('getMockProducts', () => {
  it('ownerId가 일치하는 상품만 반환한다', () => {
    const result = getMockProducts('owner-1', defaultSearch);
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.productId === 'smp000003')).toBeUndefined();
  });

  it('존재하지 않는 ownerId면 빈 배열을 반환한다', () => {
    const result = getMockProducts('owner-999', defaultSearch);
    expect(result).toHaveLength(0);
  });

  it('ownerId 필터와 판매상태 필터를 함께 적용한다', () => {
    const result = getMockProducts('owner-1', { ...defaultSearch, saleType: 'SOLD_OUT' });
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('smp000002');
  });
});
```

- [ ] **Step 4: 테스트 실행 → 실패 확인**

Run: `npm run test -- getProducts`
Expected: FAIL — `getMockProducts`가 아직 `ownerId` 파라미터를 받지 않음

- [ ] **Step 5: `getProducts.ts` mock util에 `ownerId` 필터 구현**

`src/mocks/utils/getProducts.ts` 전체를 다음으로 교체:

```ts
import { Product, ProductSearch } from '@/features/products/types/product.types';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const getProductsByDate = (dateType: string, startDateValue: string, endDateValue: string, data: Product[]) => {
  if (dateType === 'register') {
    return data.filter((item) => dayjs(item.createDate).isBetween(startDateValue, endDateValue, 'day', '[]'));
  }
  if (dateType === 'update') {
    return data.filter((item) => dayjs(item.updateDate).isBetween(startDateValue, endDateValue, 'day', '[]'));
  }
  return data;
};

const getProductsBySaleType = (type: string, data: Product[]) => {
  if (!type || type === 'ALL') {
    return data;
  }
  return data.filter((item) => item.state === type);
};

const getProductsByCategoryId = (id: string, data: Product[]) => {
  if (!id || id === 'ALL') {
    return data;
  }
  return data.filter((item) => item.categoryId === id);
};

const getProductsBysearchValue = (value: string, data: Product[]) => {
  if (!value) {
    return data;
  }
  return data.filter((item) => item.name.includes(value));
};

export const getMockProducts = (ownerId: string, searchParams: ProductSearch) => {
  const { dateType, startDate, endDate, saleType, categoryId, searchValue } = searchParams;
  const byOwner = MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId);
  const resultByDate = getProductsByDate(dateType, startDate, endDate, byOwner);
  const resultByType = getProductsBySaleType(saleType, resultByDate);
  const resultByCategory = getProductsByCategoryId(categoryId, resultByType);
  return getProductsBysearchValue(searchValue, resultByCategory);
};
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `npm run test -- getProducts`
Expected: PASS (3개 전부)

- [ ] **Step 7: MSW 핸들러 3개(`list`/`create`/`bulk`)에 `ownerId` 배선**

`src/mocks/handlers/products.ts` 전체를 다음으로 교체:

```ts
import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { Product, ProductSearch } from '@/features/products/types/product.types';
import { getMockProducts } from '../utils/getProducts';
import { createMockProduct } from '../utils/createProduct';
import { updateMockProduct } from '../utils/updateProduct';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';

export const productHandlers = [
  http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
    const { ownerId, ...searchParams } = (await request.json()) as ProductSearch & { ownerId: string };
    return HttpResponse.json(getMockProducts(ownerId, searchParams));
  }),

  http.post(`${baseUrl}/api/products/create`, async ({ request }) => {
    const { ownerId, ...data } = (await request.json()) as Product & { ownerId: string };
    const newProduct = createMockProduct({ ...data, ownerId });
    MOCK_PRODUCT_DATA.push(newProduct);
    return HttpResponse.json(newProduct);
  }),

  http.get(`${baseUrl}/api/products/:productId`, ({ params }) => {
    const { productId } = params;
    const data = MOCK_PRODUCT_DATA.find((item) => item.productId === productId);
    return HttpResponse.json(data);
  }),

  http.patch(`${baseUrl}/api/products/:productId`, async ({ request, params }) => {
    const { productId } = params;
    const update = (await request.json()) as Product;
    const updated = updateMockProduct(productId as string, update);
    return HttpResponse.json(updated);
  }),

  http.post(`${baseUrl}/api/products/bulk`, async ({ request }) => {
    await delay(500);
    const { ownerId, products } = (await request.json()) as { ownerId: string; products: Omit<Product, 'ownerId'>[] };
    MOCK_PRODUCT_DATA.push(...products.map((p) => ({ ...p, ownerId })));
    return HttpResponse.json({ success: true, count: products.length });
  }),
];
```

- [ ] **Step 8: 클라이언트 API 함수 3개에 `ownerId` 배선**

`src/features/products/api/getProducts.ts` 전체를 다음으로 교체:

```ts
import { ProductSearch } from '../types/product.types';

export const getProducts = async (ownerId: string, data: ProductSearch) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, ...data }),
  });

  if (!response.ok) {
    throw new Error('상품목록 호출 실패');
  }

  return response.json();
};
```

`src/features/products/api/createProduct.ts` 전체를 다음으로 교체:

```ts
import { CreateProductRequest } from '../types/product.types';

export const createProduct = async (data: CreateProductRequest, ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, ownerId }),
  });

  if (!response.ok) {
    throw new Error('상품등록 실패');
  }
};
```

`src/features/products/api/bulkCreateProducts.ts` 전체를 다음으로 교체:

```ts
import { Product } from '../types/product.types';

export const bulkCreateProducts = async (data: Omit<Product, 'ownerId'>[], ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, products: data }),
  });

  if (!response.ok) throw new Error('상품 대량 등록 실패');

  return response.json() as Promise<{ success: boolean; count: number }>;
};
```

- [ ] **Step 9: `productExcelSaveStrategy.ts` 반환 타입을 `bulkCreateProducts`의 새 시그니처에 맞춤**

Task 1의 `orderExcelSaveStrategy`와 동일한 이유(`Product.ownerId`가 필수가 되면서 반환 타입 불일치)로, 필드 매핑 로직은 그대로 두고 반환 타입 선언만 고친다.

`src/components/excel/strategies/productExcelSaveStrategy.ts`에서:

```ts
export const productExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Product[] => {
```

다음으로 교체 (이하 함수 본문은 완전히 그대로 유지):

```ts
export const productExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Omit<Product, 'ownerId'>[] => {
```

- [ ] **Step 10: `ProductListLayout.tsx`에 `workspaceOwnerIdAtom` 배선**

`src/features/products/ui/list/ProductListLayout.tsx`에서 import 블록을:

```tsx
import { useState } from 'react';
import { ProductHeaderSection, ProductSearchFilterSection, ProductTableSection } from '@/features/products/ui/list';
import { getSearchFilterAtom } from '../../store/search.store';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/getProducts';
import { Product } from '../../types/product.types';
```

다음으로 교체:

```tsx
import { useState } from 'react';
import { ProductHeaderSection, ProductSearchFilterSection, ProductTableSection } from '@/features/products/ui/list';
import { getSearchFilterAtom } from '../../store/search.store';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/getProducts';
import { Product } from '../../types/product.types';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
```

같은 파일에서:

```tsx
  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ['products', appliedFilter],
    queryFn: () => getProducts(appliedFilter),
  });
```

다음으로 교체:

```tsx
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ['products', workspaceOwnerId, appliedFilter],
    queryFn: () => getProducts(workspaceOwnerId, appliedFilter),
    enabled: !!workspaceOwnerId,
  });
```

- [ ] **Step 11: `ProductCreateLayout.tsx`에 `workspaceOwnerIdAtom` 배선**

`src/features/products/ui/create/ProductCreateLayout.tsx`에서 import 블록을:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { Product } from '../../types/product.types';
import { useMutation } from '@tanstack/react-query';
import { createProduct } from '../../api/createProduct';
import { useAlert } from '@/hooks/useAlert';
import { ProductForm } from '../components/ProductForm';

export const ProductCreateLayout = () => {
  const { showAlert } = useAlert();
  const formData = useForm<Product>();
  const router = useRouter();

  const { mutate } = useMutation({
    mutationFn: createProduct,
```

다음으로 교체:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { Product } from '../../types/product.types';
import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { createProduct } from '../../api/createProduct';
import { useAlert } from '@/hooks/useAlert';
import { ProductForm } from '../components/ProductForm';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';

export const ProductCreateLayout = () => {
  const { showAlert } = useAlert();
  const formData = useForm<Product>();
  const router = useRouter();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { mutate } = useMutation({
    mutationFn: (data: Product) => createProduct(data, workspaceOwnerId),
```

- [ ] **Step 12: 빌드 확인 (알려진 전이 상태 — Global Constraints 참고)**

Run: `npm run build`
Expected: `src/components/excel/utils/getExcelSaveStrategy.ts:19`의 주문 분기 에러(Task 1에서부터 존재)에 더해, 같은 파일의 상품 분기(`bulkCreateProducts(products)`)에서도 동일한 `Expected 2 arguments, but got 1` 에러가 추가로 나야 한다. 이 두 건 외에 다른 컴파일 에러는 없어야 한다.

- [ ] **Step 13: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add src/features/products/types/product.types.ts src/mocks/data/MockProductsData.ts \
        src/mocks/utils/getProducts.ts src/mocks/utils/getProducts.test.ts \
        src/mocks/handlers/products.ts src/features/products/api/getProducts.ts \
        src/features/products/api/createProduct.ts src/features/products/api/bulkCreateProducts.ts \
        src/features/products/ui/list/ProductListLayout.tsx src/features/products/ui/create/ProductCreateLayout.tsx \
        src/components/excel/strategies/productExcelSaveStrategy.ts
git commit -m "feat: products 도메인 목록/등록/대량등록에 ownerId 테넌트 격리 추가"
```

---

### Task 4: `home` 도메인 — 3개 통계 API에 `ownerId` 배선 (`GET`→`POST` 전환 포함)

**Files:**
- Modify: `src/mocks/handlers/home.ts`
- Modify: `src/mocks/utils/getHomeData.ts`
- Create: `src/mocks/utils/getHomeData.test.ts`
- Modify: `src/mocks/utils/getHomeOrderStats.ts`
- Create: `src/mocks/utils/getHomeOrderStats.test.ts`
- Modify: `src/features/home/api/getHomeStats.ts`
- Modify: `src/features/home/api/getRecentProducts.ts`
- Modify: `src/features/home/api/getHomeOrderStats.ts`
- Modify: `src/features/home/ui/HomeLayout.tsx`

**Interfaces:**
- Consumes: Task 1의 `Order.ownerId`, Task 3의 `Product.ownerId`, `workspaceOwnerIdAtom`
- Produces: 없음 (최종 소비 지점, 다른 Task가 의존하지 않음)

- [ ] **Step 1: `getHomeData.ts` 신규 실패 테스트 작성**

`src/mocks/utils/getHomeData.test.ts` 생성:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';

const makeProduct = (overrides: Partial<Product>): Product => ({
  productId: 'smp000001',
  name: '테스트 상품',
  categoryId: 'c00001',
  price: 10000,
  state: 'ON_SALE',
  deliveryType: 'FREE',
  deliveryPrice: 0,
  mainImage: '',
  detailPage: '',
  totalQuantity: 100,
  createDate: new Date('2024-01-10'),
  updateDate: new Date('2024-01-10'),
  informationDisclosure: { key: '', id: '', name: '', fields: {} },
  ownerId: 'owner-1',
  ...overrides,
});

const { PRODUCTS } = vi.hoisted(() => ({ PRODUCTS: [] as Product[] }));
vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));

PRODUCTS.push(
  makeProduct({ productId: 'smp000001', ownerId: 'owner-1', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000002', ownerId: 'owner-1', state: 'SOLD_OUT' }),
  makeProduct({ productId: 'smp000003', ownerId: 'owner-2', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000004', ownerId: 'owner-2', state: 'ON_SALE' }),
);

import { getMockHomeStats, getMockRecentProducts } from './getHomeData';

describe('getMockHomeStats', () => {
  it('ownerId가 일치하는 상품만 집계한다', () => {
    const result = getMockHomeStats('owner-1');
    expect(result.total).toBe(2);
    expect(result.onSale).toBe(1);
    expect(result.soldOut).toBe(1);
  });

  it('다른 owner의 상품은 집계에서 제외한다', () => {
    const result = getMockHomeStats('owner-2');
    expect(result.total).toBe(2);
    expect(result.onSale).toBe(2);
  });
});

describe('getMockRecentProducts', () => {
  it('ownerId가 일치하는 상품만 반환한다', () => {
    const result = getMockRecentProducts('owner-1');
    expect(result).toHaveLength(2);
    expect(result.every((p) => ['smp000001', 'smp000002'].includes(p.productId))).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test -- getHomeData`
Expected: FAIL — `getMockHomeStats`/`getMockRecentProducts`가 아직 `ownerId` 파라미터를 받지 않음

- [ ] **Step 3: `getHomeData.ts`에 `ownerId` 필터 구현**

`src/mocks/utils/getHomeData.ts` 전체를 다음으로 교체:

```ts
import dayjs from 'dayjs';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { HomeStats, RecentProduct } from '@/features/home/types/home.types';

export const getMockHomeStats = (ownerId: string): HomeStats => {
  const owned = MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId);
  const total = owned.length;
  const onSale = owned.filter((p) => p.state === 'ON_SALE').length;
  const soldOut = owned.filter((p) => p.state === 'SOLD_OUT').length;
  const saleDis = owned.filter((p) => p.state === 'SALE_DIS').length;
  const waitSale = owned.filter((p) => p.state === 'WAIT_SALE').length;

  return { total, onSale, soldOut, saleDis, waitSale };
};

export const getMockRecentProducts = (ownerId: string): RecentProduct[] => {
  return MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId)
    .sort((a, b) => dayjs(b.createDate).valueOf() - dayjs(a.createDate).valueOf())
    .slice(0, 5)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      price: p.price,
      state: p.state,
      createDate: dayjs(p.createDate).format('YYYY-MM-DD'),
    }));
};
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm run test -- getHomeData`
Expected: PASS (3개 전부)

- [ ] **Step 5: `getHomeOrderStats.ts` 신규 실패 테스트 작성**

`src/mocks/utils/getHomeOrderStats.test.ts` 생성:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Order } from '@/features/order/types/order.types';

const makeOrder = (overrides: Partial<Order>): Order => ({
  orderNumber: 'ORD-001',
  shopOrderNumber: 'SHOP-001',
  orderStatus: 'NEW_ORDER',
  paymentDate: '2024-01-15',
  orderCollectionDate: '2024-01-15',
  shoppingMallName: 'COUP',
  shoppingMallId: 'mall-1',
  shopProductId: 'prod-1',
  orderProductName: '상품',
  orderPrice: 10000,
  orderTotalQuantity: 1,
  orderDeliveryType: 'FREE',
  orderDeliveryPrice: 0,
  orderName: '주문자',
  payeeName: '수취인',
  orderPhoneNumber: '010-0000-0000',
  payeePhoneNumber: '010-0000-0000',
  orderZipCode: '00000',
  orderAddress: '주소',
  payeeZipCode: '00000',
  payeeAddress: '주소',
  ownerId: 'owner-1',
  ...overrides,
});

const { ORDERS } = vi.hoisted(() => ({ ORDERS: [] as Order[] }));
vi.mock('../data/MockOrdersData', () => ({ MOCK_ORDERS_DATA: ORDERS }));

ORDERS.push(
  makeOrder({ orderNumber: 'ORD-001', ownerId: 'owner-1', orderStatus: 'NEW_ORDER', orderCollectionDate: '2024-01-15' }),
  makeOrder({ orderNumber: 'ORD-002', ownerId: 'owner-1', orderStatus: 'CONFIRMED_ORDER', orderCollectionDate: '2024-01-16' }),
  makeOrder({ orderNumber: 'ORD-003', ownerId: 'owner-2', orderStatus: 'NEW_ORDER', orderCollectionDate: '2024-01-15' }),
);

import { getMockHomeOrderStats } from './getHomeOrderStats';

describe('getMockHomeOrderStats', () => {
  it('ownerId가 일치하는 주문만 집계한다', () => {
    const result = getMockHomeOrderStats('owner-1', '2024-01-01', '2024-01-31');
    expect(result.newOrder).toBe(1);
    expect(result.confirmedOrder).toBe(1);
  });

  it('다른 owner의 주문은 집계에서 제외한다', () => {
    const result = getMockHomeOrderStats('owner-2', '2024-01-01', '2024-01-31');
    expect(result.newOrder).toBe(1);
    expect(result.confirmedOrder).toBe(0);
  });
});
```

- [ ] **Step 6: 테스트 실행 → 실패 확인**

Run: `npm run test -- getHomeOrderStats`
Expected: FAIL — `getMockHomeOrderStats`가 아직 `ownerId` 파라미터를 받지 않음

- [ ] **Step 7: `getHomeOrderStats.ts`에 `ownerId` 필터 구현**

`src/mocks/utils/getHomeOrderStats.ts` 전체를 다음으로 교체:

```ts
import { HomeOrderStats } from '@/features/home/types/home.types';
import { OrderStatusTypes } from '@/features/order/types/order.types';
import { MOCK_ORDERS_DATA } from '../data/MockOrdersData';

export const getMockHomeOrderStats = (ownerId: string, startDate: string, endDate: string): HomeOrderStats => {
  const owned = MOCK_ORDERS_DATA.filter((o) => o.ownerId === ownerId);
  const filtered = owned.filter((o) => {
    const date = o.orderCollectionDate.split(' ')[0];
    return date >= startDate && date <= endDate;
  });

  const count = (...statuses: OrderStatusTypes[]) =>
    filtered.filter((o) => statuses.includes(o.orderStatus)).length;

  return {
    newOrder: count('NEW_ORDER'),
    confirmedOrder: count('CONFIRMED_ORDER'),
    invoice: count('INVOICE_REGISTER', 'INVOICE_COMPLETE'),
    cancelClaim: count('REQUEST_CANCEL', 'PROGRESS_CANCEL'),
    returnClaim: count('REQUEST_RETURN', 'PROGRESS_RETURN'),
    exchangeClaim: count('REQUEST_EXCHANGE', 'PROGRESS_EXCHANGE'),
  };
};
```

- [ ] **Step 8: 테스트 실행 → 통과 확인**

Run: `npm run test -- getHomeOrderStats`
Expected: PASS (2개 전부)

- [ ] **Step 9: MSW 핸들러 3개 — `stats`/`recent-products`를 `GET`→`POST`로 전환, `order-stats`는 `ownerId` 추가**

`src/mocks/handlers/home.ts` 전체를 다음으로 교체:

```ts
import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { getMockHomeStats, getMockRecentProducts } from '../utils/getHomeData';
import { getMockHomeOrderStats } from '../utils/getHomeOrderStats';

export const homeHandlers = [
  http.post(`${baseUrl}/api/home/stats`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    return HttpResponse.json(getMockHomeStats(ownerId));
  }),

  http.post(`${baseUrl}/api/home/recent-products`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    return HttpResponse.json(getMockRecentProducts(ownerId));
  }),

  http.post(`${baseUrl}/api/home/order-stats`, async ({ request }) => {
    const { ownerId, startDate, endDate } = (await request.json()) as {
      ownerId: string;
      startDate: string;
      endDate: string;
    };
    return HttpResponse.json(getMockHomeOrderStats(ownerId, startDate, endDate));
  }),
];
```

- [ ] **Step 10: 클라이언트 API 함수 3개 — `GET`→`POST` 전환 + `ownerId` 배선**

`src/features/home/api/getHomeStats.ts` 전체를 다음으로 교체:

```ts
import { HomeStats } from '../types/home.types';

export const getHomeStats = async (ownerId: string): Promise<HomeStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });

  if (!response.ok) {
    throw new Error('홈 통계 조회 실패');
  }

  return response.json();
};
```

`src/features/home/api/getRecentProducts.ts` 전체를 다음으로 교체:

```ts
import { RecentProduct } from '../types/home.types';

export const getRecentProducts = async (ownerId: string): Promise<RecentProduct[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/recent-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });

  if (!response.ok) {
    throw new Error('최근 상품 조회 실패');
  }

  return response.json();
};
```

`src/features/home/api/getHomeOrderStats.ts` 전체를 다음으로 교체:

```ts
import { HomeOrderStats } from '../types/home.types';

export const getHomeOrderStats = async (ownerId: string, startDate: string, endDate: string): Promise<HomeOrderStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/order-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, startDate, endDate }),
  });

  if (!response.ok) {
    throw new Error('주문/클레임 통계 조회 실패');
  }

  return response.json();
};
```

- [ ] **Step 11: `HomeLayout.tsx`에 `workspaceOwnerIdAtom` 배선**

`src/features/home/ui/HomeLayout.tsx` 전체를 다음으로 교체:

```tsx
'use client';

import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

import { getHomeStats } from '@/features/home/api/getHomeStats';
import { getHomeOrderStats } from '@/features/home/api/getHomeOrderStats';
import { getRecentProducts } from '@/features/home/api/getRecentProducts';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { ClaimStatCards } from './components/ClaimStatCards';
import { InquiryStatCards } from './components/InquiryStatCards';
import { OrderStatCards } from './components/OrderStatCards';
import { QuickActions } from './components/QuickActions';
import { RecentProducts } from './components/RecentProducts';
import { StatCards } from './components/StatCards';

export const HomeLayout = () => {
  const endDate = dayjs().format('YYYY-MM-DD');
  const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data: stats } = useQuery({
    queryKey: ['home', 'stats', workspaceOwnerId],
    queryFn: () => getHomeStats(workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  const { data: orderStats } = useQuery({
    queryKey: ['home', 'order-stats', workspaceOwnerId, startDate, endDate],
    queryFn: () => getHomeOrderStats(workspaceOwnerId, startDate, endDate),
    enabled: !!workspaceOwnerId,
  });

  const { data: recentProducts = [] } = useQuery({
    queryKey: ['home', 'recent-products', workspaceOwnerId],
    queryFn: () => getRecentProducts(workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  return (
    <div className="max-w-[80%] mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold tracking-tight">업무 현황</h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            최근 7일
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {stats && <StatCards stats={stats} />}
          {orderStats && <OrderStatCards stats={orderStats} />}
          {orderStats && <ClaimStatCards stats={orderStats} />}
          <InquiryStatCards />
        </div>
      </div>
      <QuickActions />
      <RecentProducts products={recentProducts} />
    </div>
  );
};
```

- [ ] **Step 12: 빌드 + 전체 테스트로 회귀 확인**

Run: `npm run build`
Expected: 컴파일 성공

Run: `npm run test`
Expected: 전체 PASS

- [ ] **Step 13: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add src/mocks/handlers/home.ts src/mocks/utils/getHomeData.ts src/mocks/utils/getHomeData.test.ts \
        src/mocks/utils/getHomeOrderStats.ts src/mocks/utils/getHomeOrderStats.test.ts \
        src/features/home/api/getHomeStats.ts src/features/home/api/getRecentProducts.ts \
        src/features/home/api/getHomeOrderStats.ts src/features/home/ui/HomeLayout.tsx
git commit -m "feat: home 대시보드 통계 3종에 ownerId 테넌트 격리 추가 (GET->POST 전환 포함)"
```

---

### Task 5: 엑셀 대량등록 — `ownerId` 배선

**Files:**
- Modify: `src/components/excel/utils/getExcelSaveStrategy.ts`
- Modify: `src/components/excel/ExcelDataPreview.tsx`

**Interfaces:**
- Consumes: Task 1의 `bulkCreateOrders(data: Omit<Order, 'ownerId'>[], ownerId: string)`와 `orderExcelSaveStrategy(rows): Omit<Order, 'ownerId'>[]`, Task 3의 `bulkCreateProducts(data: Omit<Product, 'ownerId'>[], ownerId: string)`와 `productExcelSaveStrategy(rows): Omit<Product, 'ownerId'>[]`, `workspaceOwnerIdAtom`
- Produces: `getExcelSaveStrategy(type: SaveType, ownerId: string)` — 최종 소비 지점, 다른 Task가 의존하지 않음

**참고:** `orderExcelSaveStrategy`/`productExcelSaveStrategy`의 반환 타입은 이미 Task 1/Task 3에서 `Omit<Xxx, 'ownerId'>[]`로 고쳐졌으므로, 이번 Task는 그 두 파일을 다시 건드리지 않는다. 아래 Step 1의 `bulkCreateOrders(orders, ownerId)`/`bulkCreateProducts(products, ownerId)` 호출은 타입이 이미 맞물려 있어 별도 캐스팅이 필요 없다.

- [ ] **Step 1: `getExcelSaveStrategy`가 `ownerId`를 받아 `bulkCreateOrders`/`bulkCreateProducts`에 전달하도록 변경**

`src/components/excel/utils/getExcelSaveStrategy.ts` 전체를 다음으로 교체:

```ts
import { orderExcelSaveStrategy } from '../strategies/orderExcelSaveStrategy';
import { productExcelSaveStrategy } from '../strategies/productExcelSaveStrategy';
import { bulkCreateProducts } from '@/features/products/api/bulkCreateProducts';
import { bulkCreateOrders } from '@/features/order/api/bulkCreateOrders';
import { ExcelRowWithErrors } from '@/types/excel.type';

type SaveType = 'PRODUCT' | 'ORDER';

export const getExcelSaveStrategy = (type: SaveType, ownerId: string) => {
  switch (type) {
    case 'PRODUCT':
      return (rows: ExcelRowWithErrors[]) => {
        const products = productExcelSaveStrategy(rows);
        return bulkCreateProducts(products, ownerId);
      };
    case 'ORDER':
      return (rows: ExcelRowWithErrors[]) => {
        const orders = orderExcelSaveStrategy(rows);
        return bulkCreateOrders(orders, ownerId);
      };
  }
};
```

- [ ] **Step 2: `ExcelDataPreview.tsx` 호출부에 `workspaceOwnerIdAtom` 배선**

`src/components/excel/ExcelDataPreview.tsx`에서 import 블록을:

```tsx
'use client';

import { ExcelHeaderProps, ExcelRowWithErrors, ExcelTableColumnsType } from '@/types/excel.type';
import { getExcelSaveStrategy } from './utils/getExcelSaveStrategy';
import { Card, CardContent } from '../ui/card';
import { ExcelDataPreviewHeader } from './components/ExcelDataPreviewHeader';
import { ExcelDataSummaryInfo } from './components/ExcelDataSummaryInfo';
import { ExcelDataTable } from './components/ExcelDataTable';
import { useExcelData, useResetExcelData } from '@/components/excel/store/excelData.store';
import { ExcelDataErrorAlert } from './components/ExcelDataErrorAlert';
import { useMutation } from '@tanstack/react-query';
import { useAlert } from '@/hooks/useAlert';

type SaveType = 'PRODUCT' | 'ORDER';
type Props = { excelHeader: ExcelHeaderProps; tableColumns: ExcelTableColumnsType[]; saveType: SaveType };

export const ExcelDataPreview = ({ excelHeader, tableColumns, saveType }: Props) => {
  const uploadedData = useExcelData();
  const resetExcelData = useResetExcelData();
  const { showAlert } = useAlert();

  const saveFn = getExcelSaveStrategy(saveType);
```

다음으로 교체:

```tsx
'use client';

import { useAtomValue } from 'jotai';
import { ExcelHeaderProps, ExcelRowWithErrors, ExcelTableColumnsType } from '@/types/excel.type';
import { getExcelSaveStrategy } from './utils/getExcelSaveStrategy';
import { Card, CardContent } from '../ui/card';
import { ExcelDataPreviewHeader } from './components/ExcelDataPreviewHeader';
import { ExcelDataSummaryInfo } from './components/ExcelDataSummaryInfo';
import { ExcelDataTable } from './components/ExcelDataTable';
import { useExcelData, useResetExcelData } from '@/components/excel/store/excelData.store';
import { ExcelDataErrorAlert } from './components/ExcelDataErrorAlert';
import { useMutation } from '@tanstack/react-query';
import { useAlert } from '@/hooks/useAlert';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';

type SaveType = 'PRODUCT' | 'ORDER';
type Props = { excelHeader: ExcelHeaderProps; tableColumns: ExcelTableColumnsType[]; saveType: SaveType };

export const ExcelDataPreview = ({ excelHeader, tableColumns, saveType }: Props) => {
  const uploadedData = useExcelData();
  const resetExcelData = useResetExcelData();
  const { showAlert } = useAlert();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const saveFn = getExcelSaveStrategy(saveType, workspaceOwnerId);
```

- [ ] **Step 3: 빌드 + 전체 테스트로 최종 회귀 확인**

Run: `npm run build`
Expected: 컴파일 성공

Run: `npm run test`
Expected: 전체 PASS

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 4: dev 서버에서 수동 확인**

Run: `npm run dev`
- `/products/bulk`, `/order`(주문 엑셀 업로드 화면 있는 경우) 엑셀 업로드 → 저장 시 정상 동작하는지 확인 (인증 필요, 실제 로그인 계정으로 확인)
- `/home` 대시보드가 정상적으로 통계를 표시하는지 확인 (네트워크 탭에서 `home/stats`, `home/recent-products`가 `POST`로 호출되는지 확인)

- [ ] **Step 5: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add src/components/excel/utils/getExcelSaveStrategy.ts src/components/excel/ExcelDataPreview.tsx
git commit -m "feat: 엑셀 대량등록 저장 시 ownerId 스탬핑"
```

---

## Self-Review 결과

- **스펙 커버리지**: 설계 문서의 섹션 1~5(order/collection, products, home, excel, mock 데이터)가 Task 1~5에 각각 매핑됨. 섹션 6(검증)은 각 Task의 TDD 스텝에 통합. 범위 외로 명시된 단건 조회 ownership 검증은 포함하지 않음.
- **플레이스홀더 스캔**: "TODO"/"나중에" 등 없음. `MockOrdersData.ts`/`MockProductsData.ts`처럼 리터럴 배열이 매우 큰 파일은 전체 재작성 대신 첫/마지막 줄만 정확히 교체하는 방식으로 처리 — 기존 데이터 내용 자체는 변경하지 않으므로 누락 위험 없음.
- **타입 일관성 확인**: `getMockOrders(ownerId, filters, page, pageSize)`(Task 1) / `getCollectionJobsMock(ownerId, params)`(Task 2) / `getMockProducts(ownerId, searchParams)`(Task 3) 전부 "ownerId를 첫 번째 별도 인자로 받는" 동일 패턴 확인. `getExcelSaveStrategy(type, ownerId)`(Task 5)가 Task 1의 `bulkCreateOrders(data, ownerId)`, Task 3의 `bulkCreateProducts(data, ownerId)` 시그니처와 정확히 맞물리는지 확인 완료. `SUPER_A_ID = 'usr_2f20748f'` 값이 Task 1/2/3에서 동일하게 사용됨(기존 `MockShoppingAccountsData.ts`와 동일 계정) 확인.
