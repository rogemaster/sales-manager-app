# 쇼핑몰 연동 상품 목록 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 쇼핑몰 연동 데이터를 오리지널 상품과 분리된 독립 엔티티(`MallLinkedProduct`)로 전환하고, 성공·실패 연동 건을 조회하는 `/shopping/linked-products` 목록 화면을 만든다.

**Architecture:** `Product.registeredMalls`(상태 메타데이터)를 폐기하고, 생성 시점의 상품·설정 전체 사본을 보유하는 독립 컬렉션 `MOCK_MALL_LINKED_PRODUCT_DATA`로 대체한다. MSW 유틸이 "백엔드 → 외부 몰 API 호출 + 스냅샷 복사 + 결과 기록"을 시뮬레이션하고, 핸들러는 위임만 한다. 목록 화면은 기존 상품·주문 목록 화면과 동일한 3층 구조(Jotai 필터 atom → React Query → 테이블)를 따른다.

**Tech Stack:** TypeScript(strict), Next.js 15 App Router, MSW, Vitest, Jotai, TanStack Query, dayjs, Tailwind CSS 4

**선행 스펙:** `docs/superpowers/specs/2026-08-01-mall-linked-product-list-design.md`

## Global Constraints

- **git 작업 금지:** 이 계획에는 커밋 스텝이 없다. `git add`/`git commit`/브랜치 생성 등 모든 git 작업은 사용자가 명시적으로 요청할 때만 실행한다 (CLAUDE.md Git/PR 규칙). Task 완료 후 자동 커밋하지 않는다.
- **작업 브랜치:** `feat/mall-linked-product-list` (이미 생성되어 있음).
- **`src/app/api/**/route.ts` 생성 금지.** 이 기능의 API는 MSW 핸들러로만 처리한다 (`.claude/rules/msw-rules.md`).
- **MSW 핸들러는 위임만 한다.** 조건문·반복문·데이터 조작은 `src/mocks/utils/`에 둔다. `baseUrl`은 `../config`에서 import한다.
- **테스트 범위 관례:** 테스트는 `src/mocks/utils/`(순수 로직)에만 작성한다. UI 컴포넌트·API fetch 래퍼·Jotai store에는 테스트 파일을 만들지 않는다 (CLAUDE.md).
- **`Math.random()` 스텁:** `mockReturnValueOnce` 체인 대신 `mockReturnValue`로 고정한다. 성공 경로가 `externalProductId` 생성에도 난수를 쓰므로 호출 횟수에 따라 결과가 어긋난다 (`docs/solutions/conventions/deterministic-random-stub-vacuous-test.md`).
- **실패율:** `Math.random() < 0.1` → 실패 (항목별 독립 판정).
- **`delay`:** 연동 생성(전송) 핸들러는 `800`.
- **시뮬레이션 전용 상수 위치:** `src/mocks/utils/createMallLinkedProducts.ts` **파일 내부**. 백엔드 연동 시 파일째 삭제될 코드라 `constant/`로 분리하지 않는다.
- **스타일 규칙:** UI 작업 시 폰트 크기·폰트 색상을 임의로 변경하지 않는다 (CLAUDE.md).
- **Prettier:** `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`.
- **테이블/카드 마크업:** `.claude/rules/ui-conventions.md`의 Card·테이블·검색 필터 패턴을 따른다.

## File Structure

| 파일 | 책임 | Task |
|------|------|------|
| `src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts` | 연동 데이터 도메인 타입 + 검색/응답 타입 | 1 |
| `src/features/products/types/product.types.ts` | `MallRegistration` 계열 제거 | 1 |
| `src/mocks/handlers/products.ts` | `mall-registration` 라우트 제거 | 1 |
| `src/mocks/data/MockMallLinkedProductsData.ts` | 연동 데이터 시드 | 2 |
| `src/mocks/utils/createMallLinkedProducts.ts` | 전송 시뮬레이션 — 스냅샷 복사, 실패 판정, 오류 메시지 | 2 |
| `src/mocks/handlers/mallLinkedProducts.ts` | 라우트 배선 (생성 + 목록) | 2, 4 |
| `src/mocks/handlers.ts` | 핸들러 인덱스 | 2 |
| `src/features/mallRegistration/api/registerProductsToMalls.ts` | 전송 API 래퍼 — 경로/본문 이관 | 3 |
| `src/features/mallRegistration/api/useRegisterProductsToMalls.ts` | 전송 훅 — `createdByEmail` 주입 | 3 |
| `src/mocks/utils/getMallLinkedProducts.ts` | 목록 필터 + 페이징 | 4 |
| `src/features/mallLinkedProduct/store/search.store.ts` | 검색 필터 atom (draft/committed) | 5 |
| `src/features/mallLinkedProduct/constant/mallLinkedProduct.constants.ts` | 테이블 헤더 + 필터 옵션 상수 | 5 |
| `src/features/mallLinkedProduct/api/getMallLinkedProducts.ts` | 목록 fetch 래퍼 | 5 |
| `src/features/mallLinkedProduct/api/useGetMallLinkedProducts.ts` | 목록 조회 훅 | 5 |
| `src/features/mallLinkedProduct/ui/components/filter/*.tsx` | 필터 3행 컴포넌트 | 5 |
| `src/features/mallLinkedProduct/ui/MallLinkedProductSearchFilterSection.tsx` | 필터 카드 조립 | 5 |
| `src/features/mallLinkedProduct/ui/components/MallLinkedProductTable.tsx` | 테이블 렌더링 | 6 |
| `src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx` | 카드 + 페이지네이션 | 6 |
| `src/features/mallLinkedProduct/ui/MallLinkedProductHeaderSection.tsx` | 화면 제목 | 6 |
| `src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx` | 화면 조립 + 쿼리 | 6 |
| `src/app/(authenticated)/shopping/linked-products/page.tsx` | 라우트 | 6 |
| `src/constant/sidebarMenu.constant.ts` | 사이드바 메뉴 | 6 |
| `.claude/rules/domain-design.md` | 오리지널 vs 연동 데이터 규칙 | 6 |

---

## Task 1: 타입 정의 + `registeredMalls` 폐기

새 도메인 타입을 만들고, 이를 대체당하는 기존 구조(`Product.registeredMalls`, `MallRegistration`, upsert 유틸, 전송 라우트)를 제거한다. 전송 기능은 이 Task 이후 Task 3까지 **일시적으로 동작하지 않는다** — Task 2가 새 생성 유틸을, Task 3이 프론트 배선을 복구한다.

**Files:**
- Create: `src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts`
- Modify: `src/features/products/types/product.types.ts:6-16, 42`
- Delete: `src/mocks/utils/registerProductsToMalls.ts`
- Delete: `src/mocks/utils/registerProductsToMalls.test.ts`
- Modify: `src/mocks/handlers/products.ts:1-11, 54-67`

**Interfaces:**
- Consumes: `Product`, `ProductStateType`(`@/features/products/types/product.types`), `ShoppingSetting`(`@/features/shoppingSetting/types/shoppingSetting.types`), `ShoppingMalls`(`@/types/common.type`)
- Produces:
  - `MallLinkStatus = 'success' | 'failed'`
  - `MallLinkedProduct` (전체 필드는 Step 1 참조)
  - `MallLinkedProductSearchType = 'productName' | 'productCode' | 'externalProductCode' | 'createdBy' | 'updatedBy'`
  - `MallLinkedProductSearch`, `GetMallLinkedProductsResponse`
  - `MallLinkedProductRequestItem = { productId: string; mallCode: ShoppingMalls; shoppingSettingId: string }`
  - `CreateMallLinkedProductsResult = { totalCount: number; successCount: number; failCount: number }`

---

- [ ] **Step 1: 연동 데이터 타입 파일 생성**

`src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts`를 아래 내용으로 생성한다.

```ts
import { Product, ProductStateType } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';

export type MallLinkStatus = 'success' | 'failed';

/**
 * 쇼핑몰 연동 데이터.
 * 오리지널 상품(Product)/설정(ShoppingSetting)과 별개의 독립 데이터이며,
 * 전송 시점의 값을 스냅샷으로 복사해 보유한다. 오리지널을 수정해도 이 값은 바뀌지 않는다.
 * 연동 데이터 1건 = 외부 쇼핑몰 상품 1개.
 */
export interface MallLinkedProduct {
  // ── 불변 식별 정보 ──
  id: string;
  ownerId: string;
  sourceProductId: string; // 파생된 오리지널 상품 (값 동기화 없음, 추적용)
  sourceShoppingSettingId: string; // 파생된 오리지널 설정 (값 동기화 없음, 추적용)
  mallCode: ShoppingMalls;

  // ── 연동 결과 ──
  status: MallLinkStatus;
  externalProductId?: string; // 성공 시 외부몰이 부여한 쇼핑몰 상품코드
  errorMessage?: string; // 실패 사유

  // ── 스냅샷 (이 연동 데이터의 실제 값) ──
  productSnapshot: Product;
  settingSnapshot: ShoppingSetting;

  // ── 감사 ──
  createdByEmail: string;
  updatedByEmail?: string; // 수정 기능 도입 전까지는 비어 있음
  createdAt: string; // 연동 데이터 최초 생성 시각
  lastSentAt: string; // 최종 전송(연동) 시각 — 화면의 '최종연동일시'
  updatedAt: string; // 마지막 수정 시각 (updatedByEmail과 짝)
}

export type MallLinkedProductSearchType =
  | 'productName'
  | 'productCode'
  | 'externalProductCode'
  | 'createdBy'
  | 'updatedBy';

export interface MallLinkedProductSearch {
  dateType: 'lastSentAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  shoppingSettingId: string; // 'ALL' 또는 ShoppingSetting.id
  linkStatus: MallLinkStatus | 'ALL';
  saleState: ProductStateType | 'ALL';
  searchType: MallLinkedProductSearchType;
  searchValue: string;
}

export interface GetMallLinkedProductsResponse {
  linkedProducts: MallLinkedProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 전송 요청 1건 — 어떤 상품을 어떤 몰·설정으로 보낼지 */
export interface MallLinkedProductRequestItem {
  productId: string;
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
}

export interface CreateMallLinkedProductsResult {
  totalCount: number;
  successCount: number;
  failCount: number;
}
```

