# Order/Products/Home ownerId 테넌트 격리 설계

- 작성일: 2026-07-12
- 상태: 승인 대기
- 선행 문서: `docs/superpowers/specs/2026-07-12-shopping-malls-type-redefinition-design.md` (이 작업에서 `Order`/`CollectionJob`의 `ownerId` 공백을 발견, 다음 라운드로 이월)
- 참고 메모리: `project_order_ownerid_gap`, `project_user_hierarchy_design`

## 배경 및 범위

`ShoppingMalls` 타입 재정의 작업 완료 후 진행하기로 한 "Order/CollectionJob ownerId 테넌트 격리" 작업을 시작하기 전, 프로젝트 전체를 재조사했다. 그 결과 `Order`/`CollectionJob`뿐 아니라 **`products` 도메인과, 이 둘을 그대로 집계하는 `home` 대시보드도 동일하게 `ownerId` 격리가 전혀 없다**는 게 확인됐다. `ShoppingAccount`/`ShoppingSetting`은 이미 `ownerId`를 API 계약(함수 시그니처)에 박아뒀지만, `order`/`products`/`home`은 그 이전에 만들어진 도메인이라 소급 적용이 안 된 상태였다.

세 도메인이 서로 데이터를 공유(`home`이 `order`+`products`를 집계)하고 있어 하나만 고치면 나머지가 계속 섞인 채로 남기 때문에, 이번 라운드에서 세 도메인을 함께 처리한다.

### 범위 내

- `order`/`collection`: 목록 조회(`orders/list`, `order/collection/jobs`) + 생성(`orders/bulk`)
- `products`: 목록 조회(`products/list`) + 생성(`products/create`, `products/bulk`)
- `home`: 통계 3종(`home/stats`, `home/recent-products`, `home/order-stats`)
- 엑셀 대량등록(`orderExcelSaveStrategy`/`productExcelSaveStrategy`) 저장 경로의 `ownerId` 배선
- mock 데이터에 `ownerId` 값 채우기 (기존 로그인 계정 `SUPER_A_ID`로 전량 부여)

### 범위 외 (다음 라운드로 이월)

- **단건 조회/수정 등 나머지 엔드포인트의 ownership 검증** — `orders/:orderId`(GET/PATCH/claim/comments/history), `products/:productId`(GET/PATCH), `order/collection/trigger`. 이번 라운드는 목록·생성만 다루고, 단건 조회는 기존 `ShoppingAccount`도 갖고 있지 않은 더 엄격한 기준이라 별도 라운드로 미룬다. **`Order`만이 아니라 `ShoppingAccount`를 포함한 전 도메인을 한 번에 다루는 작업으로 설계할 것** — 도메인별로 따로 고치면 어떤 도메인은 막혀있고 어떤 도메인은 안 막혀있는 불일치가 생기기 때문.
- `order`/`products` 외 다른 도메인(예: `shoppingAccount`/`shoppingSetting`)은 이미 정상이므로 변경 없음.

## 공통 원칙

`ShoppingAccount`가 이미 쓰고 있는 표준 패턴을 그대로 복제한다:

```ts
// 목록 조회
export const getXxx = async (ownerId: string, filters: XxxSearchType, page: number, pageSize = N) => {
  body: JSON.stringify({ ownerId, filters, page, pageSize })
};
// useGetXxx 훅
const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
useQuery({ queryKey: [KEY, workspaceOwnerId, filters, page], queryFn: () => getXxx(workspaceOwnerId, filters, page), enabled: !!workspaceOwnerId });

// 생성
export const createXxx = async (body: CreateXxxBody, ownerId: string) => {
  body: JSON.stringify({ ...body, ownerId })
};
```

`workspaceOwnerIdAtom`(`src/features/auth/store/auth.store.ts`)은 `ownerId ?? id` fallback을 이미 내장하고 있으므로 그대로 재사용한다.

## 섹션 1. `order`/`collection` 도메인

### 타입 변경

```ts
// src/features/order/types/order.types.ts
export interface Order {
  // ...기존 필드
  ownerId: string;
}
```

```ts
// src/features/order/types/collection.types.ts
export interface CollectionJob {
  // ...기존 필드 (mallId 등)
  ownerId: string;
}
```

