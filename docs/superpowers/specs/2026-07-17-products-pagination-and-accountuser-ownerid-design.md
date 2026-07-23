# 타입 중복/불일치 정리 3라운드 — products 서버사이드 페이지네이션 + AccountUser.ownerId non-null화

## 배경

2026-07-16 설계 누수 점검에서 발견된 타입 중복/불일치 항목 중 1~3번(몰 코드 필드명 통일, zod 강화)은 이미 별도 라운드로 완료·PR 생성됐다(`feat/type-naming-unification`). 이번 라운드는 남은 두 항목을 처리한다.

- **item 4:** `getProducts` API 응답이 미타이핑(`Promise<any>`)이고, 실제로는 다른 목록 도메인(Order/ShoppingAccount/ShoppingSetting/User)과 달리 서버사이드 페이지네이션 없이 전체 배열을 반환 + 클라이언트에서 `slice()`로 직접 페이지를 자르는 구조
- **item 5:** `AccountUser.ownerId`만 `string | null`, 나머지 도메인(ShoppingAccount/CollectionJob/Order)은 전부 `string`

## 범위

브레인스토밍 중 확정된 범위:

- **item 4는 넓은 수정으로 진행한다.** products도 다른 도메인처럼 `{products, total, page, pageSize, totalPages}` 응답 봉투 + 서버사이드 페이지네이션으로 통일한다. `Order` 도메인의 `GetOrdersResponse`/`getOrders(ownerId, filters, page, pageSize)` 패턴을 템플릿으로 따른다.
  - `ProductListLayout.tsx`의 `currentPage`는 기존 로컬 `useState` 그대로 유지한다. jotai atom(`currentPageAtom`)으로의 전환이나 `committedFiltersAtom` 분리는 이번 범위에 포함하지 않는다 — 검색/페이지네이션 atom 패턴 통일은 다음 라운드(hook/함수 중복 정리)의 범위다.
  - `product.types.ts`의 `ProductSearchParams`(`page?`/`limit?` 포함, 어디서도 사용되지 않는 죽은 타입)는 같은 파일을 건드리는 김에 삭제한다.
- **item 5는 앱 레벨 타입만 좁힌다.** DB 스키마(`src/db/schema.ts`의 `owner_id` 컬럼)에 `.notNull()`을 추가하거나 마이그레이션을 생성하지 않는다.
  - 2026-07-17 실 DB 직접 조회로 확인: 전체 유저 4명 중 `owner_id IS NULL`인 행 0건. 레거시 null 데이터는 실질적으로 존재하지 않는다.
  - `register/route.ts`, `account/users/create/route.ts`는 이미 항상 non-null `ownerId`를 기록한다 (각각 `ownerId: id`, `ownerId: session.ownerId`).
  - DB 컬럼 자체는 nullable로 남아있으므로, `NextAuth` `authorize()` 콜백에서 raw DB row를 `next-auth` `User` 타입(이번에 non-null로 좁힘)에 대입하는 지점 한 곳에서만 단일 assertion이 필요하다. 이 assertion이 이번 라운드에서 유일하게 허용되는 캐스팅이다.

## item 4 설계 — products 서버사이드 페이지네이션

### 리네임/변경 매핑

**`src/features/products/api/getProducts.ts`**
```ts
import { Product, ProductSearch } from '../types/product.types';

export interface GetProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getProducts = async (
  ownerId: string,
  data: ProductSearch,
  page: number,
  pageSize: number = 10,
) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, ...data, page, pageSize }),
  });

  if (!response.ok) {
    throw new Error('상품목록 호출 실패');
  }

  return response.json() as Promise<GetProductsResponse>;
};
```

