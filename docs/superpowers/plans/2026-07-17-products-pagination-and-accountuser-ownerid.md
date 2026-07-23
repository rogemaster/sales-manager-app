# products 서버사이드 페이지네이션 + AccountUser.ownerId non-null화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** products 목록 API를 다른 도메인(Order 등)과 동일한 `{items, total, page, pageSize, totalPages}` 서버사이드 페이지네이션 봉투로 통일하고, `AccountUser.ownerId`를 실제 동작에 맞게 `string | null`에서 `string`으로 좁힌다.

**Architecture:** 두 Task는 완전히 분리된 도메인(products vs auth/account)이라 순서 상관없이 독립 진행 가능. 각 Task는 기존 테스트/타입을 새 시그니처로 먼저 바꿔 RED를 관찰한 뒤 구현을 맞추는 순서로 진행한다.

**Tech Stack:** TypeScript, Next.js 15 App Router, MSW 2, Vitest 4, NextAuth.js(JWT), drizzle-orm.

## Global Constraints

- 스펙 문서: `docs/superpowers/specs/2026-07-17-products-pagination-and-accountuser-ownerid-design.md`
- item 4의 `ProductSearch` 필터 필드 자체는 변경하지 않는다 — `page`/`pageSize`는 별도 함수 파라미터로 추가한다 (Order 도메인의 `getOrders(ownerId, filters, page, pageSize)` 패턴과 동일).
- `ProductListLayout.tsx`의 `currentPage`는 기존 로컬 `useState` 그대로 유지한다 — jotai atom 전환은 이번 범위 아님.
- item 5는 앱 레벨 타입만 좁힌다. `src/db/schema.ts`의 `owner_id` 컬럼이나 DB 마이그레이션은 건드리지 않는다.
- item 5에서 허용되는 유일한 캐스팅은 `src/app/api/auth/[...nextauth]/route.ts`의 NextAuth `authorize()` 콜백 한 곳(`ownerId: user.ownerId as string`)뿐이다. 다른 곳에서 캐스팅이 필요해지면 계획이 아니라 실제 코드 구조를 먼저 재검토한다.
- 커밋은 사용자가 명시적으로 요청한 시점에만 실행한다 (CLAUDE.md Git/PR 규칙) — 각 Task의 "커밋" 스텝은 안내이며 자동 실행하지 않는다.

---

### Task 1: products 서버사이드 페이지네이션 통일

**Files:**
- Test: `src/mocks/utils/getProducts.test.ts`
- Modify: `src/mocks/utils/getProducts.ts`
- Modify: `src/mocks/handlers/products.ts`
- Modify: `src/features/products/api/getProducts.ts`
- Modify: `src/features/products/ui/list/ProductListLayout.tsx`
- Modify: `src/features/products/ui/list/ProductListTableSection.tsx`
- Modify: `src/features/products/types/product.types.ts`

**Interfaces:**
- Produces: `GetProductsResponse { products: Product[]; total: number; page: number; pageSize: number; totalPages: number }` (`products/api/getProducts.ts`), `getMockProducts(ownerId: string, searchParams: ProductSearch, page: number, pageSize: number): { products, total, page, pageSize, totalPages }` (`mocks/utils/getProducts.ts`)

- [ ] **Step 1: 기존 테스트를 새 시그니처/반환 형태로 먼저 변경 (RED 유도)**

`src/mocks/utils/getProducts.test.ts` 전체를 아래로 교체한다 (기존 3개 테스트를 새 시그니처로 갱신 + 픽스처 3개 추가 + 페이지네이션 테스트 추가):

```typescript
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
  makeProduct({ productId: 'smp000004', ownerId: 'owner-1', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000005', ownerId: 'owner-1', state: 'ON_SALE' }),
  makeProduct({ productId: 'smp000006', ownerId: 'owner-1', state: 'ON_SALE' }),
);

import { getMockProducts } from './getProducts';

const defaultSearch = { dateType: '', startDate: '', endDate: '', saleType: 'ALL', categoryId: 'ALL', searchValue: '' };

describe('getMockProducts', () => {
  it('ownerId가 일치하는 상품만 반환한다', () => {
    const result = getMockProducts('owner-1', defaultSearch, 1, 10);
    expect(result.products).toHaveLength(5);
    expect(result.products.find((p) => p.productId === 'smp000003')).toBeUndefined();
  });

  it('존재하지 않는 ownerId면 빈 배열을 반환한다', () => {
    const result = getMockProducts('owner-999', defaultSearch, 1, 10);
    expect(result.products).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('ownerId 필터와 판매상태 필터를 함께 적용한다', () => {
    const result = getMockProducts('owner-1', { ...defaultSearch, saleType: 'SOLD_OUT' }, 1, 10);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].productId).toBe('smp000002');
  });

  describe('페이지네이션', () => {
    it('page 1, pageSize 2면 첫 두 상품을 반환한다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 1, 2);
      expect(result.products).toHaveLength(2);
      expect(result.products[0].productId).toBe('smp000001');
      expect(result.products[1].productId).toBe('smp000002');
    });

    it('page 3, pageSize 2면 마지막 한 개를 반환한다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 3, 2);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].productId).toBe('smp000006');
    });

    it('total은 페이지네이션 전 필터링된 전체 개수다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 1, 2);
      expect(result.total).toBe(5);
    });

    it('totalPages를 올바르게 계산한다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 1, 2);
      expect(result.totalPages).toBe(3);
    });

    it('결과가 0개면 totalPages가 1이다', () => {
      const result = getMockProducts('owner-999', defaultSearch, 1, 10);
      expect(result.totalPages).toBe(1);
    });

    it('응답에 page와 pageSize가 포함된다', () => {
      const result = getMockProducts('owner-1', defaultSearch, 2, 3);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(3);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test -- getProducts`
