# 타입 중복/불일치 정리 — 몰 코드 필드명 통일 + zod 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `CollectionJob`/`Order`/`OrderSearchType`에 흩어져 있던 몰 코드·계정ID 필드명(`mallName`/`shoppingMallName`/`shoppingMall`/`shoppingMallId`)을 `mallCode`/`mallId`로 통일하고, `ShoppingAccountForm`의 zod 스키마를 강화해 제출부의 `as` 캐스팅을 제거한다.

**Architecture:** 도메인별 단계 진행(CollectionJob → Order → ShoppingAccountForm zod). 각 리네임 Task는 테스트 fixture를 먼저 새 필드명으로 바꿔 RED를 관찰한 뒤, 타입·mock 데이터·소비 코드를 리네임해 GREEN으로 만드는 순서로 진행한다. UI 컴포넌트(zod 스키마 포함)는 이 프로젝트 컨벤션상 신규 테스트 파일을 만들지 않으므로, 해당 Task만 typecheck + 수동 dev 서버 확인으로 검증한다.

**Tech Stack:** TypeScript, Next.js 15, Zod 3.25 (`refine` 타입가드 오버로드), React Hook Form 7.59 (3-제네릭 `useForm<Input, Context, Output>` 지원), Vitest 4, MSW 2.

## Global Constraints

- 스펙 문서: `docs/superpowers/specs/2026-07-17-type-naming-unification-design.md`
- vitest 커버리지는 `src/mocks/utils/`로 한정 (CLAUDE.md 컨벤션) — UI 컴포넌트에는 신규 테스트 파일을 추가하지 않는다.
- `npm run test` (`vitest run`)는 esbuild 트랜스파일만 하고 타입체크를 하지 않는다 — 타입 오류는 `npm run build`(`next build`)에서만 잡힌다. 각 리네임 Task의 RED는 타입 오류가 아니라 **런타임 필터링 결과 불일치**로 관찰한다.
- 커밋은 사용자가 명시적으로 요청한 시점에만 실행한다 (CLAUDE.md Git/PR 규칙) — 각 Task의 "커밋" 스텝은 계획 문서상의 안내이며, 실행 시 자동 실행하지 않는다.
- ShoppingAccount/ShoppingSetting 도메인은 이미 `mallCode`/`mallId`를 사용 중이라 리네임 대상 아님.

---

### Task 1: CollectionJob 도메인 — `mallName` → `mallCode`

**Files:**
- Test: `src/mocks/utils/getCollectionJobs.test.ts`
- Modify: `src/features/order/types/collection.types.ts`
- Modify: `src/mocks/data/MockCollectionJobsData.ts`
- Modify: `src/mocks/utils/getCollectionJobs.ts`
- Modify: `src/features/order/ui/collect/CollectionTableSection.tsx`

**Interfaces:**
- Produces: `CollectionJob.mallCode: ShoppingMalls` (기존 `mallName` 대체) — Task 3까지 다른 Task가 이 필드를 참조하지 않으므로 후속 영향 없음.

- [ ] **Step 1: 테스트 fixture를 새 필드명으로 먼저 변경 (RED 유도)**

`src/mocks/utils/getCollectionJobs.test.ts` 전체를 아래로 교체한다 (`mallName` → `mallCode`만 변경, 나머지 동일):

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { CollectionJob } from '@/features/order/types/collection.types';

const makeJob = (overrides: Partial<CollectionJob>): CollectionJob => ({
  id: 'JOB-001',
  mallCode: 'COUP',
  mallId: 'coupang_seller1',
  status: 'WAITING',
  lastCollectedAt: null,
  ownerId: 'owner-1',
  ...overrides,
});

const { JOBS } = vi.hoisted(() => ({ JOBS: [] as CollectionJob[] }));
vi.mock('../data/MockCollectionJobsData', () => ({ MOCK_COLLECTION_JOBS: JOBS }));