**`src/mocks/utils/getProducts.ts`** — `getMockProducts`가 필터링 이후 `page`/`pageSize`로 슬라이스하고 봉투를 반환하도록 변경. 기존 필터링 헬퍼 함수(`getProductsByDate`/`getProductsBySaleType`/`getProductsByCategoryId`/`getProductsBysearchValue`)는 전부 그대로 유지하고, `getMockProducts` 본문 마지막에 Order 도메인과 동일한 페이지네이션 계산만 추가한다:
```ts
export const getMockProducts = (
  ownerId: string,
  searchParams: ProductSearch,
  page: number,
  pageSize: number,
) => {
  const { dateType, startDate, endDate, saleType, categoryId, searchValue } = searchParams;
  const byOwner = MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId);
  const resultByDate = getProductsByDate(dateType, startDate, endDate, byOwner);
  const resultByType = getProductsBySaleType(saleType, resultByDate);
  const resultByCategory = getProductsByCategoryId(categoryId, resultByType);
  const filtered = getProductsBysearchValue(searchValue, resultByCategory);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const products = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { products, total, page, pageSize, totalPages };
};
```

**`src/mocks/handlers/products.ts`** — `products/list` 핸들러가 요청 body에서 `page`/`pageSize`를 함께 꺼내 `getMockProducts`로 전달:
```ts
http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
  const { ownerId, page, pageSize, ...searchParams } = (await request.json()) as ProductSearch & {
    ownerId: string;
    page: number;
    pageSize: number;
  };
  return HttpResponse.json(getMockProducts(ownerId, searchParams, page, pageSize));
}),
```

**`src/features/products/ui/list/ProductListLayout.tsx`** — `useQuery` 제네릭을 `GetProductsResponse`로 바꾸고, `getProducts` 호출에 `currentPage`/`pageSize=10` 전달, 응답에서 `products`/`total`/`totalPages`를 꺼내 하위로 전달:
```ts
const PAGE_SIZE = 10;
// ...
const { data, isLoading, isError } = useQuery<GetProductsResponse>({
  queryKey: ['products', workspaceOwnerId, appliedFilter, currentPage],
  queryFn: () => getProducts(workspaceOwnerId, appliedFilter, currentPage, PAGE_SIZE),
  enabled: !!workspaceOwnerId,
});
const products = data?.products ?? [];
const total = data?.total ?? 0;
const totalPages = data?.totalPages ?? 1;
```
`queryKey`에 `currentPage`를 추가해 페이지 변경 시 재조회되도록 한다 (기존엔 클라이언트 슬라이스라 불필요했지만, 서버사이드로 바뀌면 필수).

**`src/features/products/ui/list/ProductListTableSection.tsx`** — 로컬 `PAGE_SIZE`/`slice` 계산 제거, `total`/`totalPages`를 props로 받아 그대로 사용:
```ts
type Props = {
  products: Product[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
  searchCount: number;
};

export const ProductListTableSection = ({ products, total, totalPages, currentPage, onChangePage, isLoading, searchCount }: Props) => {
  return (
    <Card>
      <CardHeader>
        <ProductTableHeader total={isLoading ? undefined : total} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <ProductTableBody key={searchCount} products={products} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
```
`ProductListLayout.tsx`가 이 컴포넌트에 `total`/`totalPages`를 추가로 전달하도록 호출부도 함께 수정한다.

**`src/features/products/types/product.types.ts`** — 사용처 없는 `ProductSearchParams` 인터페이스(31-37번째 줄) 삭제.

## item 5 설계 — AccountUser.ownerId non-null화

**`src/features/account/types/user.types.ts`**
```ts
export interface AccountUser extends User {
  id: string;
  status: UserStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  // ...
}
```

**`src/features/auth/store/auth.store.ts`**
```ts
export const ownerIdAtom = atom<string>('');
// ...
export type UserWithId = User & { id: string; ownerId: string };
// ...
/**
 * 로그인한 계정의 워크스페이스 소유자 id
 * - super_admin: 자신의 id (가입 시 ownerId=id로 자기참조 기록됨)
 * - admin/operator: 자신의 ownerId (슈퍼계정 id)
 * - 로그아웃 상태: '' (falsy이므로 React Query enabled 게이팅에 그대로 사용 가능)
 */
export const workspaceOwnerIdAtom = atom<string>((get) => get(ownerIdAtom));
// ...
export const resetUserInfoAtom = atom(null, (_, set) => {
  set(idAtom, '');
  set(ownerIdAtom, '');
  // ... (나머지 동일)
});
```
`idAtom`은 그대로 유지한다 (세션 id로 여전히 다른 곳에서 쓰임).