Expected: 다수 FAIL — `getMockProducts`가 아직 2개 인자만 받고 배열을 직접 반환하므로, `result.products`가 `undefined`가 되어 `toHaveLength`가 전부 실패한다.

- [ ] **Step 3: `getMockProducts`에 페이지네이션 구현**

`src/mocks/utils/getProducts.ts` 전체를 아래로 교체:

```typescript
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

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm run test -- getProducts`
Expected: `getMockProducts` describe 블록의 10개 테스트 전부 PASS

- [ ] **Step 5: MSW 핸들러가 page/pageSize를 전달하도록 수정**

`src/mocks/handlers/products.ts` 11-14번째 줄:

```typescript
  http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
    const { ownerId, page, pageSize, ...searchParams } = (await request.json()) as ProductSearch & {
      ownerId: string;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockProducts(ownerId, searchParams, page, pageSize));
  }),
```

- [ ] **Step 6: `getProducts` API 함수에 응답 타입 + page/pageSize 파라미터 추가**

`src/features/products/api/getProducts.ts` 전체를 아래로 교체:

```typescript
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

- [ ] **Step 7: `ProductListLayout.tsx`가 응답 봉투를 사용하도록 수정**

`src/features/products/ui/list/ProductListLayout.tsx` 전체를 아래로 교체:

```typescript
'use client';

import { useState } from 'react';
import { ProductHeaderSection, ProductSearchFilterSection, ProductTableSection } from '@/features/products/ui/list';
import { getSearchFilterAtom } from '../../store/search.store';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { getProducts, GetProductsResponse } from '../../api/getProducts';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';