### `orders/list` — `ownerId` 필터 추가

```ts
// src/mocks/handlers/orders.ts
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

```ts
// src/mocks/utils/getOrders.ts
export const getMockOrders = (ownerId: string, filters: OrderSearchType, page: number, pageSize: number) => {
  const byOwner = MOCK_ORDERS_DATA.filter((o) => o.ownerId === ownerId);
  const byDate = filterByDate(filters.dateType, filters.startDate, filters.endDate, byOwner);
  // ...이하 기존 필터 체인 그대로, 대상 배열만 byOwner로 교체
};
```

```ts
// src/features/order/api/getOrders.ts
export const getOrders = async (ownerId: string, filters: OrderSearchType, page: number, pageSize: number = 20) => {
  body: JSON.stringify({ ownerId, filters, page, pageSize })
};
```

```ts
// src/features/order/api/useGetOrders.ts
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

### `orders/bulk` — 생성 시 `ownerId` 스탬핑

```ts
// src/mocks/handlers/orders.ts
http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
  await delay(500);
  const { ownerId, orders } = (await request.json()) as { ownerId: string; orders: Order[] };
  MOCK_ORDERS_DATA.push(...orders.map((o) => ({ ...o, ownerId })));
  return HttpResponse.json({ success: true, count: orders.length });
}),
```

```ts
// src/features/order/api/bulkCreateOrders.ts
export const bulkCreateOrders = async (data: Order[], ownerId: string) => {
  body: JSON.stringify({ ownerId, orders: data })
};
```

### `order/collection/jobs` — `ownerId` 쿼리파라미터 추가

```ts
// src/mocks/handlers/collection.ts
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

```ts
// src/mocks/utils/getCollectionJobs.ts
export function getCollectionJobsMock(ownerId: string, params: CollectionSearchParams): CollectionJob[] {
  // ...기존 progress 갱신 로직 유지
  return MOCK_COLLECTION_JOBS.filter((job) => {
    if (job.ownerId !== ownerId) return false;
    if (params.mallCode !== 'ALL' && job.mallName !== params.mallCode) return false;
    if (params.mallId !== 'ALL' && job.mallId !== params.mallId) return false;
    return true;
  });
}
```

```ts
// src/features/order/api/getCollectionJobs.ts
export async function getCollectionJobs(ownerId: string, params: CollectionSearchParams): Promise<CollectionJob[]> {
  const query = new URLSearchParams({ ownerId, startDate: params.startDate, endDate: params.endDate, mallCode: params.mallCode, mallId: params.mallId });
  // ...
}
```

```ts
// src/features/order/api/useGetCollectionJobs.ts
const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
const searchParams = useAtomValue(collectSearchParamsAtom);
useQuery({
  queryKey: [COLLECTION_JOBS_QUERY_KEY, workspaceOwnerId, searchParams],
  queryFn: () => getCollectionJobs(workspaceOwnerId, searchParams),
  enabled: !!workspaceOwnerId,
  refetchInterval: /* 기존 그대로 */,
});
```

### 범위 외로 남는 것 (변경 없음)

`GET/PATCH /api/orders/:orderId`, `GET /api/orders/:orderId/{claim,comments,history}`, `POST /api/orders/:orderId/comments`, `POST /api/order/collection/trigger`.

## 섹션 2. `products` 도메인

### 타입 변경

```ts
// src/features/products/types/product.types.ts
export interface Product {
  // ...기존 필드
  ownerId: string;
}
export type CreateProductRequest = Omit<Product, 'productId' | 'ownerId' | 'createDate' | 'updateDate'>;
```

### `products/list` — `ownerId` 필터 추가

```ts
// src/mocks/handlers/products.ts
http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
  const { ownerId, ...searchParams } = (await request.json()) as ProductSearch & { ownerId: string };
  return HttpResponse.json(getMockProducts(ownerId, searchParams));
}),
```

```ts
// src/mocks/utils/getProducts.ts
export const getMockProducts = (ownerId: string, searchParams: ProductSearch) => {
  const byOwner = MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId);
  const resultByDate = getProductsByDate(searchParams.dateType, searchParams.startDate, searchParams.endDate, byOwner);
  // ...이하 기존 필터 체인 그대로 (getProductsByDate가 대상 배열을 인자로 받도록 시그니처 조정)
};
```

```ts
// src/features/products/api/getProducts.ts
export const getProducts = async (ownerId: string, data: ProductSearch) => {
  body: JSON.stringify({ ownerId, ...data })
};
```

```tsx
// src/features/products/ui/list/ProductListLayout.tsx
const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
const { data: products = [] } = useQuery<Product[]>({
  queryKey: ['products', workspaceOwnerId, appliedFilter],
  queryFn: () => getProducts(workspaceOwnerId, appliedFilter),
  enabled: !!workspaceOwnerId,
});
```

### `products/create`, `products/bulk` — 생성 시 `ownerId` 스탬핑

```ts
// src/mocks/handlers/products.ts
http.post(`${baseUrl}/api/products/create`, async ({ request }) => {
  const { ownerId, ...data } = (await request.json()) as Product & { ownerId: string };
  const newProduct = createMockProduct({ ...data, ownerId });
  MOCK_PRODUCT_DATA.push(newProduct);
  return HttpResponse.json(newProduct);
}),