- [ ] **Step 2: `Product`에서 연동 관련 타입 제거**

`src/features/products/types/product.types.ts`에서 아래 3개를 삭제한다.

1. 6번 줄 `export type MallRegistrationStatus = 'success' | 'failed';`
2. 8~16번 줄 `export interface MallRegistration { ... }` 블록 전체
3. 42번 줄 `registeredMalls?: MallRegistration[];`

1번 줄의 `import { ShoppingMalls } from '@/types/common.type';`도 이 파일에서 더 이상 쓰이지 않는지 확인한다. 쓰이지 않으면 함께 제거한다 (`npm run lint`가 미사용 import를 잡는다).

- [ ] **Step 3: upsert 유틸과 그 테스트 삭제**

```bash
rm src/mocks/utils/registerProductsToMalls.ts
rm src/mocks/utils/registerProductsToMalls.test.ts
```

이 유틸의 upsert(조합당 1건) 전제는 "같은 조합도 중복 연동 가능" 결정으로 폐기됐다. Task 2의 `createMallLinkedProducts.ts`가 대체한다.

- [ ] **Step 4: 전송 라우트 제거**

`src/mocks/handlers/products.ts`에서 54~67번 줄의 `http.post(\`${baseUrl}/api/products/mall-registration\`, ...)` 블록 전체를 삭제한다. 이어서 사용되지 않게 된 import 2줄도 제거한다.

```ts
// 삭제할 import
import { registerMockProductsToMalls } from '../utils/registerProductsToMalls';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';
```

`delay` import는 `products/bulk` 라우트가 계속 쓰므로 남긴다.

- [ ] **Step 5: 타입 체크 및 테스트 확인**

Run: `npm run test`

Expected: PASS. `registerProductsToMalls.test.ts`가 삭제되어 테스트 파일 19개 / 112 테스트로 줄어든다 (삭제 전 20개 / 120 테스트).

Run: `npm run build`

Expected: 성공. `Product.registeredMalls`를 읽는 코드는 삭제된 유틸뿐이었으므로 컴파일 에러가 없어야 한다. 에러가 나면 그 위치가 예상 밖이므로 원인을 확인한다.

Run: `npm run lint`

Expected: 에러 없음 (미사용 import를 모두 제거했는지 확인)

---

## Task 2: 시드 데이터 + 연동 생성 유틸 + 생성 핸들러

전송 시 연동 데이터를 만드는 시뮬레이션을 구현하고, 화면에서 볼 수 있도록 시드 데이터를 넣는다.

**Files:**
- Create: `src/mocks/data/MockMallLinkedProductsData.ts`
- Create: `src/mocks/utils/createMallLinkedProducts.ts`
- Create: `src/mocks/utils/createMallLinkedProducts.test.ts`
- Create: `src/mocks/handlers/mallLinkedProducts.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**
- Consumes: Task 1의 `MallLinkedProduct`, `MallLinkStatus`, `MallLinkedProductRequestItem`, `CreateMallLinkedProductsResult`. 기존 `MOCK_PRODUCT_DATA`(`src/mocks/data/MockProductsData`), `MOCK_SHOPPING_SETTINGS_DATA`(`src/mocks/data/MockShoppingSettingsData`), `isOwnerMatch`(`src/mocks/utils/verifyOwnership`), `baseUrl`(`src/mocks/config`)
- Produces:
  - `MOCK_MALL_LINKED_PRODUCT_DATA: MallLinkedProduct[]` — 모듈 스코프 가변 배열
  - `createMockMallLinkedProducts(items: MallLinkedProductRequestItem[], ownerId: string, createdByEmail: string): CreateMallLinkedProductsResult`
  - `mallLinkedProductHandlers` — `POST /api/shopping/linked-products`

**참고 — 기존 mock 데이터의 실제 id:**
- 상품: `smp000001` ~ `smp000020` 이상, 전부 `ownerId: 'usr_2f20748f'`
- 설정: `ss_001`(COUP, 활성), `ss_002`(COUP, 활성), `ss_003`(NSST, 활성), `ss_004`(GMK, 비활성). 전부 `ownerId: 'usr_2f20748f'`

---

- [ ] **Step 1: 시드 데이터 파일 생성**

`src/mocks/data/MockMallLinkedProductsData.ts`를 아래 내용으로 생성한다.

스냅샷은 `structuredClone`으로 깊은 복사한다. 얕은 복사(`{ ...product }`)를 쓰면 중첩 객체(`informationDisclosure`, `option`)가 원본과 공유되어 "오리지널을 수정해도 연동 데이터는 안 바뀐다"는 규칙이 깨진다.

```ts
import { MallLinkedProduct, MallLinkStatus } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_PRODUCT_DATA } from './MockProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from './MockShoppingSettingsData';

const OWNER_ID = 'usr_2f20748f';
const SELLER_EMAIL = 'seller@shop.com';
const STAFF_EMAIL = 'staff@shop.com';

interface SeedInput {
  id: string;
  productId: string;
  settingId: string;
  status: MallLinkStatus;
  externalProductId?: string;
  errorMessage?: string;
  createdByEmail: string;
  sentAt: string;
}

const buildSeed = ({
  id,
  productId,
  settingId,
  status,
  externalProductId,
  errorMessage,
  createdByEmail,
  sentAt,
}: SeedInput): MallLinkedProduct => {
  const product = MOCK_PRODUCT_DATA.find((p) => p.productId === productId);
  const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === settingId);

  if (!product || !setting) {
    throw new Error(`시드 데이터 참조 오류: ${productId} / ${settingId}`);
  }

  return {
    id,
    ownerId: OWNER_ID,
    sourceProductId: product.productId,
    sourceShoppingSettingId: setting.id,
    mallCode: setting.mallCode,
    status,
    externalProductId,
    errorMessage,
    productSnapshot: structuredClone(product),
    settingSnapshot: structuredClone(setting),
    createdByEmail,
    createdAt: sentAt,
    lastSentAt: sentAt,
    updatedAt: sentAt,
  };
};

// 화면에서 다음이 확인되도록 구성한다.
// - 한 상품이 여러 몰에 연동된 케이스 (smp000002)
// - 같은 상품 × 같은 몰 × 같은 설정 조합이 2건 (smp000003 × ss_003) — 중복 연동 허용 모델
// - 실패 3건 (몰별 사유 2종 + 중복 사유 1건)
// - 판매상태가 서로 다른 상품 (판매상태 필터 확인용)
const SEEDS: SeedInput[] = [
  {
    id: 'mlp_0001',
    productId: 'smp000001',
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_a1b2c3',
    createdByEmail: SELLER_EMAIL,
    sentAt: '2026-07-20T10:12:00.000Z',
  },
  {
    id: 'mlp_0002',
    productId: 'smp000002',
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_d4e5f6',
    createdByEmail: SELLER_EMAIL,
    sentAt: '2026-07-22T02:30:00.000Z',
  },
  {
    id: 'mlp_0003',
    productId: 'smp000002',
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_g7h8i9',
    createdByEmail: SELLER_EMAIL,
    sentAt: '2026-07-22T02:30:00.000Z',
  },
  {
    id: 'mlp_0004',
    productId: 'smp000002',
    settingId: 'ss_004',
    status: 'failed',
    errorMessage: '외부 쇼핑몰 전송 실패',
    createdByEmail: SELLER_EMAIL,
    sentAt: '2026-07-22T02:30:00.000Z',
  },
  {
    id: 'mlp_0005',
    productId: 'smp000003',
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_j1k2l3',
    createdByEmail: STAFF_EMAIL,
    sentAt: '2026-07-25T06:05:00.000Z',
  },
  {
    id: 'mlp_0006',
    productId: 'smp000003',
    settingId: 'ss_003',
    status: 'failed',
    errorMessage: '동일 상품이 이미 등록되어 있습니다',
    createdByEmail: STAFF_EMAIL,
    sentAt: '2026-07-26T01:40:00.000Z',
  },
  {
    id: 'mlp_0007',
    productId: 'smp000004',
    settingId: 'ss_003',
    status: 'failed',
    errorMessage: '카테고리 매핑 오류',
    createdByEmail: STAFF_EMAIL,
    sentAt: '2026-07-27T08:00:00.000Z',
  },
  {
    id: 'mlp_0008',
    productId: 'smp000005',
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_m4n5o6',
    createdByEmail: SELLER_EMAIL,
    sentAt: '2026-07-28T03:20:00.000Z',
  },
  {
    id: 'mlp_0009',
    productId: 'smp000006',
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_p7q8r9',
    createdByEmail: SELLER_EMAIL,
    sentAt: '2026-07-29T05:10:00.000Z',
  },
  {
    id: 'mlp_0010',
    productId: 'smp000007',
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_s1t2u3',
    createdByEmail: SELLER_EMAIL,
    sentAt: '2026-07-30T07:45:00.000Z',
  },
  {
    id: 'mlp_0011',
    productId: 'smp000008',
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_v4w5x6',
    createdByEmail: STAFF_EMAIL,
    sentAt: '2026-07-31T09:30:00.000Z',
  },
  {
    id: 'mlp_0012',
    productId: 'smp000009',
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_y7z8a9',
    createdByEmail: STAFF_EMAIL,
    sentAt: '2026-08-01T00:15:00.000Z',
  },
];