JOBS.push(
  makeJob({ id: 'JOB-001', ownerId: 'owner-1', mallCode: 'COUP' }),
  makeJob({ id: 'JOB-002', ownerId: 'owner-1', mallCode: 'NSST' }),
  makeJob({ id: 'JOB-003', ownerId: 'owner-2', mallCode: 'COUP' }),
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

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test -- getCollectionJobs`
Expected: `ownerId와 mallCode 필터를 함께 적용한다` FAIL — `job.mallName`이 `undefined`가 되어 `params.mallCode !== 'ALL' && job.mallName !== params.mallCode`가 항상 `true`(불일치)로 평가되고, COUP 필터 시 결과가 0개(기대값 1개)로 나온다.

- [ ] **Step 3: 타입 정의 리네임**

`src/features/order/types/collection.types.ts`:
```typescript
// src/features/order/types/collection.types.ts
import { ShoppingMalls } from '@/types/common.type';

export type CollectionStatus = 'WAITING' | 'COLLECTING' | 'COMPLETED' | 'FAILED';

export interface CollectionJob {
  id: string;
  mallCode: ShoppingMalls;
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

- [ ] **Step 4: mock 데이터 리네임**

`src/mocks/data/MockCollectionJobsData.ts`에서 6곳의 `mallName:`을 `mallCode:`로 변경 (값은 그대로):

```bash
sed -i 's/mallName:/mallCode:/g' "src/mocks/data/MockCollectionJobsData.ts"
```

변경 후 잔여 여부 확인:
```bash
grep -n "mallName" src/mocks/data/MockCollectionJobsData.ts
```
Expected: 출력 없음 (0건)

- [ ] **Step 5: 필터링 로직 리네임**

`src/mocks/utils/getCollectionJobs.ts` 25-30번째 줄:

```typescript
  return MOCK_COLLECTION_JOBS.filter((job) => {
    if (job.ownerId !== ownerId) return false;
    if (params.mallCode !== 'ALL' && job.mallCode !== params.mallCode) return false;
    if (params.mallId !== 'ALL' && job.mallId !== params.mallId) return false;
    return true;
  });
```

(`job.mallName` → `job.mallCode`만 변경)

- [ ] **Step 6: UI 참조 리네임**

`src/features/order/ui/collect/CollectionTableSection.tsx` 68번째 줄:

```typescript
                <TableCell className="text-center">{getMallName(job.mallCode)}</TableCell>
```

(`job.mallName` → `job.mallCode`만 변경, 로컬 헬퍼 `getMallName` 자체는 이름 유지)

- [ ] **Step 7: 테스트 실행 → 통과 확인**

Run: `npm run test -- getCollectionJobs`
Expected: 3개 테스트 모두 PASS

- [ ] **Step 8: 전체 lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/features/order/types/collection.types.ts src/mocks/data/MockCollectionJobsData.ts src/mocks/utils/getCollectionJobs.ts src/mocks/utils/getCollectionJobs.test.ts src/features/order/ui/collect/CollectionTableSection.tsx
git commit -m "refactor: CollectionJob.mallName을 mallCode로 리네임"
```

---

### Task 2: Order 도메인 — `shoppingMallName`/`shoppingMallId`/`shoppingMall` → `mallCode`/`mallId`

**Files:**
- Test: `src/mocks/utils/getOrders.test.ts`
- Test: `src/mocks/utils/getHomeOrderStats.test.ts`
- Modify: `src/features/order/types/order.types.ts`
- Modify: `src/features/order/store/search.store.ts`
- Modify: `src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx`
- Modify: `src/mocks/utils/getOrders.ts`
- Modify: `src/mocks/data/MockOrdersData.ts`
- Modify: `src/features/order/ui/detail/OrderInfoSection.tsx`
- Modify: `src/features/order/ui/list/components/orderTable/OrderListTable.tsx`
- Modify: `src/components/excel/strategies/orderExcelSaveStrategy.ts`
- Modify: `src/features/order/constant/table.constant.ts`

**Interfaces:**
- Consumes: 없음 (Task 1과 독립적인 도메인)
- Produces: `Order.mallCode: ShoppingMalls`, `Order.mallId: string`, `OrderSearchType.mallCode: ShoppingMalls | 'ALL'`, `mallCodeAtom`(order/store/search.store.ts) — Task 3은 이 필드를 참조하지 않으므로 후속 영향 없음.

- [ ] **Step 1: 테스트 fixture를 새 필드명으로 먼저 변경 (RED 유도)**

`src/mocks/utils/getOrders.test.ts`에서 `shoppingMallName`→`mallCode`, `shoppingMallId`→`mallId`, `shoppingMall:`(OrderSearchType 필드)→`mallCode:`로 변경한다. 전체 파일을 아래로 교체:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { OrderSearchType } from '@/features/order/types/order.types';
import type { Order } from '@/features/order/types/order.types';

// vi.mock()은 파일 상단으로 호이스팅되므로, 픽스처 데이터는 vi.hoisted()로 먼저 정의한다
const { ORDERS } = vi.hoisted(() => {
  const makeOrder = (overrides: Partial<Order>): Order => ({
    orderNumber: 'ORD-001',
    shopOrderNumber: 'SHOP-001',
    orderStatus: 'NEW_ORDER',
    paymentDate: '2024-01-15',
    orderCollectionDate: '2024-01-15',
    mallCode: 'COUP',
    mallId: 'mall-1',
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
      makeOrder({ orderNumber: 'ORD-001', mallCode: 'COUP', mallId: 'mall-1', orderStatus: 'NEW_ORDER', paymentDate: '2024-01-15', orderName: '홍길동', orderProductName: '나이키 운동화' }),
      makeOrder({ orderNumber: 'ORD-002', mallCode: 'NSST', mallId: 'mall-2', orderStatus: 'CONFIRMED_ORDER', paymentDate: '2024-01-20', orderName: '김철수', orderProductName: '아디다스 슬리퍼' }),
      makeOrder({ orderNumber: 'ORD-003', mallCode: 'COUP', mallId: 'mall-1', orderStatus: 'INVOICE_REGISTER', paymentDate: '2024-02-01', orderName: '이영희', orderProductName: '뉴발란스 운동화' }),
      makeOrder({ orderNumber: 'ORD-004', ownerId: 'owner-2', mallCode: 'COUP', mallId: 'mall-1', orderStatus: 'NEW_ORDER', paymentDate: '2024-01-15', orderName: '박민수', orderProductName: '타 owner 주문' }),
    ],
  };
});

// faker 데이터 대신 위에서 정의한 고정 픽스처로 교체
vi.mock('../data/MockOrdersData', () => ({
  MOCK_ORDERS_DATA: ORDERS,
}));

import { getMockOrders } from './getOrders';

// 모든 테스트에서 공통으로 쓰는 기본 필터 (날짜 범위 안에 픽스처 3개 전부 포함)
const defaultFilters: OrderSearchType = {
  dateType: 'paymentDate',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  mallCode: 'ALL',
  mallId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: 'ALL',
  searchType: 'orderName',
  searchValue: '',
};

// ─── getMockOrders ────────────────────────────────────────────────────────────

describe('getMockOrders', () => {
  describe('필터 없음', () => {
    it('아무 필터도 없으면 전체 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 10);
      expect(result.total).toBe(3);
      expect(result.orders).toHaveLength(3);
    });
  });

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

  describe('쇼핑몰 필터', () => {
    it("'COUP'만 필터링하면 COUP 주문 2개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallCode: 'COUP' }, 1, 10);
      expect(result.total).toBe(2);
      result.orders.forEach((o) => expect(o.mallCode).toBe('COUP'));
    });

    it("'NSST'만 필터링하면 NSST 주문 1개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallCode: 'NSST' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });

    it("'ALL'이면 전체를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallCode: 'ALL' }, 1, 10);
      expect(result.total).toBe(3);
    });
  });

  describe('아이디 필터', () => {
    it("'mall-1' 아이디만 필터링하면 2개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallId: 'mall-1' }, 1, 10);
      expect(result.total).toBe(2);
      result.orders.forEach((o) => expect(o.mallId).toBe('mall-1'));
    });

    it("'mall-2' 아이디만 필터링하면 1개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, mallId: 'mall-2' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });
  });

  describe('주문 상태 필터', () => {
    it("'NEW_ORDER' 상태만 필터링하면 1개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, orderStatus: 'NEW_ORDER' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-001');
    });

    it("'CONFIRMED_ORDER' 상태만 필터링하면 1개를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, orderStatus: 'CONFIRMED_ORDER' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });

    it("'ALL'이면 전체를 반환한다", () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, orderStatus: 'ALL' }, 1, 10);
      expect(result.total).toBe(3);
    });
  });

  describe('검색 필터', () => {
    it('searchType orderName으로 검색하면 주문자명이 일치하는 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'orderName', searchValue: '홍길동' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-001');
    });

    it('searchType orderProductName으로 검색하면 상품명에 키워드가 포함된 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'orderProductName', searchValue: '운동화' }, 1, 10);
      expect(result.total).toBe(2); // 나이키 운동화, 뉴발란스 운동화
    });

    it('searchType orderNumber로 검색하면 주문번호가 일치하는 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'orderNumber', searchValue: 'ORD-002' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });

    it('존재하지 않는 searchType이면 전체를 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'unknown', searchValue: '홍길동' }, 1, 10);
      expect(result.total).toBe(3);
    });

    it('searchValue가 빈 문자열이면 전체를 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, searchType: 'orderName', searchValue: '' }, 1, 10);
      expect(result.total).toBe(3);
    });
  });

  describe('날짜 필터', () => {
    it('범위 안의 날짜만 반환한다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, startDate: '2024-01-01', endDate: '2024-01-19' }, 1, 10);
      expect(result.total).toBe(1); // ORD-001 (2024-01-15)만 포함
      expect(result.orders[0].orderNumber).toBe('ORD-001');
    });

    it('dateType이 orderCollectionDate이면 수집일 기준으로 필터링한다', () => {
      const result = getMockOrders('owner-1',
        { ...defaultFilters, dateType: 'orderCollectionDate', startDate: '2024-01-01', endDate: '2024-12-31' },
        1,
        10,
      );
      expect(result.total).toBe(3);
    });
  });

  describe('페이지네이션', () => {
    it('page 1, pageSize 2면 첫 두 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 2);
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].orderNumber).toBe('ORD-001');
      expect(result.orders[1].orderNumber).toBe('ORD-002');
    });

    it('page 2, pageSize 2면 나머지 주문을 반환한다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 2, 2);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderNumber).toBe('ORD-003');
    });

    it('3개 데이터에 pageSize 2면 totalPages가 2다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 1, 2);
      expect(result.totalPages).toBe(2);
    });

    it('결과가 0개면 totalPages가 1이다', () => {
      const result = getMockOrders('owner-1', { ...defaultFilters, orderStatus: 'REQUEST_CANCEL' }, 1, 10);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it('응답에 page와 pageSize가 포함된다', () => {
      const result = getMockOrders('owner-1', defaultFilters, 2, 5);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
    });
  });
});
```

`src/mocks/utils/getHomeOrderStats.test.ts`도 동일하게 `shoppingMallName`→`mallCode`, `shoppingMallId`→`mallId`로 교체 (10, 11번째 줄):

```typescript
  mallCode: 'COUP',
  mallId: 'mall-1',
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test -- getOrders getHomeOrderStats`
Expected: `getMockOrders` 쪽 "쇼핑몰 필터"/"아이디 필터" describe 블록 다수 FAIL — `item.shoppingMallName`/`item.shoppingMallId`가 여전히 옛 필드를 참조하는데 fixture에는 `mallCode`/`mallId`만 있어 필터링 결과가 어긋난다. (`getHomeOrderStats`는 필터링에 몰 코드를 쓰지 않으므로 FAIL하지 않을 수 있음 — 정상)

- [ ] **Step 3: 타입 정의 리네임**

`src/features/order/types/order.types.ts` 4-14번째 줄과 43-44번째 줄(주석), 66-90번째 줄을 아래로 교체:

```typescript
export interface OrderSearchType {
  dateType: string;
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  mallId: string;
  deliveryCompany: string;
  orderStatus: string;
  searchType: string;
  searchValue: string;
}
```

주석 블록(43-44번째 줄):
```typescript
쇼핑몰명(코드) - mallCode - 글로벌 쇼핑몰 인터페이스 참조
쇼핑몰계정ID - mallId
```

`Order` 인터페이스(66-90번째 줄 중 72-73번째 줄):
```typescript
export interface Order {
  orderNumber: string;
  shopOrderNumber: string;
  orderStatus: OrderStatusTypes;
  paymentDate: string;
  orderCollectionDate: string;
  mallCode: ShoppingMalls;
  mallId: string;
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
  // (이하 필드는 파일의 기존 내용 그대로 유지)
```

- [ ] **Step 4: order 검색 store 리네임**

`src/features/order/store/search.store.ts` 전체를 아래로 교체:

```typescript
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { OrderSearchType } from '../types/order.types';
import { ShoppingMalls } from '@/types/common.type';

const DEFAULT_DATE_TYPE = 'orderCollectionDate';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_ORDER_STATUS = 'ALL';
const DEFAULT_SEARCH_TYPE = 'orderName';

export const currentPageAtom = atom<number>(1);

export const dateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);
export const startDateAtom = atom<string>(DEFAULT_START_DATE);
export const endDateAtom = atom<string>(DEFAULT_END_DATE);
export const mallCodeAtom = atom<ShoppingMalls | 'ALL'>('ALL');
export const mallIdAtom = atom<string>('ALL');
export const deliveryCompanyAtom = atom<string>('ALL');
export const orderStatusAtom = atom<string>(DEFAULT_ORDER_STATUS);
export const searchTypeAtom = atom<string>(DEFAULT_SEARCH_TYPE);
export const searchValueAtom = atom<string>('');

export const selectedOrdersAtom = atom<string[]>([]);

// UI 조작 중인 draft 필터 (검색 버튼 클릭 전까지 API 호출에 사용되지 않음)
export const getOrderSearchFilterAtom = atom<OrderSearchType>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  mallCode: get(mallCodeAtom),
  mallId: get(mallIdAtom),
  deliveryCompany: get(deliveryCompanyAtom),
  orderStatus: get(orderStatusAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));

// 검색 버튼 클릭 시 확정된 필터 (API 쿼리에 실제로 사용)
export const committedFiltersAtom = atom<OrderSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mallCode: 'ALL',
  mallId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: DEFAULT_ORDER_STATUS,
  searchType: DEFAULT_SEARCH_TYPE,
  searchValue: '',
});
```

- [ ] **Step 5: OrderMallFilter 컴포넌트 리네임**

`src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx` 전체를 아래로 교체:

```typescript
'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  mallCodeAtom,
  mallIdAtom,
  deliveryCompanyAtom,
} from '@/features/order/store/search.store';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { DELIVERY_COMPANY } from '@/shared/constant/delivery.constant';
import { FilterOption, ShoppingMalls } from '@/types/common.type';

const ALL_OPTION: FilterOption = { id: 'ALL', name: '전체' };

// 쇼핑몰별 계정 ID 목록 (실 데이터 연동 전 빈 매핑)
const MALL_ACCOUNTS: Record<string, FilterOption[]> = {};

export const OrderMallFilter = () => {
  const [mallCode, setMallCode] = useAtom(mallCodeAtom);
  const [mallId, setMallId] = useAtom(mallIdAtom);
  const [deliveryCompany, setDeliveryCompany] = useAtom(deliveryCompanyAtom);

  const mallOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...SHOPPING_MALLS.map((mall) => ({ id: mall.code, name: mall.name }))],
    [],
  );

  const accountOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...(mallCode !== 'ALL' ? (MALL_ACCOUNTS[mallCode] ?? []) : [])],
    [mallCode],
  );

  const deliveryOptions: FilterOption[] = [ALL_OPTION, ...DELIVERY_COMPANY];

  const handleMallChange = (value: string) => {
    setMallCode(value as ShoppingMalls | 'ALL');
    setMallId('ALL');
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">선택사항</Label>
      <Select value={mallCode} onValueChange={handleMallChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="쇼핑몰 선택" />
        </SelectTrigger>
        <SelectContent>
          {mallOptions.map((option: FilterOption) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={mallId} onValueChange={setMallId}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="아이디 선택" />
        </SelectTrigger>
        <SelectContent>
          {accountOptions.map((option: FilterOption) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={deliveryCompany} onValueChange={setDeliveryCompany}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="택배사" />
        </SelectTrigger>
        <SelectContent>
          {deliveryOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
```

- [ ] **Step 6: getOrders.ts 필터링 로직 리네임**

`src/mocks/utils/getOrders.ts` 전체를 아래로 교체:

```typescript
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Order, OrderSearchType } from '@/features/order/types/order.types';
import { MOCK_ORDERS_DATA } from '../data/MockOrdersData';

dayjs.extend(isBetween);

const filterByDate = (dateType: string, startDate: string, endDate: string, data: Order[]) => {
  const field = dateType === 'paymentDate' ? 'paymentDate' : 'orderCollectionDate';
  return data.filter((item) => dayjs(item[field]).isBetween(startDate, endDate, 'day', '[]'));
};

const filterByMallCode = (mallCode: string, data: Order[]) => {
  if (!mallCode || mallCode === 'ALL') return data;
  return data.filter((item) => item.mallCode === mallCode);
};

const filterByMallId = (mallId: string, data: Order[]) => {
  if (!mallId || mallId === 'ALL') return data;
  return data.filter((item) => item.mallId === mallId);
};

const filterByOrderStatus = (orderStatus: string, data: Order[]) => {
  if (!orderStatus || orderStatus === 'ALL') return data;
  return data.filter((item) => item.orderStatus === orderStatus);
};

const filterBySearchValue = (searchType: string, searchValue: string, data: Order[]) => {
  if (!searchValue) return data;
  const searchMap: Record<string, (item: Order) => string> = {
    orderName: (item) => item.orderName,
    payeeName: (item) => item.payeeName,
    orderProductName: (item) => item.orderProductName,
    orderNumber: (item) => item.orderNumber,
    shopOrderNumber: (item) => item.shopOrderNumber,
  };
  const getter = searchMap[searchType];
  if (!getter) return data;
  return data.filter((item) => getter(item).includes(searchValue));
};

export const getMockOrders = (ownerId: string, filters: OrderSearchType, page: number, pageSize: number) => {
  const { dateType, startDate, endDate, mallCode, mallId, orderStatus, searchType, searchValue } = filters;

  const byOwner = MOCK_ORDERS_DATA.filter((o) => o.ownerId === ownerId);
  const byDate = filterByDate(dateType, startDate, endDate, byOwner);
  const byMall = filterByMallCode(mallCode, byDate);
  const byAccountId = filterByMallId(mallId, byMall);
  const byStatus = filterByOrderStatus(orderStatus, byAccountId);
  const filtered = filterBySearchValue(searchType, searchValue, byStatus);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const orders = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { orders, total, page, pageSize, totalPages };
};
```

- [ ] **Step 7: mock 데이터 25건 일괄 리네임**

`src/mocks/data/MockOrdersData.ts`는 25개 항목 × 2필드(50줄) 순수 필드명 치환이라 커맨드로 처리한다:

```bash
sed -i 's/shoppingMallName:/mallCode:/g; s/shoppingMallId:/mallId:/g' "src/mocks/data/MockOrdersData.ts"
```

변경 후 잔여 여부 확인:
```bash
grep -n "shoppingMallName\|shoppingMallId" src/mocks/data/MockOrdersData.ts
```
Expected: 출력 없음 (0건)

- [ ] **Step 8: 나머지 UI/전략 참조 리네임**

`src/features/order/ui/detail/OrderInfoSection.tsx` 43번째 줄:
```typescript
            <p className="text-sm font-medium">{getShoppingMallName(order.mallCode)}</p>
```

`src/features/order/ui/list/components/orderTable/OrderListTable.tsx` 73-74번째 줄:
```typescript
            <TableCell className="text-center">{getShoppingMallName(order.mallCode)}</TableCell>
            <TableCell className="text-center">{order.mallId}</TableCell>
```

`src/components/excel/strategies/orderExcelSaveStrategy.ts` 12-13번째 줄:
```typescript
    mallCode: (r['쇼핑몰명'] as Order['mallCode']) || 'GMK',
    mallId: (r['쇼핑몰ID'] as string) || '',
```

`src/features/order/constant/table.constant.ts` 34-41번째 줄:
```typescript
  {
    id: 'mallCode',
    title: '쇼핑몰명',
  },
  {
    id: 'mallId',
    title: '쇼핑몰ID',
  },
```

- [ ] **Step 9: 테스트 실행 → 통과 확인**

Run: `npm run test -- getOrders getHomeOrderStats`
Expected: 모든 테스트 PASS

- [ ] **Step 10: 전체 잔여 참조 검색 (누락 방지)**

```bash
grep -rn "shoppingMallName\|shoppingMallId\|\.shoppingMall\b" src --include=*.ts --include=*.tsx
```
Expected: 출력 없음 (0건) — 남아있다면 해당 파일을 마저 수정

- [ ] **Step 11: lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 12: Commit**

```bash
git add src/features/order/types/order.types.ts src/features/order/store/search.store.ts src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx src/mocks/utils/getOrders.ts src/mocks/data/MockOrdersData.ts src/mocks/utils/getOrders.test.ts src/mocks/utils/getHomeOrderStats.test.ts src/features/order/ui/detail/OrderInfoSection.tsx src/features/order/ui/list/components/orderTable/OrderListTable.tsx src/components/excel/strategies/orderExcelSaveStrategy.ts src/features/order/constant/table.constant.ts
git commit -m "refactor: Order 도메인 shoppingMallName/shoppingMallId/shoppingMall을 mallCode/mallId로 리네임"
```

---

### Task 3: ShoppingAccountForm zod 스키마 강화 (as 캐스팅 제거)

**Files:**
- Modify: `src/features/shoppingAccount/ui/form/ShoppingAccountForm.tsx`
- Modify: `src/features/shoppingAccount/ui/create/ShoppingAccountCreateLayout.tsx`
- Modify: `src/features/shoppingAccount/ui/modify/ShoppingAccountModifyLayout.tsx`

**Interfaces:**
- Consumes: `SHOPPING_MALLS`(`@/shared/constant/shoppingMall.constant`), `ShoppingMalls`(`@/types/common.type`)
- Produces: `ShoppingAccountFormInput`(zod 입력 타입, `mallCode: string`), `ShoppingAccountFormData`(zod 출력 타입, `mallCode: ShoppingMalls`) — Create/ModifyLayout이 이 두 타입을 사용.

이 Task는 프로젝트 컨벤션(vitest 커버리지는 `src/mocks/utils/`로 한정, UI 컴포넌트는 신규 테스트 파일을 만들지 않음)에 따라 RED 테스트 스텝 없이 진행한다. 검증은 typecheck(`npm run build`)와 수동 dev 서버 확인으로 한다.

- [ ] **Step 1: zod 스키마 강화 + 입출력 타입 분리**

`src/features/shoppingAccount/ui/form/ShoppingAccountForm.tsx` 1-73번째 줄을 아래로 교체:

```typescript
'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MALL_NAME_OPTIONS } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { PHONE_REGEX } from '@/shared/utils/phone';
import { MOCK_CATEGORY_DATA } from '@/mocks/data/MockCategoryData';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { ShoppingMalls } from '@/types/common.type';

const MALL_CODES: string[] = SHOPPING_MALLS.map((mall) => mall.code);

const shoppingAccountSchema = z.object({
  mallCode: z
    .string()
    .min(1, '쇼핑몰을 선택해주세요.')
    .refine((val): val is ShoppingMalls => MALL_CODES.includes(val), {
      message: '유효하지 않은 쇼핑몰입니다.',
    }),
  mallId: z.string().min(1, '쇼핑몰 ID를 입력해주세요.'),
  password: z.string().min(1, '패스워드를 입력해주세요.'),
  isActive: z.boolean(),
  nickname: z.string().optional(),
  managerMd: z.string().min(1, '담당MD를 입력해주세요.'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: '올바른 연락처 형식을 입력해주세요. (예: 010-1234-5678)',
    }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: '올바른 이메일 형식을 입력해주세요.',
    }),
  domain: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요.'),
  apiKey: z.string().optional(),
});

export type ShoppingAccountFormInput = z.input<typeof shoppingAccountSchema>;
export type ShoppingAccountFormData = z.output<typeof shoppingAccountSchema>;

interface ShoppingAccountFormProps {
  defaultValues?: Partial<ShoppingAccountFormData>;
  onSubmit: (data: ShoppingAccountFormData) => void;
  isSubmitting?: boolean;
  mode: 'create' | 'edit';
}

const IS_ACTIVE_OPTIONS = [
  { value: 'true', label: '사용' },
  { value: 'false', label: '미사용' },
];

export const ShoppingAccountForm = ({ defaultValues, onSubmit, isSubmitting, mode }: ShoppingAccountFormProps) => {
  const router = useRouter();

  const form = useForm<ShoppingAccountFormInput, unknown, ShoppingAccountFormData>({
    resolver: zodResolver(shoppingAccountSchema),
    defaultValues: {
      mallCode: '',
      mallId: '',
      password: '',
      isActive: true,
      nickname: '',
      managerMd: '',
      phone: '',
      email: '',
      domain: '',
      category: '',
      apiKey: '',
      ...defaultValues,
    },
  });
```

나머지(75번째 줄부터의 JSX, `form.reset(...)` 등)는 필드/속성명 변경이 없으므로 그대로 둔다.

- [ ] **Step 2: Create/Modify 제출부의 `as` 캐스팅 제거**

`src/features/shoppingAccount/ui/create/ShoppingAccountCreateLayout.tsx` 14-27번째 줄:

```typescript
  const handleSubmit = (data: ShoppingAccountFormData) => {
    const body: CreateShoppingAccountBody = {
      mallCode: data.mallCode,
      mallId: data.mallId,
      password: data.password,
      isActive: data.isActive,
      nickname: data.nickname ?? '',
      managerMd: data.managerMd,
      phone: data.phone ?? '',
      email: data.email ?? '',
      domain: data.domain ?? '',
      category: data.category,
      apiKey: data.apiKey ?? '',
    };
```

`src/features/shoppingAccount/ui/modify/ShoppingAccountModifyLayout.tsx` 20-33번째 줄:

```typescript
  const handleSubmit = (data: ShoppingAccountFormData) => {
    const body: UpdateShoppingAccountBody = {
      mallCode: data.mallCode,
      mallId: data.mallId,
      password: data.password,
      isActive: data.isActive,
      nickname: data.nickname ?? '',
      managerMd: data.managerMd,
      phone: data.phone ?? '',
      email: data.email ?? '',
      domain: data.domain,
      category: data.category,
      apiKey: data.apiKey,
    };
```

- [ ] **Step 3: typecheck 통과 확인**

Run: `npm run build`
Expected: `as CreateShoppingAccountBody['mallCode']` / `as UpdateShoppingAccountBody['mallCode']` 캐스팅 없이 타입 에러 없이 빌드 성공

- [ ] **Step 4: 수동 dev 서버 확인**

Run: `npm run dev`

브라우저에서 아래를 확인한다:
1. `/shopping/accounts/create` 접속 → 쇼핑몰 선택 없이 다른 필드만 채워 등록 클릭 → "쇼핑몰을 선택해주세요." 에러 메시지 노출 확인
2. 쇼핑몰 선택 후 등록 → 정상 등록되고 목록 페이지로 이동 확인
3. `/shopping/accounts/[id]` 수정 화면 진입 → 기존 쇼핑몰 값이 Select에 정상 선택되어 있는지 확인 → 다른 쇼핑몰로 변경 후 저장 → 정상 반영 확인

- [ ] **Step 5: lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 6: Commit**

```bash
git add src/features/shoppingAccount/ui/form/ShoppingAccountForm.tsx src/features/shoppingAccount/ui/create/ShoppingAccountCreateLayout.tsx src/features/shoppingAccount/ui/modify/ShoppingAccountModifyLayout.tsx
git commit -m "refactor: ShoppingAccountForm zod 스키마 강화로 mallCode as 캐스팅 제거"
```

---

### Task 4: 전체 통합 검증

**Files:** 없음 (검증 전용 Task)

- [ ] **Step 1: 전체 lint**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 전체 테스트**

Run: `npm run test`
Expected: 모든 테스트 PASS (CollectionJob/Order 리네임 포함, 기존 다른 테스트 회귀 없음)

- [ ] **Step 3: 전체 typecheck 겸 빌드**

Run: `npm run build`
Expected: 빌드 성공, 캐스팅 관련 타입 에러 없음

- [ ] **Step 4: 잔여 구 필드명 최종 검색**

```bash
grep -rn "\bmallName\b\|shoppingMallName\|shoppingMallId" src --include=*.ts --include=*.tsx
```
Expected: 출력 없음 (0건)

이 Task는 코드 변경이 없으므로 커밋하지 않는다.