export const ProductListLayout = () => {
  const currentFilter = useAtomValue(getSearchFilterAtom);
  const [appliedFilter, setAppliedFilter] = useState(currentFilter);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchCount, setSearchCount] = useState(0);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data, isLoading, isError } = useQuery<GetProductsResponse>({
    queryKey: ['products', workspaceOwnerId, appliedFilter, currentPage],
    queryFn: () => getProducts(workspaceOwnerId, appliedFilter, currentPage),
    enabled: !!workspaceOwnerId,
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = () => {
    setAppliedFilter(currentFilter);
    setCurrentPage(1);
    setSearchCount((prev) => prev + 1);
  };

  return (
    <>
      {/* 상품 목록 헤더 */}
      <ProductHeaderSection />
      {/* 검색 및 필터 */}
      <ProductSearchFilterSection onSearch={handleSearch} />
      {/* 상품 목록 테이블 */}
      {isError ? (
        <p className="py-10 text-center text-sm text-destructive">상품 목록을 불러오는데 실패했습니다.</p>
      ) : (
        <ProductTableSection
          products={products}
          total={total}
          totalPages={totalPages}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          isLoading={isLoading}
          searchCount={searchCount}
        />
      )}
    </>
  );
};
```

- [ ] **Step 8: `ProductListTableSection.tsx`에서 클라이언트 슬라이스 로직 제거**

`src/features/products/ui/list/ProductListTableSection.tsx` 전체를 아래로 교체:

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProductTableHeader } from '@/features/products/ui/list/components/productTable/ProductTableHeader';
import { ProductTableBody } from './components/productTable/ProductTableBody';
import { TablePagination } from '@/components/common/TablePagination';
import { Product } from '../../types/product.types';

type Props = {
  products: Product[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
  searchCount: number;
};

export const ProductListTableSection = ({
  products,
  total,
  totalPages,
  currentPage,
  onChangePage,
  isLoading,
  searchCount,
}: Props) => {
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

- [ ] **Step 9: 사용되지 않는 `ProductSearchParams` 삭제**

`src/features/products/types/product.types.ts`에서 아래 블록(31-38번째 줄, `// 검색 관련 타입들` 주석 아래의 `ProductSearchParams` 인터페이스 + 뒤따르는 빈 줄)을 삭제:

```typescript
export interface ProductSearchParams {
  category?: string;
  saleType?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

```

삭제 후 `// 검색 관련 타입들` 주석 바로 다음 줄에 `export interface ProductSearch {`가 오도록 한다.

- [ ] **Step 10: 전체 검증**

Run: `npm run lint`
Expected: 에러 없음

Run: `npm run test`
Expected: 전체 PASS (getProducts 포함)

Run: `npm run build`
Expected: 타입 에러 없이 빌드 성공

- [ ] **Step 11: 수동 dev 서버 확인**

Run: `npm run dev`

브라우저에서 `/products/list` 접속 → 상품이 10개(pageSize) 이상 있는 계정으로 로그인 후 페이지네이션 버튼으로 2페이지 이동 → 목록이 실제로 바뀌는지, 총 개수 표시가 정상인지 확인.

- [ ] **Step 12: Commit**

```bash
git add src/mocks/utils/getProducts.ts src/mocks/utils/getProducts.test.ts src/mocks/handlers/products.ts src/features/products/api/getProducts.ts src/features/products/ui/list/ProductListLayout.tsx src/features/products/ui/list/ProductListTableSection.tsx src/features/products/types/product.types.ts
git commit -m "refactor: products 목록 API를 서버사이드 페이지네이션으로 통일"
```

---

### Task 2: AccountUser.ownerId non-null화

**Files:**
- Modify: `src/features/account/types/user.types.ts`
- Modify: `src/features/auth/store/auth.store.ts`
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/shared/utils/apiAuth.ts`
- Modify: `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Consumes: 없음 (Task 1과 완전히 분리된 도메인)
- Produces: `AccountUser.ownerId: string`, `workspaceOwnerIdAtom: Atom<string>` — 이후 다른 라운드(hook/함수 중복 정리)에서 이 atom을 그대로 소비한다.

이 Task는 순수 타입 좁히기 + 세션/스토어 로직 변경이라 프로젝트 컨벤션상(vitest 커버리지는 `src/mocks/utils/`로 한정) 신규 vitest 파일을 추가하지 않는다. 검증은 typecheck(`npm run build`)와 수동 로그인/로그아웃 확인으로 한다.

- [ ] **Step 1: `AccountUser.ownerId` 타입 좁히기**

`src/features/account/types/user.types.ts` 5-11번째 줄:

```typescript
export interface AccountUser extends User {
  id: string;
  status: UserStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
```

(`/** null: 직접 가입한 슈퍼계정 / string: 종속된 슈퍼계정의 id */` 주석 삭제, `ownerId: string | null` → `ownerId: string`. 이후 필드는 그대로 유지)

- [ ] **Step 2: `next-auth.d.ts` 타입 좁히기**

`src/types/next-auth.d.ts` 전체를 아래로 교체 (`ownerId: string | null`을 3곳 모두 `ownerId: string`으로):

```typescript
import { UserGrade } from '@/features/auth/types/Auth';

declare module 'next-auth' {
  interface User {
    id: string;
    ownerId: string;
    grade: UserGrade;
    avatar: string;
    phone: string;
    bio: string;
    company: string;
    location: string;
  }

  interface Session {
    user: {
      id: string;
      ownerId: string;
      email: string;
      name: string;
      grade: UserGrade;
      avatar: string;
      phone: string;
      bio: string;
      company: string;
      location: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    ownerId: string;
    grade: UserGrade;
    avatar: string;
    phone: string;
    bio: string;
    company: string;
    location: string;
  }
}
```

- [ ] **Step 3: NextAuth `authorize()` 콜백에 단일 assertion 추가**

`src/app/api/auth/[...nextauth]/route.ts` 38-49번째 줄:

```typescript
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            // DB 컬럼(owner_id)은 nullable이지만 앱 레벨에서는 항상 non-null로 기록됨
            // (가입/사용자등록 시 자기 id 또는 세션 ownerId로 채움). 2026-07-17 실 DB 확인: null 0건.
            ownerId: user.ownerId as string,
            grade: user.grade as UserGrade,
            avatar: user.avatar ?? '',
            phone: user.phone,
            bio: user.bio,
            company: user.company,
            location: user.location,
          };
```

(`ownerId: user.ownerId` 줄만 위 주석 + `as string`으로 변경, 나머지는 그대로)

- [ ] **Step 4: `apiAuth.ts`의 fallback 제거**

`src/shared/utils/apiAuth.ts` 12-23번째 줄:

```typescript
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

(`ownerId: token.ownerId ?? token.id` → `ownerId: token.ownerId`. `requireSuperAdminSession`은 변경 없음)

- [ ] **Step 5: `auth.store.ts`의 `ownerIdAtom`/`workspaceOwnerIdAtom`/`resetUserInfoAtom` 정리**

`src/features/auth/store/auth.store.ts` 전체를 아래로 교체:

```typescript
import { atom } from 'jotai';
import { User, UserGrade } from '../types/Auth';

export const idAtom = atom<string>('');
export const ownerIdAtom = atom<string>('');
export const emailAtom = atom<string>('');
export const nameAtom = atom<string>('');
export const avatarAtom = atom<string>('');
export const phoneAtom = atom<string>('');
export const bioAtom = atom<string>('');
export const companyAtom = atom<string>('');
export const locationAtom = atom<string>('');
export const gradeAtom = atom<UserGrade>('operator');

export type UserWithId = User & { id: string; ownerId: string };

/**
 * 유저 정보 저장
 */
export const setUserInfoAtom = atom(null, (_, set, data: UserWithId) => {
  if (data) {
    set(idAtom, data.id);
    set(ownerIdAtom, data.ownerId);
    set(emailAtom, data.email);
    set(nameAtom, data.name);
    set(avatarAtom, data.avatar);
    set(phoneAtom, data.phone);
    set(bioAtom, data.bio);
    set(companyAtom, data.company);
    set(locationAtom, data.location);
    set(gradeAtom, data.grade);
  }
});

/**
 * 유저 정보 추출
 */
export const getUserInfoAtom = atom<UserWithId>((get) => ({
  id: get(idAtom),
  ownerId: get(ownerIdAtom),
  email: get(emailAtom),
  name: get(nameAtom),
  avatar: get(avatarAtom),
  phone: get(phoneAtom),
  bio: get(bioAtom),
  company: get(companyAtom),
  location: get(locationAtom),
  grade: get(gradeAtom),
}));

/**
 * 로그인한 계정의 워크스페이스 소유자 id
 * - super_admin: 자신의 id (가입 시 ownerId=id로 자기참조 기록됨)
 * - admin/operator: 자신의 ownerId (슈퍼계정 id)
 * - 로그아웃 상태: '' (falsy이므로 React Query enabled 게이팅에 그대로 사용 가능)
 */
export const workspaceOwnerIdAtom = atom<string>((get) => get(ownerIdAtom));

/**
 * 유저 정보 초기화
 */
export const resetUserInfoAtom = atom(null, (_, set) => {
  set(idAtom, '');
  set(ownerIdAtom, '');
  set(emailAtom, '');
  set(nameAtom, '');
  set(avatarAtom, '');
  set(phoneAtom, '');
  set(bioAtom, '');
  set(companyAtom, '');
  set(locationAtom, '');
  set(gradeAtom, 'operator');
});
```

- [ ] **Step 6: typecheck 통과 확인**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음 (특히 `next-auth.d.ts` 타입 변경으로 인한 NextAuth 콜백/`ApiSession` 관련 타입 불일치가 없어야 함)

Run: `npm run build`
Expected: 정상 빌드 성공 (최종 확인용)

- [ ] **Step 7: 수동 로그인/로그아웃 확인**

Run: `npm run dev`

브라우저에서:
1. 로그인 → 사용자관리(`/account/user`) 목록에 본인 계정(super_admin)이 정상적으로 보이는지 확인 (`workspaceOwnerIdAtom` = 자기 id로 정상 계산되는지)
2. 로그아웃 → 다시 로그인 → 목록/상품 등 `workspaceOwnerId`에 의존하는 화면이 정상 동작하는지 확인 (로그아웃 시 atom이 `''`로 리셋되고, 재로그인 시 올바른 값으로 갱신되는지)

- [ ] **Step 8: lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/features/account/types/user.types.ts src/features/auth/store/auth.store.ts src/types/next-auth.d.ts src/shared/utils/apiAuth.ts "src/app/api/auth/[...nextauth]/route.ts"
git commit -m "refactor: AccountUser.ownerId를 non-null로 좁히고 관련 fallback 제거"
```

---

### Task 3: 전체 통합 검증

**Files:** 없음 (검증 전용 Task)

- [ ] **Step 1: 전체 lint**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 전체 테스트**

Run: `npm run test`
Expected: 모든 테스트 PASS (Task 1의 `getProducts.test.ts` 확장 포함, 기존 다른 테스트 회귀 없음)

- [ ] **Step 3: 전체 typecheck 겸 빌드**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 4: 잔여 nullable ownerId 참조 검색**

```bash
grep -rn "ownerId ?? \|ownerId: string | null\|ownerId ?? id\|ownerId ?? token.id" src --include=*.ts --include=*.tsx
```
Expected: 출력 없음 (0건) — Task 2에서 제거한 fallback 패턴이 다른 곳에 남아있지 않은지 최종 확인

이 Task는 코드 변경이 없으므로 커밋하지 않는다.