http.post(`${baseUrl}/api/products/bulk`, async ({ request }) => {
  await delay(500);
  const { ownerId, products } = (await request.json()) as { ownerId: string; products: Product[] };
  MOCK_PRODUCT_DATA.push(...products.map((p) => ({ ...p, ownerId })));
  return HttpResponse.json({ success: true, count: products.length });
}),
```

```ts
// src/features/products/api/createProduct.ts
export const createProduct = async (data: CreateProductRequest, ownerId: string) => {
  body: JSON.stringify({ ...data, ownerId })
};

// src/features/products/api/bulkCreateProducts.ts
export const bulkCreateProducts = async (data: Product[], ownerId: string) => {
  body: JSON.stringify({ ownerId, products: data })
};
```

`ProductCreateLayout.tsx`에서 `workspaceOwnerIdAtom`을 읽어 `createProduct(data, workspaceOwnerId)`로 전달.

### 범위 외로 남는 것 (변경 없음)

`GET/PATCH /api/products/:productId`.

## 섹션 3. `home` 도메인

`home/stats`, `home/recent-products`는 파라미터 없는 `GET`이었으나 `ownerId`가 필요해지므로 **`GET`→`POST`로 전환**한다 (msw-rules: "필터 조건을 body로 전달하는 조회는 POST").

```ts
// src/mocks/handlers/home.ts
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
    const { ownerId, startDate, endDate } = (await request.json()) as { ownerId: string; startDate: string; endDate: string };
    return HttpResponse.json(getMockHomeOrderStats(ownerId, startDate, endDate));
  }),
];
```

```ts
// src/mocks/utils/getHomeData.ts
export const getMockHomeStats = (ownerId: string): HomeStats => {
  const owned = MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId);
  // ...이하 기존 카운트 로직, 대상 배열만 owned로 교체
};

export const getMockRecentProducts = (ownerId: string): RecentProduct[] => {
  const owned = MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId);
  // ...이하 기존 정렬/슬라이스 로직, 대상 배열만 owned로 교체
};
```

```ts
// src/mocks/utils/getHomeOrderStats.ts
export const getMockHomeOrderStats = (ownerId: string, startDate: string, endDate: string): HomeOrderStats => {
  const owned = MOCK_ORDERS_DATA.filter((o) => o.ownerId === ownerId);
  const filtered = owned.filter((o) => { /* 기존 날짜 필터 그대로 */ });
  // ...
};
```

```ts
// src/features/home/api/getHomeStats.ts
export const getHomeStats = async (ownerId: string): Promise<HomeStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  // ...
};
// getRecentProducts.ts, getHomeOrderStats.ts도 동일하게 POST + ownerId body로 전환
```

```tsx
// src/features/home/ui/HomeLayout.tsx
const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

const { data: stats } = useQuery({
  queryKey: ['home', 'stats', workspaceOwnerId],
  queryFn: () => getHomeStats(workspaceOwnerId),
  enabled: !!workspaceOwnerId,
});
// order-stats, recent-products도 동일 패턴
```

## 섹션 4. 엑셀 대량등록 연동

`orderExcelSaveStrategy`/`productExcelSaveStrategy`는 순수 변환 함수(`ExcelRowWithErrors[] → Order[]/Product[]`)로 유지하고, `ownerId`는 합성 함수(`getExcelSaveStrategy`) 레벨에서만 다룬다.

```ts
// src/components/excel/utils/getExcelSaveStrategy.ts
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