export const MOCK_MALL_LINKED_PRODUCT_DATA: MallLinkedProduct[] = SEEDS.map(buildSeed);
```

- [ ] **Step 2: 실패 테스트 작성**

`src/mocks/utils/createMallLinkedProducts.test.ts`를 아래 내용으로 생성한다.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const OWNER_ID = 'usr_001';
const EMAIL = 'seller@shop.com';

const { PRODUCTS, SETTINGS, LINKED, resetMocks } = vi.hoisted(() => {
  const makeProduct = (productId: string): Product =>
    ({
      productId,
      name: `상품-${productId}`,
      categoryId: 'c00001',
      price: 10000,
      state: 'ON_SALE',
      deliveryType: 'FREE',
      deliveryPrice: 0,
      mainImage: '',
      detailPage: '',
      option: [],
      totalQuantity: 10,
      keyWords: [],
      createDate: new Date('2026-01-01'),
      updateDate: new Date('2026-01-01'),
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      ownerId: 'usr_001',
    }) as Product;

  const makeSetting = (id: string, mallCode: string): ShoppingSetting =>
    ({
      id,
      mallAccountId: 'sa_001',
      mallCode,
      mallId: 'seller_001',
      nickname: `설정-${id}`,
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }) as ShoppingSetting;

  const PRODUCTS: Product[] = [];
  const SETTINGS: ShoppingSetting[] = [];
  const LINKED: MallLinkedProduct[] = [];

  const resetMocks = () => {
    PRODUCTS.length = 0;
    PRODUCTS.push(makeProduct('p_001'), makeProduct('p_002'));

    SETTINGS.length = 0;
    SETTINGS.push(makeSetting('ss_001', 'NSST'), makeSetting('ss_002', 'KAKAOS'), makeSetting('ss_003', 'COUP'));

    LINKED.length = 0;
  };

  resetMocks();

  return { PRODUCTS, SETTINGS, LINKED, resetMocks };
});

vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));
vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));
vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { createMockMallLinkedProducts } from './createMallLinkedProducts';

// 성공/실패는 Math.random()으로 판정한다. 성공 경로는 externalProductId 생성에도 난수를 쓰므로
// mockReturnValueOnce 체인을 쓰면 호출 횟수에 따라 결과가 어긋난다. 항상 mockReturnValue로 고정한다.
const stubRandom = (value: number) => vi.spyOn(Math, 'random').mockReturnValue(value);

describe('createMockMallLinkedProducts', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('연동 데이터를 생성하고 집계 결과를 반환한다', () => {
    stubRandom(0.9);

    const result = createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
    expect(LINKED).toHaveLength(1);
    expect(LINKED[0]).toMatchObject({
      ownerId: OWNER_ID,
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      createdByEmail: EMAIL,
    });
    expect(LINKED[0].externalProductId).toMatch(/^ext_NSST_/);
    expect(LINKED[0].updatedByEmail).toBeUndefined();
  });

  it('생성 시각 3종이 모두 같은 값으로 기록된다', () => {
    stubRandom(0.9);

    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    const { createdAt, lastSentAt, updatedAt } = LINKED[0];
    expect(createdAt).toBe(lastSentAt);
    expect(lastSentAt).toBe(updatedAt);
  });

  it('스냅샷은 오리지널과 독립이다 — 원본을 수정해도 연동 데이터는 변하지 않는다', () => {
    stubRandom(0.9);

    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    PRODUCTS[0].name = '수정된 상품명';
    PRODUCTS[0].price = 99999;
    PRODUCTS[0].informationDisclosure.name = '수정된 고시정보';
    SETTINGS[0].nickname = '수정된 설정명';

    expect(LINKED[0].productSnapshot.name).toBe('상품-p_001');
    expect(LINKED[0].productSnapshot.price).toBe(10000);
    expect(LINKED[0].productSnapshot.informationDisclosure.name).toBe('');
    expect(LINKED[0].settingSnapshot.nickname).toBe('설정-ss_001');
  });

  it('같은 조합을 다시 전송하면 별도 연동 데이터가 추가되고 외부 상품코드가 서로 다르다', () => {
    stubRandom(0.9);

    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );
    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(LINKED).toHaveLength(2);
    expect(LINKED[0].id).not.toBe(LINKED[1].id);
    expect(LINKED[0].externalProductId).not.toBe(LINKED[1].externalProductId);
  });

  it('실패 시 몰별 오류 메시지를 기록하고 외부 상품코드를 부여하지 않는다', () => {
    stubRandom(0.05);

    const result = createMockMallLinkedProducts(
      [
        { productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' },
        { productId: 'p_001', mallCode: 'KAKAOS', shoppingSettingId: 'ss_002' },
        { productId: 'p_001', mallCode: 'COUP', shoppingSettingId: 'ss_003' },
      ],
      OWNER_ID,
      EMAIL,
    );

    expect(result).toEqual({ totalCount: 3, successCount: 0, failCount: 3 });
    expect(LINKED[0]).toMatchObject({ status: 'failed', errorMessage: '카테고리 매핑 오류' });
    expect(LINKED[1]).toMatchObject({ status: 'failed', errorMessage: '상품명 글자 수 초과' });
    // 전용 메시지가 없는 몰은 공통 fallback을 쓴다
    expect(LINKED[2].errorMessage).toBe('외부 쇼핑몰 전송 실패');
    expect(LINKED[0].externalProductId).toBeUndefined();
  });

  it('이미 성공한 조합을 재전송해 실패하면 중복 등록 메시지를 쓴다', () => {
    stubRandom(0.9);
    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    vi.restoreAllMocks();
    stubRandom(0.05);
    createMockMallLinkedProducts(
      [{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(LINKED).toHaveLength(2);
    expect(LINKED[1].errorMessage).toBe('동일 상품이 이미 등록되어 있습니다');
  });

  it('존재하지 않는 productId는 건너뛰고 집계에 포함하지 않는다', () => {
    stubRandom(0.9);

    const result = createMockMallLinkedProducts(
      [{ productId: 'nope', mallCode: 'NSST', shoppingSettingId: 'ss_001' }],
      OWNER_ID,
      EMAIL,
    );

    expect(result).toEqual({ totalCount: 0, successCount: 0, failCount: 0 });
    expect(LINKED).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm run test -- createMallLinkedProducts`

Expected: FAIL — `Failed to resolve import "./createMallLinkedProducts"` (파일이 아직 없음)

- [ ] **Step 4: 생성 유틸 구현**

`src/mocks/utils/createMallLinkedProducts.ts`를 아래 내용으로 생성한다.

```ts
import {
  CreateMallLinkedProductsResult,
  MallLinkedProduct,
  MallLinkedProductRequestItem,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { ShoppingMalls } from '@/types/common.type';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';

// --- 외부 몰 API 시뮬레이션 전용 상수 ---
// 실제 백엔드 게이트웨이가 붙으면 이 파일과 함께 통째로 삭제된다. constant/로 분리하지 않는 이유다.
const FAILURE_RATE = 0.1;
const DUPLICATE_ERROR_MESSAGE = '동일 상품이 이미 등록되어 있습니다';
const FALLBACK_ERROR_MESSAGE = '외부 쇼핑몰 전송 실패';
const MALL_ERROR_MESSAGES: Partial<Record<ShoppingMalls, string>> = {
  NSST: '카테고리 매핑 오류',
  KAKAOS: '상품명 글자 수 초과',
};

const createExternalProductId = (mallCode: ShoppingMalls) =>
  `ext_${mallCode}_${Math.random().toString(36).slice(2, 8)}`;

// 외부몰은 같은 상품이 이미 올라가 있으면 중복이라고 실패 응답을 준다.
// 이 시뮬레이션도 같은 상품 × 같은 몰에 성공 이력이 있으면 중복 사유를 쓴다.
const resolveErrorMessage = (item: MallLinkedProductRequestItem) => {
  const hasSuccess = MOCK_MALL_LINKED_PRODUCT_DATA.some(
    (linked) =>
      linked.sourceProductId === item.productId && linked.mallCode === item.mallCode && linked.status === 'success',
  );

  if (hasSuccess) return DUPLICATE_ERROR_MESSAGE;
  return MALL_ERROR_MESSAGES[item.mallCode] ?? FALLBACK_ERROR_MESSAGE;
};

/**
 * 전송 시점의 상품·설정 값을 스냅샷으로 복사해 연동 데이터를 새로 만든다.
 * 같은 조합이 이미 있어도 갱신하지 않고 항상 새 건을 추가한다 — 연동 데이터 1건 = 외부몰 상품 1개.
 */
export const createMockMallLinkedProducts = (
  items: MallLinkedProductRequestItem[],
  ownerId: string,
  createdByEmail: string,
): CreateMallLinkedProductsResult => {
  const now = new Date().toISOString();
  const result: CreateMallLinkedProductsResult = { totalCount: 0, successCount: 0, failCount: 0 };

  items.forEach((item, index) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === item.shoppingSettingId);
    if (!product || !setting) return;

    const isSuccess = Math.random() >= FAILURE_RATE;
    // 실패 사유 판정은 이번 건을 배열에 넣기 전에 해야 한다. 넣은 뒤에 하면 자기 자신을 중복으로 본다.
    const errorMessage = isSuccess ? undefined : resolveErrorMessage(item);

    const linked: MallLinkedProduct = {
      id: `mlp_${Date.now()}_${index}`,
      ownerId,
      sourceProductId: product.productId,
      sourceShoppingSettingId: setting.id,
      mallCode: item.mallCode,
      status: isSuccess ? 'success' : 'failed',
      externalProductId: isSuccess ? createExternalProductId(item.mallCode) : undefined,
      errorMessage,
      // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 오리지널과 공유되어 스냅샷 독립성이 깨진다.
      productSnapshot: structuredClone(product),
      settingSnapshot: structuredClone(setting),
      createdByEmail,
      createdAt: now,
      lastSentAt: now,
      updatedAt: now,
    };

    MOCK_MALL_LINKED_PRODUCT_DATA.push(linked);

    result.totalCount += 1;
    if (isSuccess) result.successCount += 1;
    else result.failCount += 1;
  });

  return result;
};
```