**`src/types/next-auth.d.ts`** — JWT(`token.ownerId`), `Session.user.ownerId`, `User.ownerId` 3곳 모두 `string | null` → `string`.

**`src/shared/utils/apiAuth.ts`**
```ts
export async function requireSession(req: NextRequest): Promise<ApiSession | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  return {
    id: token.id,
    ownerId: token.ownerId,
    grade: token.grade,
    email: token.email ?? '',
  };
}
```
(`?? token.id` fallback 제거)

**`src/app/api/auth/[...nextauth]/route.ts`** (42번째 줄) — 이번 라운드의 유일한 캐스팅 지점:
```ts
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            // DB 컬럼(owner_id)은 nullable이지만 앱 레벨에서는 항상 non-null로 기록됨
            // (가입/사용자등록 시 자기 id 또는 세션 ownerId로 채움). 2026-07-17 실 DB 확인: null 0건.
            ownerId: user.ownerId as string,
            grade: user.grade as UserGrade,
            // ...
          };
```

## 실행/검증 순서

item 4와 item 5는 서로 다른 도메인(products vs auth/account)이라 순서 상관없이 독립적으로 진행 가능하지만, 지난 라운드와 동일하게 단계별로 나눠 검증한다.

1. **item 4 (products 페이지네이션)** → `npm run lint` + `npm run test` + `npm run build`(typecheck) 통과 확인 + 수동 dev 서버로 `/products/list` 페이지네이션 동작 확인(페이지 이동 시 목록 갱신, 총 개수 표시 정상)
2. **item 5 (ownerId non-null)** → `npm run build`(typecheck)로 next-auth 타입 확인 + `npm run lint` + 수동 dev 서버로 로그인/로그아웃/사용자관리 목록 조회가 정상 동작하는지 확인 (특히 로그아웃 후 재로그인 시 `workspaceOwnerIdAtom`이 올바르게 갱신되는지)
3. **전체 최종 검증** → `npm run lint && npm run test && npm run build` 통과 확인

## 테스트 범위

- item 4: `src/mocks/utils/getProducts.test.ts`는 이미 존재한다(기존 3개 테스트, 구 시그니처 `getMockProducts(ownerId, searchParams)` 기준). 계획 작성 단계에서 재확인한 결과이며, 이 스펙 초안 작성 시점에는 부재로 잘못 파악했었다. 이번 변경으로 시그니처와 반환 형태가 바뀌므로 기존 3개 테스트를 새 형태로 갱신하고, 페이지네이션(총 개수/페이지 슬라이스/totalPages 계산) 테스트를 추가한다. Order 도메인의 `getOrders.test.ts` 구조를 참고한다.
- item 5: `auth.store.ts`/`apiAuth.ts`/`next-auth.d.ts`/NextAuth route는 이 프로젝트 컨벤션상 vitest 커버리지 대상이 아니다(순수 타입 변경 + 세션/스토어 로직). typecheck + 수동 확인으로 검증한다.

## 영향 없음 / 명시적 비대상

- `ProductSearch` 타입 자체(날짜/카테고리/판매상태 등 필터 필드)는 변경 없음 — `page`/`pageSize`는 별도 함수 파라미터로 추가(Order 패턴과 동일)
- `ProductListLayout.tsx`의 `currentPage` 로컬 `useState` → jotai atom 전환은 이번 범위 아님 (다음 라운드: hook/함수 중복 정리)
- `src/db/schema.ts`의 `owner_id` 컬럼 및 DB 마이그레이션은 변경하지 않음
- `account/users/create/route.ts`, `account/users/list/route.ts` 등 이미 non-null `ownerId`를 기록/필터링하는 기존 로직은 변경 없음 (타입만 실제 동작을 정확히 반영하도록 좁힘)