`getExcelSaveStrategy(type)`를 호출하는 곳(`ExcelDataPreview` 등)에서 `workspaceOwnerIdAtom`을 읽어 `getExcelSaveStrategy(type, workspaceOwnerId)`로 호출부만 수정한다. `orderExcelSaveStrategy`/`productExcelSaveStrategy` 내부의 필드 매핑 로직은 변경하지 않는다.

## 섹션 5. Mock 데이터 — `ownerId` 일괄 주입

기존 리터럴 배열은 건드리지 않고, export 시점에 `.map()`으로 `ownerId`를 주입한다. `SUPER_A_ID`는 `MockShoppingAccountsData.ts`에 이미 정의된 상수와 동일한 값(현재 로그인 계정)을 사용한다.

```ts
// src/mocks/data/MockOrdersData.ts
import { Order } from '@/features/order/types/order.types';

const SUPER_A_ID = 'usr_2f20748f';

const RAW_ORDERS: Omit<Order, 'ownerId'>[] = [
  // ...기존 약 45개 리터럴 객체 그대로, 변경 없음
];

export const MOCK_ORDERS_DATA: Order[] = RAW_ORDERS.map((o) => ({ ...o, ownerId: SUPER_A_ID }));
```

`MockProductsData.ts`, `MockCollectionJobsData.ts`도 동일한 `RAW_*` + `.map()` 패턴을 적용한다. `MOCK_ORDERS_DATA`/`MOCK_PRODUCT_DATA`/`MOCK_COLLECTION_JOBS`는 이후 `.push()`로 계속 추가되는 mutable 배열이므로(대량등록 등), `.map()` 결과를 그대로 `export const`로 노출해도 기존 참조·mutate 방식과 호환된다.

## 섹션 6. 검증 (Vitest)

`src/mocks/utils/`의 `ownerId` 필터링 로직에 대해 "다른 owner 데이터가 섞이지 않는지" 테스트를 추가한다.

- `getOrders.test.ts` (기존 파일 보강): `defaultFilters`에 `ownerId` 추가, "다른 owner 필터" `describe` 블록 신설 — 동일 조건에서 owner만 다른 주문이 있을 때 서로 섞이지 않는지 검증.
- `getCollectionJobs.test.ts` (신규): 기존 파일 없음 — 이번에 처음 만든다. `ownerId`가 다른 `CollectionJob`이 있을 때 필터링되는지 검증.
- `getProducts.test.ts` (신규): 기존 파일 없음 — `ownerId` 필터링 + 기존 날짜/판매상태/카테고리 필터가 owner 필터와 함께 정상 동작하는지 검증.
- `getHomeData.test.ts`, `getHomeOrderStats.test.ts` (신규): 각각 두 개의 서로 다른 `ownerId`를 가진 mock 데이터로 통계가 완전히 분리되는지 검증.

## 검증/엣지케이스

- `ownerId`가 빈 문자열이거나 `workspaceOwnerId`가 아직 로드되지 않은 시점(`enabled: !!workspaceOwnerId`)에는 쿼리가 실행되지 않아야 한다 — 기존 `ShoppingAccount` 패턴과 동일.
- 엑셀 대량등록 시 `ownerId` 없이 호출되는 경로가 남아있지 않은지 `getExcelSaveStrategy` 호출부를 전수 확인한다.
- `home` 두 엔드포인트의 `GET`→`POST` 전환 시, 기존에 이 엔드포인트를 직접 호출하는 다른 코드가 없는지 확인한다(현재는 `getHomeStats`/`getRecentProducts` 클라이언트 함수 경유만 존재).

## 다음 작업 (범위 외)

- 단건 조회/수정 등 나머지 엔드포인트의 ownership 검증 — `Order`뿐 아니라 `ShoppingAccount` 등 이미 존재하는 도메인도 포함해 전 도메인 일괄 적용 여부를 별도로 설계.