- [ ] **Step 5: 통과 확인**

Run: `npm run test -- createMallLinkedProducts`

Expected: PASS (7 tests)

- [ ] **Step 6: 생성 핸들러 배선**

`src/mocks/handlers/mallLinkedProducts.ts`를 아래 내용으로 생성한다. 소유권 검증 로직은 삭제된 `mall-registration` 핸들러에서 그대로 옮긴 것이다.

```ts
import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { MallLinkedProductRequestItem } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { isOwnerMatch } from '../utils/verifyOwnership';
import { createMockMallLinkedProducts } from '../utils/createMallLinkedProducts';

export const mallLinkedProductHandlers = [
  http.post(`${baseUrl}/api/shopping/linked-products`, async ({ request }) => {
    // 외부 쇼핑몰 API 응답 지연 시뮬레이션
    await delay(800);
    const { ownerId, createdByEmail, items } = (await request.json()) as {
      ownerId: string;
      createdByEmail: string;
      items: MallLinkedProductRequestItem[];
    };

    const productIds = [...new Set(items.map((item) => item.productId))];
    const allOwned = productIds.every((id) => {
      const product = MOCK_PRODUCT_DATA.find((p) => p.productId === id);
      return !!product && isOwnerMatch(product.ownerId, ownerId);
    });
    if (!allOwned) {
      return new HttpResponse(null, { status: 403 });
    }

    return HttpResponse.json(createMockMallLinkedProducts(items, ownerId, createdByEmail));
  }),
];
```

- [ ] **Step 7: 핸들러 인덱스에 등록**

`src/mocks/handlers.ts`에 import와 spread를 추가한다.

```ts
import { authHandlers } from './handlers/auth';
import { homeHandlers } from './handlers/home';
import { productHandlers } from './handlers/products';
import { orderHandlers } from './handlers/orders';
import { collectionHandlers } from './handlers/collection';
import { shoppingAccountHandlers } from './handlers/shoppingAccounts';
import { shoppingSettingHandlers } from './handlers/shoppingSettings';
import { mallLinkedProductHandlers } from './handlers/mallLinkedProducts';

export const handlers = [
  ...authHandlers,
  ...homeHandlers,
  ...productHandlers,
  ...orderHandlers,
  ...collectionHandlers,
  ...shoppingAccountHandlers,
  ...shoppingSettingHandlers,
  ...mallLinkedProductHandlers,
];
```

- [ ] **Step 8: 전체 확인**

Run: `npm run test`

Expected: 전체 PASS (테스트 파일 20개 / 119 테스트)

Run: `npm run build`

Expected: 성공

---

## Task 3: 전송 화면 배선 이관

`/shopping/register`의 전송 버튼이 새 엔드포인트를 호출하도록 고친다. Task 1에서 끊어졌던 전송 기능이 여기서 복구된다.

**Files:**
- Modify: `src/features/mallRegistration/api/registerProductsToMalls.ts` (전체 교체)
- Modify: `src/features/mallRegistration/api/useRegisterProductsToMalls.ts` (전체 교체)
- Modify: `src/features/mallRegistration/ui/MallRegistrationActionSection.tsx:50-51` (주석만)

**Interfaces:**
- Consumes: Task 1의 `MallLinkedProductRequestItem`, `CreateMallLinkedProductsResult`. Task 2의 `POST /api/shopping/linked-products`. `emailAtom`(`@/features/auth/store/auth.store`)
- Produces: `registerProductsToMalls(ownerId, createdByEmail, items) => Promise<CreateMallLinkedProductsResult>`, `useRegisterProductsToMalls()` (mutation 인자는 기존과 동일하게 `MallRegistrationRequestItem[]`)

**테스트 없음:** API fetch 래퍼와 훅은 이 프로젝트의 테스트 범위 밖이다 (CLAUDE.md). 검증은 타입 체크와 Task 6의 수동 확인으로 한다.

**타입 정리 메모:** `MallRegistrationRequestItem`(`src/features/mallRegistration/types/mallRegistration.types.ts`)과 Task 1의 `MallLinkedProductRequestItem`은 구조가 같다. 전송 화면 쪽 타입은 그대로 두고, API 경계에서 새 타입을 쓴다 — 구조가 같으므로 TypeScript가 그대로 받아준다. 한쪽을 지우는 정리는 이번 라운드에서 하지 않는다 (전송 화면 리팩터링은 이 라운드 범위 밖).

---

- [ ] **Step 1: API 래퍼 교체**

`src/features/mallRegistration/api/registerProductsToMalls.ts`를 아래로 **전체 교체**한다.

```ts
import {
  CreateMallLinkedProductsResult,
  MallLinkedProductRequestItem,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

export const registerProductsToMalls = async (
  ownerId: string,
  createdByEmail: string,
  items: MallLinkedProductRequestItem[],
): Promise<CreateMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, createdByEmail, items }),
  });
  if (!response.ok) throw new Error('쇼핑몰 연동 전송 실패');
  return response.json();
};
```

기존 `RegisterProductsToMallsResponse` 인터페이스는 삭제된다 — `CreateMallLinkedProductsResult`가 같은 형태(`{ totalCount, successCount, failCount }`)로 대체하므로 `MallRegistrationActionSection`의 구조분해는 그대로 동작한다.

- [ ] **Step 2: 훅 교체**

`src/features/mallRegistration/api/useRegisterProductsToMalls.ts`를 아래로 **전체 교체**한다.

```ts
import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { emailAtom, workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { registerProductsToMalls } from './registerProductsToMalls';
import { MallRegistrationRequestItem } from '../types/mallRegistration.types';

export const useRegisterProductsToMalls = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const email = useAtomValue(emailAtom);

  return useMutation({
    mutationFn: (items: MallRegistrationRequestItem[]) => registerProductsToMalls(workspaceOwnerId, email, items),
  });
};
```

- [ ] **Step 3: 낡은 주석 수정**

`src/features/mallRegistration/ui/MallRegistrationActionSection.tsx`의 50~51번 줄 주석을 아래로 바꾼다. 코드는 건드리지 않는다.

```ts
        // 결과와 무관하게 staging은 항상 비운다.
        // 실패 건은 연동 데이터로 남아 '쇼핑몰 연동 상품 목록' 화면에서 확인·수정한다.
```

- [ ] **Step 4: 타입 체크 및 린트**

Run: `npm run build`

Expected: 성공

Run: `npm run lint`

Expected: 에러 없음

---

## Task 4: 목록 조회 유틸 + 핸들러

필터·검색·페이징을 수행하는 조회 로직을 만든다.

**Files:**
- Create: `src/mocks/utils/getMallLinkedProducts.ts`
- Create: `src/mocks/utils/getMallLinkedProducts.test.ts`
- Modify: `src/mocks/handlers/mallLinkedProducts.ts` (라우트 추가)

**Interfaces:**
- Consumes: Task 1의 `MallLinkedProduct`, `MallLinkedProductSearch`, `MallLinkedProductSearchType`, `GetMallLinkedProductsResponse`. Task 2의 `MOCK_MALL_LINKED_PRODUCT_DATA`
- Produces:
  - `getMockMallLinkedProducts(ownerId: string, searchParams: MallLinkedProductSearch, page: number, pageSize: number): GetMallLinkedProductsResponse`
  - `POST /api/shopping/linked-products/list`

---

- [ ] **Step 1: 실패 테스트 작성**

`src/mocks/utils/getMallLinkedProducts.test.ts`를 아래 내용으로 생성한다.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type {
  MallLinkedProduct,
  MallLinkedProductSearch,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const { LINKED, resetLinked } = vi.hoisted(() => {
  const makeLinked = (overrides: Partial<MallLinkedProduct>): MallLinkedProduct =>
    ({
      id: 'mlp_001',
      ownerId: 'usr_001',
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      externalProductId: 'ext_NSST_aaa111',
      productSnapshot: { productId: 'p_001', name: '기본상품', state: 'ON_SALE' } as Product,
      settingSnapshot: { id: 'ss_001', nickname: '기본설정' } as ShoppingSetting,
      createdByEmail: 'seller@shop.com',
      createdAt: '2026-07-10T00:00:00.000Z',
      lastSentAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
      ...overrides,
    }) as MallLinkedProduct;

  const LINKED: MallLinkedProduct[] = [];

  const resetLinked = () => {
    LINKED.length = 0;
    LINKED.push(
      makeLinked({ id: 'mlp_001' }),
      makeLinked({
        id: 'mlp_002',
        sourceProductId: 'p_002',
        sourceShoppingSettingId: 'ss_002',
        mallCode: 'COUP',
        status: 'failed',
        externalProductId: undefined,
        errorMessage: '외부 쇼핑몰 전송 실패',
        productSnapshot: { productId: 'p_002', name: '품절상품', state: 'SOLD_OUT' } as Product,
        settingSnapshot: { id: 'ss_002', nickname: '쿠팡설정' } as ShoppingSetting,
        createdByEmail: 'staff@shop.com',
        updatedByEmail: 'boss@shop.com',
        lastSentAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-25T00:00:00.000Z',
      }),
      makeLinked({
        id: 'mlp_003',
        ownerId: 'usr_999',
        sourceProductId: 'p_003',
        productSnapshot: { productId: 'p_003', name: '남의상품', state: 'ON_SALE' } as Product,
      }),
    );
  };

  resetLinked();

  return { LINKED, resetLinked };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { getMockMallLinkedProducts } from './getMallLinkedProducts';

const BASE_SEARCH: MallLinkedProductSearch = {
  dateType: 'lastSentAt',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  mallCode: 'ALL',
  shoppingSettingId: 'ALL',
  linkStatus: 'ALL',
  saleState: 'ALL',
  searchType: 'productName',
  searchValue: '',
};

const search = (overrides: Partial<MallLinkedProductSearch> = {}) => ({ ...BASE_SEARCH, ...overrides });

describe('getMockMallLinkedProducts', () => {
  beforeEach(() => {
    resetLinked();
  });

  it('로그인 계정의 ownerId에 해당하는 연동 데이터만 반환한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search(), 1, 10);

    expect(result.total).toBe(2);
    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_001', 'mlp_002']);
  });

  it('몰 코드로 필터링한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ mallCode: 'COUP' }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('쇼핑몰 설정으로 필터링한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ shoppingSettingId: 'ss_002' }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('연동 상태로 필터링한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ linkStatus: 'failed' }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('스냅샷의 판매상태로 필터링한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ saleState: 'SOLD_OUT' }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('기간 필터는 dateType에 따라 lastSentAt과 updatedAt을 각각 본다', () => {
    const byLastSent = getMockMallLinkedProducts(
      'usr_001',
      search({ dateType: 'lastSentAt', startDate: '2026-07-19', endDate: '2026-07-21' }),
      1,
      10,
    );
    expect(byLastSent.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);

    const byUpdated = getMockMallLinkedProducts(
      'usr_001',
      search({ dateType: 'updatedAt', startDate: '2026-07-19', endDate: '2026-07-21' }),
      1,
      10,
    );
    expect(byUpdated.total).toBe(0);
  });

  it.each([
    ['productName' as const, '품절', 'mlp_002'],
    ['productCode' as const, 'p_002', 'mlp_002'],
    ['externalProductCode' as const, 'aaa111', 'mlp_001'],
    ['createdBy' as const, 'staff@', 'mlp_002'],
    ['updatedBy' as const, 'boss@', 'mlp_002'],
  ])('검색 타입 %s로 검색어를 매칭한다', (searchType, searchValue, expectedId) => {
    const result = getMockMallLinkedProducts('usr_001', search({ searchType, searchValue }), 1, 10);

    expect(result.linkedProducts.map((item) => item.id)).toEqual([expectedId]);
  });

  it('페이지 크기에 맞춰 잘라내고 페이지 정보를 반환한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search(), 2, 1);

    expect(result).toMatchObject({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
    expect(result.linkedProducts.map((item) => item.id)).toEqual(['mlp_002']);
  });

  it('조건에 맞는 데이터가 없으면 빈 배열과 totalPages 1을 반환한다', () => {
    const result = getMockMallLinkedProducts('usr_001', search({ searchValue: '없는상품' }), 1, 10);

    expect(result.linkedProducts).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- getMallLinkedProducts`

Expected: FAIL — `Failed to resolve import "./getMallLinkedProducts"` (파일이 아직 없음)

- [ ] **Step 3: 조회 유틸 구현**

`src/mocks/utils/getMallLinkedProducts.ts`를 아래 내용으로 생성한다.

```ts
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  GetMallLinkedProductsResponse,
  MallLinkedProduct,
  MallLinkedProductSearch,
  MallLinkedProductSearchType,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';

dayjs.extend(isBetween);

// 검색 타입별로 어떤 값을 대상으로 매칭할지 정의한다.
const SEARCH_TARGET: Record<MallLinkedProductSearchType, (item: MallLinkedProduct) => string> = {
  productName: (item) => item.productSnapshot.name,
  productCode: (item) => item.sourceProductId,
  externalProductCode: (item) => item.externalProductId ?? '',
  createdBy: (item) => item.createdByEmail,
  updatedBy: (item) => item.updatedByEmail ?? '',
};

const filterByDate = (
  dateType: MallLinkedProductSearch['dateType'],
  startDate: string,
  endDate: string,
  data: MallLinkedProduct[],
) => data.filter((item) => dayjs(item[dateType]).isBetween(startDate, endDate, 'day', '[]'));

const filterByMallCode = (mallCode: MallLinkedProductSearch['mallCode'], data: MallLinkedProduct[]) => {
  if (!mallCode || mallCode === 'ALL') return data;
  return data.filter((item) => item.mallCode === mallCode);
};

const filterBySetting = (shoppingSettingId: string, data: MallLinkedProduct[]) => {
  if (!shoppingSettingId || shoppingSettingId === 'ALL') return data;
  return data.filter((item) => item.sourceShoppingSettingId === shoppingSettingId);
};

const filterByLinkStatus = (linkStatus: MallLinkedProductSearch['linkStatus'], data: MallLinkedProduct[]) => {
  if (!linkStatus || linkStatus === 'ALL') return data;
  return data.filter((item) => item.status === linkStatus);
};

const filterBySaleState = (saleState: MallLinkedProductSearch['saleState'], data: MallLinkedProduct[]) => {
  if (!saleState || saleState === 'ALL') return data;
  return data.filter((item) => item.productSnapshot.state === saleState);
};

const filterBySearchValue = (
  searchType: MallLinkedProductSearchType,
  searchValue: string,
  data: MallLinkedProduct[],
) => {
  if (!searchValue) return data;
  const target = SEARCH_TARGET[searchType];
  return data.filter((item) => target(item).includes(searchValue));
};

export const getMockMallLinkedProducts = (
  ownerId: string,
  searchParams: MallLinkedProductSearch,
  page: number,
  pageSize: number,
): GetMallLinkedProductsResponse => {
  const { dateType, startDate, endDate, mallCode, shoppingSettingId, linkStatus, saleState, searchType, searchValue } =
    searchParams;

  const byOwner = MOCK_MALL_LINKED_PRODUCT_DATA.filter((item) => item.ownerId === ownerId);
  const byDate = filterByDate(dateType, startDate, endDate, byOwner);
  const byMall = filterByMallCode(mallCode, byDate);
  const bySetting = filterBySetting(shoppingSettingId, byMall);
  const byStatus = filterByLinkStatus(linkStatus, bySetting);
  const bySaleState = filterBySaleState(saleState, byStatus);
  const filtered = filterBySearchValue(searchType, searchValue, bySaleState);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const linkedProducts = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { linkedProducts, total, page, pageSize, totalPages };
};
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test -- getMallLinkedProducts`

Expected: PASS (13 tests — `it.each` 5건 포함)

- [ ] **Step 5: 목록 라우트 추가**

`src/mocks/handlers/mallLinkedProducts.ts`에 목록 라우트를 **배열 맨 앞에** 추가한다. 고정 경로(`/list`)를 먼저 등록하는 규칙을 따른다 (`.claude/rules/msw-rules.md`).

import에 아래 2줄을 추가한다.

```ts
import { MallLinkedProductSearch } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { getMockMallLinkedProducts } from '../utils/getMallLinkedProducts';
```

파일 최종 내용은 아래와 같다 (**전체 교체**).

```ts
import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import {
  MallLinkedProductRequestItem,
  MallLinkedProductSearch,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { isOwnerMatch } from '../utils/verifyOwnership';
import { createMockMallLinkedProducts } from '../utils/createMallLinkedProducts';
import { getMockMallLinkedProducts } from '../utils/getMallLinkedProducts';

export const mallLinkedProductHandlers = [
  http.post(`${baseUrl}/api/shopping/linked-products/list`, async ({ request }) => {
    const { ownerId, page, pageSize, ...searchParams } = (await request.json()) as MallLinkedProductSearch & {
      ownerId: string;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockMallLinkedProducts(ownerId, searchParams, page, pageSize));
  }),

  http.post(`${baseUrl}/api/shopping/linked-products`, async ({ request }) => {
    // 외부 쇼핑몰 API 응답 지연 시뮬레이션
    await delay(800);
    const { ownerId, createdByEmail, items } = (await request.json()) as {
      ownerId: string;
      createdByEmail: string;
      items: MallLinkedProductRequestItem[];
    };

    const productIds = [...new Set(items.map((item) => item.productId))];
    const allOwned = productIds.every((id) => {
      const product = MOCK_PRODUCT_DATA.find((p) => p.productId === id);
      return !!product && isOwnerMatch(product.ownerId, ownerId);
    });
    if (!allOwned) {
      return new HttpResponse(null, { status: 403 });
    }

    return HttpResponse.json(createMockMallLinkedProducts(items, ownerId, createdByEmail));
  }),
];
```

- [ ] **Step 6: 전체 확인**

Run: `npm run test`

Expected: 전체 PASS (테스트 파일 21개 / 132 테스트)

Run: `npm run build`

Expected: 성공

---

## Task 5: 목록 화면 — store · 상수 · API · 필터 UI

화면의 상태 계층과 검색 필터 카드를 만든다. 이 Task 단독으로는 화면이 렌더되지 않고, Task 6에서 조립된다.

**Files:**
- Create: `src/features/mallLinkedProduct/constant/mallLinkedProduct.constants.ts`
- Create: `src/features/mallLinkedProduct/store/search.store.ts`
- Create: `src/features/mallLinkedProduct/api/getMallLinkedProducts.ts`
- Create: `src/features/mallLinkedProduct/api/useGetMallLinkedProducts.ts`
- Create: `src/features/mallLinkedProduct/ui/components/filter/MallLinkedDateFilter.tsx`
- Create: `src/features/mallLinkedProduct/ui/components/filter/MallLinkedConditionFilter.tsx`
- Create: `src/features/mallLinkedProduct/ui/components/filter/MallLinkedSearchInput.tsx`
- Create: `src/features/mallLinkedProduct/ui/MallLinkedProductSearchFilterSection.tsx`

**Interfaces:**
- Consumes: Task 1의 `MallLinkedProductSearch`, `GetMallLinkedProductsResponse`, `MallLinkStatus`, `MallLinkedProductSearchType`. 기존 공용 컴포넌트 `FilterSelect`(`@/components/common/FilterSelect`), `RangeDatePicker`, `DatePickerRangeButton`, `Label`, `Input`, `Button`, `Select` 계열. 기존 `useGetActiveShoppingSettings`(`@/features/mallRegistration/api/useGetActiveShoppingSettings`), `SHOPPING_MALLS`(`@/shared/constant/shoppingMall.constant`), `PRODUCT_STATUS`·`ALL_PRODUCT_STATUS_OPTION`(`@/features/products/constant/status.constants`), `calculatorRangeDate`(`@/lib/utils`)
- Produces:
  - 상수: `MALL_LINKED_PRODUCT_TABLE_HEAD`, `MALL_LINKED_DATE_TYPE`, `MALL_LINK_STATUS_OPTIONS`, `MALL_LINKED_SEARCH_TYPE`, `ALL_FILTER_OPTION`
  - store: `currentPageAtom`, `dateTypeAtom`, `startDateAtom`, `endDateAtom`, `mallCodeAtom`, `shoppingSettingIdAtom`, `linkStatusAtom`, `saleStateAtom`, `searchTypeAtom`, `searchValueAtom`, `draftFilterAtom`, `committedFilterAtom`
  - api: `getMallLinkedProducts(ownerId, data, page, pageSize?)`, `useGetMallLinkedProducts()`
  - UI: `MallLinkedProductSearchFilterSection`

**테스트 없음:** UI 컴포넌트·API fetch 래퍼·store는 이 프로젝트의 테스트 범위 밖이다 (CLAUDE.md). 검증은 `npm run build`와 Task 6의 수동 확인으로 한다.

---

- [ ] **Step 1: 상수 파일 생성**

`src/features/mallLinkedProduct/constant/mallLinkedProduct.constants.ts`를 아래 내용으로 생성한다.

```ts
import { FilterOption, TableTitleValue } from '@/types/common.type';

export const ALL_FILTER_OPTION: FilterOption = { id: 'ALL', name: '전체' };

export const MALL_LINKED_PRODUCT_TABLE_HEAD: TableTitleValue[] = [
  { id: 'productCode', title: '상품코드', width: 'w-32' },
  { id: 'productName', title: '상품명' },
  { id: 'mallCode', title: '연동몰', width: 'w-28' },
  { id: 'settingNickname', title: '쇼핑몰계정', width: 'w-32' },
  { id: 'externalProductId', title: '쇼핑몰상품코드', width: 'w-40' },
  { id: 'price', title: '판매가', width: 'w-28' },
  { id: 'saleState', title: '판매상태', width: 'w-24' },
  { id: 'linkStatus', title: '연동상태', width: 'w-44' },
  { id: 'lastSentAt', title: '최종연동일시', width: 'w-36' },
];

export const MALL_LINKED_DATE_TYPE: FilterOption[] = [
  { id: 'lastSentAt', name: '최종연동일' },
  { id: 'updatedAt', name: '수정일' },
];

export const MALL_LINK_STATUS_OPTIONS: FilterOption[] = [
  { id: 'success', name: '성공' },
  { id: 'failed', name: '실패' },
];

export const MALL_LINKED_SEARCH_TYPE: FilterOption[] = [
  { id: 'productName', name: '상품명' },
  { id: 'productCode', name: '상품코드' },
  { id: 'externalProductCode', name: '쇼핑몰상품코드' },
  { id: 'createdBy', name: '등록자' },
  { id: 'updatedBy', name: '수정자' },
];
```

- [ ] **Step 2: 검색 필터 store 생성**

`src/features/mallLinkedProduct/store/search.store.ts`를 아래 내용으로 생성한다. 주문목록과 같은 draft/committed 2단 구조다 — 검색 버튼을 누르기 전까지는 API 호출에 반영되지 않는다.

```ts
import dayjs from 'dayjs';
import { atom } from 'jotai';
import {
  MallLinkedProductSearch,
  MallLinkedProductSearchType,
  MallLinkStatus,
} from '../types/mallLinkedProduct.types';
import { ProductStateType } from '@/features/products/types/product.types';
import { ShoppingMalls } from '@/types/common.type';

const DEFAULT_DATE_TYPE: MallLinkedProductSearch['dateType'] = 'lastSentAt';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_SEARCH_TYPE: MallLinkedProductSearchType = 'productName';

export const currentPageAtom = atom<number>(1);

export const dateTypeAtom = atom<MallLinkedProductSearch['dateType']>(DEFAULT_DATE_TYPE);
export const startDateAtom = atom<string>(DEFAULT_START_DATE);
export const endDateAtom = atom<string>(DEFAULT_END_DATE);
export const mallCodeAtom = atom<ShoppingMalls | 'ALL'>('ALL');
export const shoppingSettingIdAtom = atom<string>('ALL');
export const linkStatusAtom = atom<MallLinkStatus | 'ALL'>('ALL');
export const saleStateAtom = atom<ProductStateType | 'ALL'>('ALL');
export const searchTypeAtom = atom<MallLinkedProductSearchType>(DEFAULT_SEARCH_TYPE);
export const searchValueAtom = atom<string>('');

// UI 조작 중인 draft 필터 (검색 버튼 클릭 전까지 API 호출에 사용되지 않음)
export const draftFilterAtom = atom<MallLinkedProductSearch>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  mallCode: get(mallCodeAtom),
  shoppingSettingId: get(shoppingSettingIdAtom),
  linkStatus: get(linkStatusAtom),
  saleState: get(saleStateAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));

// 검색 버튼 클릭 시 확정된 필터 (API 쿼리에 실제로 사용)
export const committedFilterAtom = atom<MallLinkedProductSearch>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mallCode: 'ALL',
  shoppingSettingId: 'ALL',
  linkStatus: 'ALL',
  saleState: 'ALL',
  searchType: DEFAULT_SEARCH_TYPE,
  searchValue: '',
});
```

- [ ] **Step 3: API 래퍼와 훅 생성**

`src/features/mallLinkedProduct/api/getMallLinkedProducts.ts`:

```ts
import { GetMallLinkedProductsResponse, MallLinkedProductSearch } from '../types/mallLinkedProduct.types';

export const getMallLinkedProducts = async (
  ownerId: string,
  data: MallLinkedProductSearch,
  page: number,
  pageSize: number = 10,
): Promise<GetMallLinkedProductsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, ...data, page, pageSize }),
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 목록 호출 실패');
  }

  return response.json();
};
```

`src/features/mallLinkedProduct/api/useGetMallLinkedProducts.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { committedFilterAtom, currentPageAtom } from '../store/search.store';
import { getMallLinkedProducts } from './getMallLinkedProducts';

export const MALL_LINKED_PRODUCTS_QUERY_KEY = 'mallLinkedProducts';

export const useGetMallLinkedProducts = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const committedFilter = useAtomValue(committedFilterAtom);
  const currentPage = useAtomValue(currentPageAtom);

  return useQuery({
    queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY, workspaceOwnerId, committedFilter, currentPage],
    queryFn: () => getMallLinkedProducts(workspaceOwnerId, committedFilter, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
```

- [ ] **Step 4: 기간 필터 컴포넌트 생성**

`src/features/mallLinkedProduct/ui/components/filter/MallLinkedDateFilter.tsx`를 아래 내용으로 생성한다. 상품목록의 `ProductSearchDate`와 같은 구조다.

```tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import dayjs from 'dayjs';
import { calculatorRangeDate } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { RangeTypeProps } from '@/types/common.type';
import { dateTypeAtom, endDateAtom, startDateAtom } from '@/features/mallLinkedProduct/store/search.store';
import { MALL_LINKED_DATE_TYPE } from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { MallLinkedProductSearch } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

export const MallLinkedDateFilter = () => {
  const [dateType, setDateType] = useAtom(dateTypeAtom);
  const setStartDate = useSetAtom(startDateAtom);
  const setEndDate = useSetAtom(endDateAtom);

  const defaultStartDate = useMemo(() => dayjs().subtract(7, 'day').format('YYYY-MM-DD'), []);
  const defaultEndDate = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const [pickerInitDate, setPickerInitDate] = useState({ startDate: defaultStartDate, endDate: defaultEndDate });
  const [resetKey, setResetKey] = useState(0);

  const handleChangeDate = useCallback(
    (startDate: string, endDate: string) => {
      setStartDate(startDate);
      setEndDate(endDate);
    },
    [setStartDate, setEndDate],
  );

  const handleChangeDateRange = useCallback(
    (value: RangeTypeProps) => {
      const [startDate, endDate] = calculatorRangeDate(value);
      const formatStartDate = dayjs(startDate).format('YYYY-MM-DD');
      const formatEndDate = dayjs(endDate).format('YYYY-MM-DD');

      setPickerInitDate({ startDate: formatStartDate, endDate: formatEndDate });
      setResetKey((prev) => prev + 1);
      setStartDate(formatStartDate);
      setEndDate(formatEndDate);
    },
    [setStartDate, setEndDate],
  );

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색 일자</Label>
      <Select
        value={dateType}
        onValueChange={(value) => setDateType(value as MallLinkedProductSearch['dateType'])}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MALL_LINKED_DATE_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <RangeDatePicker
        initStartDate={pickerInitDate.startDate}
        initEndDate={pickerInitDate.endDate}
        resetKey={resetKey}
        onChangeDate={handleChangeDate}
      />
      <DatePickerRangeButton onChangeDateRange={handleChangeDateRange} />
    </div>
  );
};
```

- [ ] **Step 5: 조건 필터 컴포넌트 생성 (몰 · 계정 · 연동상태 · 판매상태)**

`src/features/mallLinkedProduct/ui/components/filter/MallLinkedConditionFilter.tsx`를 아래 내용으로 생성한다.

쇼핑몰 계정 옵션은 기존 활성 설정 조회 API를 재사용하고, 선택된 몰에 따라 좁힌다. 몰을 바꾸면 계정 선택을 `ALL`로 되돌린다 — 안 그러면 다른 몰의 설정 id가 남아 결과가 항상 0건이 된다.

```tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { FilterSelect } from '@/components/common/FilterSelect';
import { FilterOption, ShoppingMalls } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { ALL_PRODUCT_STATUS_OPTION, PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { ProductStateType } from '@/features/products/types/product.types';
import { useGetActiveShoppingSettings } from '@/features/mallRegistration/api/useGetActiveShoppingSettings';
import {
  linkStatusAtom,
  mallCodeAtom,
  saleStateAtom,
  shoppingSettingIdAtom,
} from '@/features/mallLinkedProduct/store/search.store';
import {
  ALL_FILTER_OPTION,
  MALL_LINK_STATUS_OPTIONS,
} from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { MallLinkStatus } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const MALL_OPTIONS: FilterOption[] = SHOPPING_MALLS.map((mall) => ({ id: mall.code, name: mall.name }));

export const MallLinkedConditionFilter = () => {
  const [mallCode, setMallCode] = useAtom(mallCodeAtom);
  const [shoppingSettingId, setShoppingSettingId] = useAtom(shoppingSettingIdAtom);
  const [linkStatus, setLinkStatus] = useAtom(linkStatusAtom);
  const [saleState, setSaleState] = useAtom(saleStateAtom);

  const { data: activeSettings } = useGetActiveShoppingSettings();

  const settingOptions: FilterOption[] = useMemo(() => {
    const settings = activeSettings ?? [];
    const scoped = mallCode === 'ALL' ? settings : settings.filter((setting) => setting.mallCode === mallCode);
    return scoped.map((setting) => ({ id: setting.id, name: setting.nickname }));
  }, [activeSettings, mallCode]);

  // 몰을 바꾸면 이전 몰의 설정 id가 남지 않도록 계정 선택을 초기화한다.
  useEffect(() => {
    if (shoppingSettingId !== 'ALL' && !settingOptions.some((option) => option.id === shoppingSettingId)) {
      setShoppingSettingId('ALL');
    }
  }, [settingOptions, shoppingSettingId, setShoppingSettingId]);

  return (
    <div className="flex items-center gap-6">
      <FilterSelect
        label="쇼핑몰"
        divClassName="flex items-center gap-4"
        labelClassName="w-20 text-right"
        triggerClassName="w-40"
        value={mallCode}
        onValueChange={(value) => setMallCode(value as ShoppingMalls | 'ALL')}
        options={MALL_OPTIONS}
        allOption={ALL_FILTER_OPTION}
      />
      <FilterSelect
        label="쇼핑몰 계정"
        divClassName="flex items-center gap-4"
        labelClassName="w-24 text-right"
        triggerClassName="w-40"
        value={shoppingSettingId}
        onValueChange={setShoppingSettingId}
        options={settingOptions}
        allOption={ALL_FILTER_OPTION}
      />
      <FilterSelect
        label="연동상태"
        divClassName="flex items-center gap-4"
        labelClassName="w-20 text-right"
        triggerClassName="w-32"
        value={linkStatus}
        onValueChange={(value) => setLinkStatus(value as MallLinkStatus | 'ALL')}
        options={MALL_LINK_STATUS_OPTIONS}
        allOption={ALL_FILTER_OPTION}
      />
      <FilterSelect
        label="판매상태"
        divClassName="flex items-center gap-4"
        labelClassName="w-20 text-right"
        triggerClassName="w-32"
        value={saleState}
        onValueChange={(value) => setSaleState(value as ProductStateType | 'ALL')}
        options={PRODUCT_STATUS}
        allOption={ALL_PRODUCT_STATUS_OPTION}
      />
    </div>
  );
};
```

- [ ] **Step 6: 검색어 입력 컴포넌트 생성**

`src/features/mallLinkedProduct/ui/components/filter/MallLinkedSearchInput.tsx`를 아래 내용으로 생성한다. 주문목록의 `OrderSearchInput`과 같은 구조다.

```tsx
'use client';

import { ChangeEventHandler, KeyboardEvent, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  committedFilterAtom,
  currentPageAtom,
  draftFilterAtom,
  searchTypeAtom,
} from '@/features/mallLinkedProduct/store/search.store';
import { MALL_LINKED_SEARCH_TYPE } from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { MallLinkedProductSearchType } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

export const MallLinkedSearchInput = () => {
  const [searchType, setSearchType] = useAtom(searchTypeAtom);
  const draftFilter = useAtomValue(draftFilterAtom);
  const setCommittedFilter = useSetAtom(committedFilterAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);

  const [inputValue, setInputValue] = useState('');

  const handleChangeInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setInputValue(e.target.value);
  };

  const handleSearch = () => {
    setCommittedFilter({ ...draftFilter, searchValue: inputValue });
    setCurrentPage(1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <Select
        value={searchType}
        onValueChange={(value) => setSearchType(value as MallLinkedProductSearchType)}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MALL_LINKED_SEARCH_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative max-w-md flex-1">
        <Input
          placeholder="검색어를 입력하세요..."
          value={inputValue}
          onChange={handleChangeInput}
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button onClick={handleSearch}>
        <Search className="mr-2 h-4 w-4" />
        검색
      </Button>
    </div>
  );
};
```

- [ ] **Step 7: 필터 카드 조립**

`src/features/mallLinkedProduct/ui/MallLinkedProductSearchFilterSection.tsx`를 아래 내용으로 생성한다.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MallLinkedDateFilter } from './components/filter/MallLinkedDateFilter';
import { MallLinkedConditionFilter } from './components/filter/MallLinkedConditionFilter';
import { MallLinkedSearchInput } from './components/filter/MallLinkedSearchInput';

export const MallLinkedProductSearchFilterSection = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">검색 및 필터</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          <div className="px-6 py-1">
            <MallLinkedDateFilter />
          </div>
          <div className="px-6 py-1">
            <MallLinkedConditionFilter />
          </div>
          <div className="px-6 py-1">
            <MallLinkedSearchInput />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 8: 타입 체크 및 린트**

Run: `npm run build`

Expected: 성공

Run: `npm run lint`

Expected: 에러 없음

---

## Task 6: 목록 화면 — 테이블 · 레이아웃 · 라우트 · 문서

테이블과 화면을 조립하고 라우트·사이드바를 연결한 뒤, 이번 라운드에서 정립한 도메인 규칙을 rules 문서에 남긴다.

**Files:**
- Create: `src/features/mallLinkedProduct/ui/components/MallLinkedProductTable.tsx`
- Create: `src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx`
- Create: `src/features/mallLinkedProduct/ui/MallLinkedProductHeaderSection.tsx`
- Create: `src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx`
- Create: `src/app/(authenticated)/shopping/linked-products/page.tsx`
- Modify: `src/constant/sidebarMenu.constant.ts:42-45`
- Modify: `.claude/rules/domain-design.md`

**Interfaces:**
- Consumes: Task 5의 `useGetMallLinkedProducts`, `currentPageAtom`, `MALL_LINKED_PRODUCT_TABLE_HEAD`, `MallLinkedProductSearchFilterSection`. 기존 `TablePagination`(`@/components/common/TablePagination`), `ProductStatusBadge`(`@/components/common/ProductStatusBadge`), `Badge`, `Table` 계열, `SHOPPING_MALLS`
- Produces: `/shopping/linked-products` 라우트

**테스트 없음:** UI 컴포넌트는 이 프로젝트의 테스트 범위 밖이다 (CLAUDE.md). 검증은 `npm run build`와 Step 8의 수동 확인으로 한다.

---

- [ ] **Step 1: 테이블 컴포넌트 생성**

`src/features/mallLinkedProduct/ui/components/MallLinkedProductTable.tsx`를 아래 내용으로 생성한다.

```tsx
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductStatusBadge } from '@/components/common/ProductStatusBadge';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { MALL_LINKED_PRODUCT_TABLE_HEAD } from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

type Props = {
  linkedProducts: MallLinkedProduct[];
};

const getMallName = (code: string) => SHOPPING_MALLS.find((mall) => mall.code === code)?.name ?? code;

export const MallLinkedProductTable = ({ linkedProducts }: Props) => {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
            {MALL_LINKED_PRODUCT_TABLE_HEAD.map((item) => (
              <TableHead
                key={item.id}
                className={`text-center font-bold uppercase tracking-widest ${item.width ?? ''}`}
              >
                {item.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linkedProducts.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={MALL_LINKED_PRODUCT_TABLE_HEAD.length}
                className="h-40 text-center text-sm text-muted-foreground"
              >
                조건에 맞는 연동 상품이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            linkedProducts.map((linked) => (
              <TableRow
                key={linked.id}
                className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
              >
                <TableCell className="text-center font-mono text-sm text-muted-foreground">
                  {linked.sourceProductId}
                </TableCell>
                <TableCell className="font-medium">{linked.productSnapshot.name}</TableCell>
                <TableCell className="text-center">{getMallName(linked.mallCode)}</TableCell>
                <TableCell className="text-center">{linked.settingSnapshot.nickname}</TableCell>
                <TableCell className="text-center font-mono text-sm text-muted-foreground">
                  {linked.externalProductId ?? '-'}
                </TableCell>
                <TableCell className="text-center">{linked.productSnapshot.price.toLocaleString()}원</TableCell>
                <TableCell className="text-center">
                  <ProductStatusBadge status={linked.productSnapshot.state} />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant={linked.status === 'success' ? 'default' : 'destructive'}>
                      {linked.status === 'success' ? '성공' : '실패'}
                    </Badge>
                    {linked.errorMessage && (
                      <span className="text-xs text-muted-foreground">{linked.errorMessage}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">{dayjs(linked.lastSentAt).format('YYYY-MM-DD HH:mm')}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
```

연동상태 배지는 `src/components/ui/badge.tsx`에 이미 있는 범용 variant `default`(성공) / `destructive`(실패, 빨강)를 쓴다. 상품 판매상태용 variant(`onSale`·`saleDisc` 등)는 의미가 다른 도메인이라 재사용하지 않는다 — 특히 `saleDisc`는 빨강이 아니라 primary 색이라 실패 표시에 맞지 않는다.

- [ ] **Step 2: 테이블 섹션 생성**

`src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx`를 아래 내용으로 생성한다.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MallLinkedProductTable } from './components/MallLinkedProductTable';

type Props = {
  linkedProducts: MallLinkedProduct[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
};

export const MallLinkedProductTableSection = ({
  linkedProducts,
  total,
  totalPages,
  currentPage,
  onChangePage,
  isLoading,
}: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">전체 {isLoading ? '-' : total}건</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <MallLinkedProductTable linkedProducts={linkedProducts} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 3: 헤더 섹션 생성**

`src/features/mallLinkedProduct/ui/MallLinkedProductHeaderSection.tsx`:

```tsx
export const MallLinkedProductHeaderSection = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">쇼핑몰 연동 상품 목록</h1>
      <p className="text-muted-foreground">쇼핑몰로 전송한 상품의 연동 상태를 확인하세요.</p>
    </div>
  );
};
```

- [ ] **Step 4: 레이아웃 생성**

`src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx`를 아래 내용으로 생성한다.

```tsx
'use client';

import { useAtom } from 'jotai';
import { currentPageAtom } from '@/features/mallLinkedProduct/store/search.store';
import { useGetMallLinkedProducts } from '@/features/mallLinkedProduct/api/useGetMallLinkedProducts';
import { MallLinkedProductHeaderSection } from './MallLinkedProductHeaderSection';
import { MallLinkedProductSearchFilterSection } from './MallLinkedProductSearchFilterSection';
import { MallLinkedProductTableSection } from './MallLinkedProductTableSection';

export const MallLinkedProductLayout = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const { data, isLoading, isError } = useGetMallLinkedProducts();

  return (
    <>
      <MallLinkedProductHeaderSection />
      <MallLinkedProductSearchFilterSection />
      {isError ? (
        <p className="py-10 text-center text-sm text-destructive">연동 상품 목록을 불러오는데 실패했습니다.</p>
      ) : (
        <MallLinkedProductTableSection
          linkedProducts={data?.linkedProducts ?? []}
          total={data?.total ?? 0}
          totalPages={data?.totalPages ?? 1}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
```

- [ ] **Step 5: 라우트 생성**

`src/app/(authenticated)/shopping/linked-products/page.tsx`:

```tsx
import { MallLinkedProductLayout } from '@/features/mallLinkedProduct/ui/MallLinkedProductLayout';

export default function MallLinkedProductPage() {
  return <MallLinkedProductLayout />;
}
```

- [ ] **Step 6: 사이드바 메뉴 추가**

`src/constant/sidebarMenu.constant.ts`의 `쇼핑몰관리` 그룹 `items` 배열 끝(42~45번 줄의 '쇼핑몰 상품등록' 항목 다음)에 아래를 추가한다.

```ts
      {
        title: '쇼핑몰 연동상품',
        url: '/shopping/linked-products',
      },
```

- [ ] **Step 7: 타입 체크 · 린트 · 전체 테스트**

Run: `npm run build`

Expected: 성공

Run: `npm run lint`

Expected: 에러 없음

Run: `npm run test`

Expected: 전체 PASS (테스트 파일 21개 / 132 테스트)

- [ ] **Step 8: 수동 동작 확인**

Run: `npm run dev` 후 로그인하고 사이드바 `쇼핑몰관리 > 쇼핑몰 연동상품` 진입

확인 항목:

1. 시드 12건이 보인다 — 기본 기간 필터가 최근 7일이므로 **기간을 1개월 이상으로 넓혀야 전체가 보인다** (시드의 `lastSentAt`은 2026-07-20 ~ 2026-08-01)
2. 같은 상품(`smp000002`)이 서로 다른 몰로 여러 행에 나타난다
3. 같은 상품 × 같은 몰 조합(`smp000003` × 네이버)이 2행으로 나타나고, 하나는 성공(외부 상품코드 있음), 하나는 실패(`동일 상품이 이미 등록되어 있습니다`)다
4. 실패 행은 연동상태 컬럼에 배지 아래 사유 텍스트가 보인다
5. 쇼핑몰 필터를 `스마트스토어`로 바꾸면 쇼핑몰 계정 옵션이 네이버 설정만 남고, 이전에 고른 쿠팡 설정 선택이 `전체`로 되돌아간다
6. 연동상태 `실패`, 판매상태 필터, 검색 타입 5종(상품명·상품코드·쇼핑몰상품코드·등록자·수정자)이 각각 동작한다
7. `/shopping/register`에서 상품을 선택해 전송하면 알림이 뜨고, 이 목록 화면(기간을 오늘 포함으로)에서 새 연동 데이터가 보인다 — 전송 배선(Task 3)이 살아있는지 확인
8. 로그인 계정과 무관한 데이터가 섞이지 않는다

- [ ] **Step 9: 도메인 규칙 문서화**

`.claude/rules/domain-design.md`의 `## 유저 계층 구조` 절 다음에 아래 절을 추가한다.

````markdown
## 오리지널 데이터와 쇼핑몰 연동 데이터

`/products/create`로 만든 **오리지널 상품**(`Product`), `/shopping/settings`로 만든 **오리지널 쇼핑몰정보설정**(`ShoppingSetting`), 그리고 `/shopping/register` 전송으로 만들어지는 **쇼핑몰 연동 데이터**(`MallLinkedProduct`)는 서로 별개의 데이터다.

- 연동 데이터는 생성 시점의 상품·설정 값을 **스냅샷으로 복사해 보유**한다 (`productSnapshot`, `settingSnapshot`).
- **오리지널을 수정해도 연동 데이터는 바뀌지 않는다.** 연동 데이터의 수정은 각 연동 건을 직접 고쳐서 해당 몰로 전송하는 방식이다.
- **연동 데이터 1건 = 외부 쇼핑몰 상품 1개** (외부몰이 부여한 `externalProductId` 1개).
- 같은 상품을 같은 몰로 **여러 번 전송할 수 있고**, 그때마다 별도 연동 데이터가 생성된다. 외부몰이 중복이라 판단하면 실패 응답을 준다.
- 스냅샷은 반드시 **깊은 복사**(`structuredClone`)로 만든다. 얕은 복사는 중첩 객체가 오리지널과 공유되어 위 원칙이 깨진다.
- `MallLinkedProduct`는 **불변 식별 정보**(`sourceProductId`, `sourceShoppingSettingId`, `mallCode`)와 **가변 스냅샷**을 분리해 둔다. 수정 기능이 스냅샷만 건드리고 원본 추적 정보는 못 건드리게 하기 위해서다.
- 시각 필드는 셋으로 나뉜다 — `createdAt`(최초 생성) / `lastSentAt`(최종 전송, 화면의 '최종연동일시') / `updatedAt`(마지막 수정). 하나로 합치면 "수정만 하고 전송은 나중에" 하는 순간 의미가 갈라져 깨진다.

설계 근거: `docs/superpowers/specs/2026-08-01-mall-linked-product-list-design.md`
````

Run: `npm run lint`

Expected: 에러 없음 (문서 변경이라 영향 없음 — 최종 상태 확인용)

---

## 완료 후

- **커밋하지 않는다.** 모든 Task 완료 후 사용자에게 검토를 요청하고, 커밋·PR은 사용자가 명시적으로 요청할 때만 진행한다.
- 이번 라운드의 비자명한 결정(스냅샷 독립성, 중복 연동 허용, 시각 필드 3분할)은 `/ce-compound`로 `docs/solutions/`에 기록할 후보다. 브랜치 마무리 전에 사용자에게 제안한다.
