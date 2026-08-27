# 쇼핑몰 연동 상품 목록 액션 영역 및 일괄수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/shopping/linked-products` 목록에 액션 버튼 영역을 추가하고, 선택한 연동 건들의 상품 값을 필드 단위로 일괄 수정하는 화면과 쇼핑몰 정보설정을 통째로 갈아끼우는 모달을 만든다.

**Architecture:** 다건 부분수정을 `PATCH /api/shopping/linked-products/bulk` 엔드포인트 하나로 받는다. 상품 쪽은 클라이언트가 `Partial<Product>` patch를 보내 서버가 얕은 병합하고, 설정 쪽은 클라이언트가 `shoppingSettingId`만 보내 서버가 오리지널 설정을 읽어 깊은 복사로 스냅샷을 통째 교체한다. 일괄수정 화면의 값 폼은 `useForm<Product>()` flat 구조라 기존 옵션·정보고시 섹션을 그대로 재사용할 수 있고, 체크 상태는 별도 `useState`로 분리한다.

**Tech Stack:** Next.js 15 App Router, React Hook Form, Jotai, TanStack Query, MSW, Vitest, Tailwind CSS 4 + shadcn/ui

**Spec:** [`docs/superpowers/specs/2026-08-27-mall-linked-product-bulk-edit-design.md`](../specs/2026-08-27-mall-linked-product-bulk-edit-design.md)

## Global Constraints

- **git 명령을 실행하지 않는다.** 각 Task의 커밋 스텝은 계획 문서상의 안내일 뿐이며, 사용자가 그 시점에 명시적으로 요청할 때만 실제 git 명령을 실행한다 (CLAUDE.md Git/PR 규칙).
- **`src/app/api/**/route.ts`를 만들지 않는다.** 모든 API는 `src/mocks/handlers/`의 MSW 핸들러로 처리한다 (`msw-rules.md`).
- **MSW 핸들러는 위임만 한다.** 조건문·반복문·데이터 조작은 `src/mocks/utils/`로 분리한다.
- **고정 경로 핸들러를 동적 경로보다 먼저 등록한다.** `.../linked-products/bulk`는 `.../linked-products/:id`보다 위에 온다.
- **폰트 크기와 폰트 색상을 변경하지 않는다** (CLAUDE.md 스타일 수정 규칙).
- 필터 '전체' 옵션은 `ALL_FILTER_OPTION`, mallCode→한글명은 `getShoppingMallName()`을 import한다. 도메인마다 재정의하지 않는다 (`ui-conventions.md`).
- Prettier: `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`
- 테스트 명령: `npm run test` (Vitest 1회 실행), `npm run lint`
- 테스트 대상은 순수 함수만이다. UI 컴포넌트와 fetch 래퍼 함수는 테스트하지 않는다 (프로젝트 관례).

---

## File Structure

### 신규

| 파일 | 책임 |
|------|------|
| `src/features/mallLinkedProduct/constant/productBulkEdit.constants.ts` | 체크 그룹 → `Product` 키 매핑, 파생 타입 |
| `src/features/mallLinkedProduct/util/buildProductBulkPatch.ts` | 체크 상태 + 값 → `Partial<Product>` patch, 검증용 필드명 목록 |
| `src/features/mallLinkedProduct/util/buildProductBulkPatch.test.ts` | 위 두 순수 함수의 테스트 |
| `src/features/mallLinkedProduct/api/bulkUpdateMallLinkedProducts.ts` | fetch 래퍼 |
| `src/features/mallLinkedProduct/api/useBulkUpdateMallLinkedProducts.ts` | React Query mutation + 캐시 무효화 |
| `src/mocks/utils/bulkUpdateMallLinkedProducts.ts` | 다건 스냅샷 갱신 로직 |
| `src/mocks/utils/bulkUpdateMallLinkedProducts.test.ts` | 위 로직의 테스트 |
| `src/features/mallLinkedProduct/ui/MallLinkedProductActionSection.tsx` | 액션 버튼 3개 + 재전송 로직 + 진입 가드 |
| `src/features/mallLinkedProduct/ui/components/ShoppingSettingApplyModal.tsx` | 설정 선택 모달 |
| `src/features/mallLinkedProduct/ui/bulkEdit/product/BulkEditFieldWrapper.tsx` | 필드 단위 체크박스 + 라벨 + disabled 컨텍스트 |
| `src/features/mallLinkedProduct/ui/bulkEdit/product/BulkEditSectionWrapper.tsx` | 섹션 단위 체크박스 카드 (옵션·정보고시용) |
| `src/features/mallLinkedProduct/ui/bulkEdit/product/sections/*.tsx` (6개) | 필드 단위 체크박스를 가진 상품 섹션 |
| `src/features/mallLinkedProduct/ui/bulkEdit/product/ProductBulkEditLayout.tsx` | 폼 조립, 진입 가드, 제출 |
| `src/app/(authenticated)/shopping/linked-products/bulk-edit/product/page.tsx` | 라우트 진입점 |

### 수정

| 파일 | 변경 |
|------|------|
| `src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts` | `BulkUpdateMallLinkedProductsBody` / `BulkUpdateMallLinkedProductsResult` 추가 |
| `src/mocks/handlers/mallLinkedProducts.ts` | `PATCH .../bulk` 핸들러를 `:id`보다 먼저 추가 |
| `src/features/mallLinkedProduct/store/selection.store.ts` | `isSettingApplyModalOpenAtom` 추가 |
| `src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx` | 재전송 로직 제거, `전체 N건`만 남김 |
| `src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx` | `MallLinkedProductActionSection` 삽입 |

---

## Task 순서 근거

Task 1(순수 함수) → Task 2(서버 로직) → Task 3(API 배선) 순으로 **아래에서 위로** 쌓는다. 화면(Task 4~7)은 그 위에 얹는다. Task 4(액션 영역)를 화면 작업의 첫 번째로 두는 이유는 이것만으로도 목록 화면이 완결되어(재전송 이동 + 두 버튼의 진입 가드) 독립적으로 검토·되돌리기가 가능하기 때문이다.

---

### Task 1: 체크 그룹 상수와 patch 생성 순수 함수

**Files:**
- Create: `src/features/mallLinkedProduct/constant/productBulkEdit.constants.ts`
- Create: `src/features/mallLinkedProduct/util/buildProductBulkPatch.ts`
- Test: `src/features/mallLinkedProduct/util/buildProductBulkPatch.test.ts`

**Interfaces:**
- Consumes: `Product` (`@/features/products/types/product.types`)
- Produces:
  - `PRODUCT_BULK_EDIT_GROUPS` — 체크 그룹 → `readonly (keyof Product)[]` 매핑
  - `ProductBulkEditGroupKey = keyof typeof PRODUCT_BULK_EDIT_GROUPS`
  - `ProductBulkEditChecked = Partial<Record<ProductBulkEditGroupKey, boolean>>`
  - `buildProductBulkPatch(values: Partial<Product>, checked: ProductBulkEditChecked): Partial<Product>`
  - `collectCheckedFieldNames(checked: ProductBulkEditChecked): (keyof Product)[]`

- [ ] **Step 1: 실패 테스트 작성**

`src/features/mallLinkedProduct/util/buildProductBulkPatch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import { buildProductBulkPatch, collectCheckedFieldNames } from './buildProductBulkPatch';

const VALUES = {
  name: '새 상품명',
  price: 15000,
  netPrice: 9000,
  modelName: '',
  deliveryType: 'PAID',
  deliveryPrice: 3000,
  originCountryCode: 'ETC',
  originCountryEtc: '베트남',
  option: [{ values: { 색상: '빨강' }, quantity: 5, skuCode: 'sku-1', optionPrice: 0 }],
  subOption: [],
  informationDisclosure: { key: 'wear', id: 'd_01', name: '의류', fields: { 제조자: 'ACME' } },
} as unknown as Partial<Product>;

describe('buildProductBulkPatch', () => {
  it('체크된 그룹의 키만 patch에 담는다', () => {
    const patch = buildProductBulkPatch(VALUES, { name: true });

    expect(patch).toEqual({ name: '새 상품명' });
  });

  it('미체크 그룹의 키는 키 자체가 존재하지 않는다', () => {
    const patch = buildProductBulkPatch(VALUES, { name: true });

    // undefined 값으로 담기면 서버 병합에서 기존 값을 지워버린다. 키가 없어야 한다.
    expect('price' in patch).toBe(false);
  });

  it('그룹 하나가 여러 키를 커버하면 체크 하나로 전부 담는다', () => {
    const patch = buildProductBulkPatch(VALUES, { delivery: true, originCountry: true, option: true });

    expect(patch).toEqual({
      deliveryType: 'PAID',
      deliveryPrice: 3000,
      originCountryCode: 'ETC',
      originCountryEtc: '베트남',
      option: VALUES.option,
      subOption: [],
    });
  });

  it('체크했고 값이 빈 문자열이면 빈 문자열을 그대로 담는다 (선택 필드 지우기)', () => {
    const patch = buildProductBulkPatch(VALUES, { modelName: true });

    expect(patch).toEqual({ modelName: '' });
  });

  it('아무것도 체크하지 않으면 빈 객체를 반환한다', () => {
    expect(buildProductBulkPatch(VALUES, {})).toEqual({});
  });
});

describe('collectCheckedFieldNames', () => {
  it('체크된 그룹이 커버하는 키를 평탄화해 돌려준다', () => {
    expect(collectCheckedFieldNames({ delivery: true, name: true })).toEqual([
      'name',
      'deliveryType',
      'deliveryPrice',
    ]);
  });

  it('미체크 그룹의 키는 포함하지 않는다', () => {
    // 정보고시에는 required 규칙이 있어, 체크하지 않았는데 목록에 들어가면 제출이 막힌다.
    expect(collectCheckedFieldNames({ name: true })).not.toContain('informationDisclosure');
  });

  it('아무것도 체크하지 않으면 빈 배열을 반환한다', () => {
    expect(collectCheckedFieldNames({})).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- buildProductBulkPatch`
Expected: FAIL — `Failed to resolve import "./buildProductBulkPatch"`

- [ ] **Step 3: 상수 파일 작성**

`src/features/mallLinkedProduct/constant/productBulkEdit.constants.ts`:

```ts
import { Product } from '@/features/products/types/product.types';

/**
 * 일괄수정 화면의 체크박스 1개가 커버하는 Product 키들.
 *
 * 대부분 1:1이지만, 값이 서로에게 종속된 필드는 한 체크박스로 묶는다 —
 * 배송비는 배송방법에, 원산지 기타 입력은 원산지 코드에 종속되므로
 * 따로 체크할 수 있게 두면 반쪽만 바뀐 상태가 만들어진다.
 *
 * productId·ownerId·createDate·updateDate는 일괄수정 대상이 아니라 여기 없다.
 */
export const PRODUCT_BULK_EDIT_GROUPS = {
  customerCode: ['customerCode'],
  name: ['name'],
  categoryId: ['categoryId'],
  keyWords: ['keyWords'],
  state: ['state'],
  netPrice: ['netPrice'],
  price: ['price'],
  totalQuantity: ['totalQuantity'],
  delivery: ['deliveryType', 'deliveryPrice'],
  brand: ['brand'],
  manufacturer: ['manufacturer'],
  modelName: ['modelName'],
  modelId: ['modelId'],
  originCountry: ['originCountryCode', 'originCountryEtc'],
  taxType: ['taxType'],
  adultProductType: ['adultProductType'],
  mainImage: ['mainImage'],
  detailPage: ['detailPage'],
  option: ['option', 'subOption'],
  informationDisclosure: ['informationDisclosure'],
} as const satisfies Record<string, readonly (keyof Product)[]>;

export type ProductBulkEditGroupKey = keyof typeof PRODUCT_BULK_EDIT_GROUPS;

export type ProductBulkEditChecked = Partial<Record<ProductBulkEditGroupKey, boolean>>;

/** 체크했으면 값이 반드시 있어야 하는 그룹 — Product 타입에서 optional(?)이 아닌 필드를 커버한다. */
export const REQUIRED_BULK_EDIT_GROUPS: ProductBulkEditGroupKey[] = [
  'name',
  'categoryId',
  'price',
  'state',
  'totalQuantity',
  'delivery',
  'mainImage',
  'detailPage',
  'brand',
  'manufacturer',
  'informationDisclosure',
];
```

- [ ] **Step 4: 순수 함수 구현**

`src/features/mallLinkedProduct/util/buildProductBulkPatch.ts`:

```ts
import { Product } from '@/features/products/types/product.types';
import {
  PRODUCT_BULK_EDIT_GROUPS,
  ProductBulkEditChecked,
  ProductBulkEditGroupKey,
} from '../constant/productBulkEdit.constants';

const checkedGroups = (checked: ProductBulkEditChecked): ProductBulkEditGroupKey[] =>
  (Object.keys(PRODUCT_BULK_EDIT_GROUPS) as ProductBulkEditGroupKey[]).filter((group) => checked[group] === true);

/**
 * 체크된 그룹이 커버하는 키만 골라 서버로 보낼 patch를 만든다.
 *
 * 미체크 키는 값을 undefined로 담지 않고 키 자체를 넣지 않는다 —
 * 서버가 `{ ...기존, ...patch }`로 얕은 병합하므로, undefined가 담기면 기존 값이 지워진다.
 */
export const buildProductBulkPatch = (
  values: Partial<Product>,
  checked: ProductBulkEditChecked,
): Partial<Product> => {
  const patch: Partial<Product> = {};

  checkedGroups(checked).forEach((group) => {
    PRODUCT_BULK_EDIT_GROUPS[group].forEach((key) => {
      // 타입 파라미터별 대입을 TS가 좁히지 못해 단언이 필요하다. 키·값 모두 같은 Product에서 왔다.
      (patch as Record<string, unknown>)[key] = values[key];
    });
  });

  return patch;
};

/**
 * 체크된 그룹이 커버하는 Product 키 목록. RHF trigger()에 넘겨 검증 범위를 좁히는 데 쓴다.
 *
 * handleSubmit을 쓰지 않는 이유가 여기 있다 — 재사용하는 정보고시 섹션에 required 규칙이 있어,
 * 전체 검증을 돌리면 체크하지 않은 정보고시 때문에 제출이 막힌다.
 */
export const collectCheckedFieldNames = (checked: ProductBulkEditChecked): (keyof Product)[] =>
  checkedGroups(checked).flatMap((group) => [...PRODUCT_BULK_EDIT_GROUPS[group]]);
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test -- buildProductBulkPatch`
Expected: PASS — 8 tests passed

- [ ] **Step 6: 커밋** *(사용자가 요청한 경우에만 실행)*

```bash
git add src/features/mallLinkedProduct/constant/productBulkEdit.constants.ts src/features/mallLinkedProduct/util/
git commit -m "feat: 연동상품 일괄수정 체크 그룹 상수와 patch 생성 함수를 추가한다"
```

---

### Task 2: MSW 다건 부분수정 로직

**Files:**
- Modify: `src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts` (파일 끝에 추가)
- Create: `src/mocks/utils/bulkUpdateMallLinkedProducts.ts`
- Test: `src/mocks/utils/bulkUpdateMallLinkedProducts.test.ts`

**Interfaces:**
- Consumes: `Product`, `ShoppingSetting`, `MallLinkedProduct`, `isOwnerMatch` (`src/mocks/utils/verifyOwnership`)
- Produces:
  - `BulkUpdateMallLinkedProductsBody { ownerId, ids, updatedByEmail, productSnapshot?, shoppingSettingId? }`
  - `BulkUpdateMallLinkedProductsResult { totalCount, successCount, failCount }`
  - `bulkUpdateMockMallLinkedProducts(body: BulkUpdateMallLinkedProductsBody): BulkUpdateMallLinkedProductsResult | null` — patch가 둘 다 없으면 `null`

- [ ] **Step 1: 타입 추가**

`src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts` 파일 끝에 덧붙인다:

```ts
/**
 * 다건 부분수정 요청.
 * productSnapshot은 보낸 키만 기존 스냅샷에 얕은 병합되고,
 * shoppingSettingId는 서버가 오리지널 설정을 읽어 settingSnapshot을 통째 교체하는 데 쓴다.
 * 둘 다 없으면 400이다.
 */
export interface BulkUpdateMallLinkedProductsBody {
  ownerId: string;
  ids: string[];
  updatedByEmail: string;
  productSnapshot?: Partial<Product>;
  shoppingSettingId?: string;
}

/** Create/Resend 결과와 구조가 같지만 의미가 다르고 독립적으로 변할 수 있어 합치지 않는다. */
export interface BulkUpdateMallLinkedProductsResult {
  totalCount: number;
  successCount: number;
  failCount: number;
}
```

- [ ] **Step 2: 실패 테스트 작성**

`src/mocks/utils/bulkUpdateMallLinkedProducts.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const EDITOR_EMAIL = 'editor@shop.com';
const ORIGINAL_TIME = '2026-08-01T00:00:00.000Z';

// vi.hoisted 콜백은 모듈 스코프 const 선언보다 먼저 실행된다.
// 콜백 안에서 바깥 상수를 참조하면 TDZ ReferenceError가 나므로, 콜백이 쓰는 상수는 안에서 선언한다.
const { LINKED, SETTINGS, resetMocks, OWNER_ID } = vi.hoisted(() => {
  const OWNER_ID = 'usr_001';
  const OTHER_OWNER_ID = 'usr_999';

  const makeLinked = (id: string, ownerId: string): MallLinkedProduct =>
    ({
      id,
      ownerId,
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      externalProductId: 'ext_NSST_keep1',
      productSnapshot: {
        productId: 'p_001',
        name: '원본 상품명',
        price: 10000,
        brand: '원본 브랜드',
        informationDisclosure: { key: 'wear', id: 'd_01', name: '의류', fields: { 제조자: '원본제조사' } },
      },
      settingSnapshot: {
        id: 'ss_001',
        ownerId,
        mallAccountId: 'sa_001',
        mallId: 'naver_seller_01',
        mallCode: 'NSST',
        nickname: '원본 설정명',
        shippingAddress: { code: 'addr_a', name: '원본 출고지', zipCode: '00000', address: 'A', addressDetail: '' },
      },
      createdByEmail: 'seller@shop.com',
      createdAt: ORIGINAL_TIME,
      lastSentAt: ORIGINAL_TIME,
      updatedAt: ORIGINAL_TIME,
    }) as unknown as MallLinkedProduct;

  const makeSetting = (id: string, mallAccountId: string, nickname: string): ShoppingSetting =>
    ({
      id,
      ownerId: OWNER_ID,
      mallAccountId,
      mallId: mallAccountId === 'sa_001' ? 'naver_seller_01' : 'naver_seller_02',
      mallCode: 'NSST',
      nickname,
      isActive: true,
      shippingAddress: { code: 'addr_b', name: '새 출고지', zipCode: '11111', address: 'B', addressDetail: '' },
      returnAddress: null,
    }) as unknown as ShoppingSetting;

  const LINKED: MallLinkedProduct[] = [];
  const SETTINGS: ShoppingSetting[] = [];

  const resetMocks = () => {
    LINKED.length = 0;
    LINKED.push(makeLinked('mlp_001', OWNER_ID), makeLinked('mlp_002', OTHER_OWNER_ID));
    SETTINGS.length = 0;
    SETTINGS.push(
      makeSetting('ss_002', 'sa_001', '같은 계정 설정'),
      makeSetting('ss_003', 'sa_999', '다른 계정 설정'),
    );
  };

  resetMocks();

  return { LINKED, SETTINGS, resetMocks, OWNER_ID };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));
vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));

import { bulkUpdateMockMallLinkedProducts } from './bulkUpdateMallLinkedProducts';

const baseBody = { ownerId: OWNER_ID, ids: ['mlp_001'], updatedByEmail: EDITOR_EMAIL };

describe('bulkUpdateMockMallLinkedProducts — 상품 patch', () => {
  beforeEach(() => resetMocks());

  it('보낸 키만 덮고 나머지 키는 유지한다', () => {
    bulkUpdateMockMallLinkedProducts({ ...baseBody, productSnapshot: { name: '수정된 상품명' } as Partial<Product> });

    expect(LINKED[0].productSnapshot.name).toBe('수정된 상품명');
    expect(LINKED[0].productSnapshot.price).toBe(10000);
    expect(LINKED[0].productSnapshot.brand).toBe('원본 브랜드');
  });

  it('수정 시각과 수정자를 갱신한다', () => {
    bulkUpdateMockMallLinkedProducts({ ...baseBody, productSnapshot: { name: 'x' } as Partial<Product> });

    expect(LINKED[0].updatedByEmail).toBe(EDITOR_EMAIL);
    expect(LINKED[0].updatedAt).not.toBe(ORIGINAL_TIME);
  });

  it('전송 관련 필드(status·lastSentAt·externalProductId)를 건드리지 않는다', () => {
    bulkUpdateMockMallLinkedProducts({ ...baseBody, productSnapshot: { name: 'x' } as Partial<Product> });

    expect(LINKED[0].status).toBe('success');
    expect(LINKED[0].lastSentAt).toBe(ORIGINAL_TIME);
    expect(LINKED[0].externalProductId).toBe('ext_NSST_keep1');
  });

  it('요청 본문과 스냅샷이 객체를 공유하지 않는다 (깊은 복사)', () => {
    const patch = {
      informationDisclosure: { key: 'wear', id: 'd_01', name: '의류', fields: { 제조자: '새제조사' } },
    } as unknown as Partial<Product>;

    bulkUpdateMockMallLinkedProducts({ ...baseBody, productSnapshot: patch });
    LINKED[0].productSnapshot.informationDisclosure.fields.제조자 = '변조';

    expect((patch.informationDisclosure as { fields: Record<string, string> }).fields.제조자).toBe('새제조사');
  });

  it('타인 소유 건은 변경하지 않고 failCount에 센다', () => {
    const result = bulkUpdateMockMallLinkedProducts({
      ...baseBody,
      ids: ['mlp_002'],
      productSnapshot: { name: 'x' } as Partial<Product>,
    });

    expect(LINKED[1].productSnapshot.name).toBe('원본 상품명');
    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
  });
});

describe('bulkUpdateMockMallLinkedProducts — 설정 교체', () => {
  beforeEach(() => resetMocks());

  it('settingSnapshot을 오리지널 설정 값으로 교체하고 sourceShoppingSettingId를 갱신한다', () => {
    const result = bulkUpdateMockMallLinkedProducts({ ...baseBody, shoppingSettingId: 'ss_002' });

    expect(LINKED[0].settingSnapshot.nickname).toBe('같은 계정 설정');
    expect(LINKED[0].settingSnapshot.shippingAddress?.code).toBe('addr_b');
    expect(LINKED[0].sourceShoppingSettingId).toBe('ss_002');
    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
  });

  it('오리지널 설정과 스냅샷이 객체를 공유하지 않는다 (깊은 복사)', () => {
    bulkUpdateMockMallLinkedProducts({ ...baseBody, shoppingSettingId: 'ss_002' });
    LINKED[0].settingSnapshot.shippingAddress!.name = '변조';

    expect(SETTINGS[0].shippingAddress?.name).toBe('새 출고지');
  });

  it('계정이 다른 설정은 적용하지 않고 failCount에 센다', () => {
    const result = bulkUpdateMockMallLinkedProducts({ ...baseBody, shoppingSettingId: 'ss_003' });

    expect(LINKED[0].settingSnapshot.nickname).toBe('원본 설정명');
    expect(LINKED[0].sourceShoppingSettingId).toBe('ss_001');
    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
  });

  it('없는 설정 id면 적용하지 않고 failCount에 센다', () => {
    const result = bulkUpdateMockMallLinkedProducts({ ...baseBody, shoppingSettingId: 'ss_없음' });

    expect(LINKED[0].settingSnapshot.nickname).toBe('원본 설정명');
    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
  });
});

describe('bulkUpdateMockMallLinkedProducts — 잘못된 요청', () => {
  beforeEach(() => resetMocks());

  it('productSnapshot과 shoppingSettingId가 둘 다 없으면 null을 반환한다', () => {
    expect(bulkUpdateMockMallLinkedProducts(baseBody)).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test -- bulkUpdateMallLinkedProducts`
Expected: FAIL — `Failed to resolve import "./bulkUpdateMallLinkedProducts"`

- [ ] **Step 4: 최소 구현**

`src/mocks/utils/bulkUpdateMallLinkedProducts.ts`:

```ts
import {
  BulkUpdateMallLinkedProductsBody,
  BulkUpdateMallLinkedProductsResult,
  MallLinkedProduct,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { isOwnerMatch } from './verifyOwnership';

/**
 * 고른 설정을 이 연동 건에 적용해도 되는지 판정한다.
 *
 * mallCode·mallAccountId·mallId는 연동 데이터의 불변 식별 정보다 (domain-design.md).
 * 연동 1건 = 특정 계정으로 등록된 외부몰 상품 1개이므로, 계정이 바뀌면 같은 상품의 수정이 아니라
 * 다른 상품이 된다. UI에서 같은 몰·계정으로 이미 좁히지만 최종 방어선을 여기 둔다.
 */
const isApplicableSetting = (linked: MallLinkedProduct, setting: ShoppingSetting): boolean =>
  setting.mallCode === linked.mallCode &&
  setting.mallAccountId === linked.settingSnapshot.mallAccountId &&
  setting.mallId === linked.settingSnapshot.mallId;

/**
 * 선택한 연동 건들의 스냅샷을 한 번에 갱신한다.
 *
 * 상품은 클라이언트가 보낸 patch를 얕은 병합하고, 설정은 shoppingSettingId로 오리지널을 읽어
 * 통째 교체한다 — 설정 쪽을 서버가 읽어 복사하는 것은 생성 흐름과 같은 책임 분담이다.
 *
 * status·lastSentAt·externalProductId는 전송 액션의 소관이라 여기서 건드리지 않는다.
 */
export const bulkUpdateMockMallLinkedProducts = (
  body: BulkUpdateMallLinkedProductsBody,
): BulkUpdateMallLinkedProductsResult | null => {
  const { ownerId, ids, updatedByEmail, productSnapshot, shoppingSettingId } = body;

  if (!productSnapshot && !shoppingSettingId) return null;

  const now = new Date().toISOString();
  const result: BulkUpdateMallLinkedProductsResult = { totalCount: ids.length, successCount: 0, failCount: 0 };

  ids.forEach((id) => {
    const linked = MOCK_MALL_LINKED_PRODUCT_DATA.find((item) => item.id === id);
    if (!linked || !isOwnerMatch(linked.ownerId, ownerId)) {
      result.failCount += 1;
      return;
    }

    let nextSetting: ShoppingSetting | undefined;
    if (shoppingSettingId) {
      const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === shoppingSettingId);
      if (!setting || !isOwnerMatch(setting.ownerId, ownerId) || !isApplicableSetting(linked, setting)) {
        result.failCount += 1;
        return;
      }
      nextSetting = setting;
    }

    // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 요청 본문·오리지널 설정과 공유되어 스냅샷 독립성이 깨진다.
    if (productSnapshot) {
      linked.productSnapshot = { ...linked.productSnapshot, ...structuredClone(productSnapshot) };
    }
    if (nextSetting) {
      linked.settingSnapshot = structuredClone(nextSetting);
      linked.sourceShoppingSettingId = nextSetting.id;
    }

    linked.updatedByEmail = updatedByEmail;
    linked.updatedAt = now;
    result.successCount += 1;
  });

  return result;
};
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test -- bulkUpdateMallLinkedProducts`
Expected: PASS — 10 tests passed

- [ ] **Step 6: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 기존 테스트 전부 통과

- [ ] **Step 7: 커밋** *(사용자가 요청한 경우에만 실행)*

```bash
git add src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts src/mocks/utils/bulkUpdateMallLinkedProducts.ts src/mocks/utils/bulkUpdateMallLinkedProducts.test.ts
git commit -m "feat: 연동상품 다건 부분수정 mock 로직을 추가한다"
```

---

### Task 3: MSW 핸들러와 클라이언트 API 배선

**Files:**
- Modify: `src/mocks/handlers/mallLinkedProducts.ts`
- Create: `src/features/mallLinkedProduct/api/bulkUpdateMallLinkedProducts.ts`
- Create: `src/features/mallLinkedProduct/api/useBulkUpdateMallLinkedProducts.ts`

**Interfaces:**
- Consumes: Task 2의 `bulkUpdateMockMallLinkedProducts`, `BulkUpdateMallLinkedProductsBody`, `BulkUpdateMallLinkedProductsResult`
- Produces:
  - `bulkUpdateMallLinkedProducts(body: BulkUpdateMallLinkedProductsBody): Promise<BulkUpdateMallLinkedProductsResult>`
  - `useBulkUpdateMallLinkedProducts()` — mutation 변수는 `{ ids, productSnapshot?, shoppingSettingId? }` (ownerId·updatedByEmail은 훅 내부에서 atom으로 채운다)

**테스트 없음.** fetch 래퍼와 React Query 훅은 프로젝트 관례상 테스트하지 않는다. 검증은 Step 4의 수동 확인으로 대신한다.

- [ ] **Step 1: MSW 핸들러 추가**

`src/mocks/handlers/mallLinkedProducts.ts`를 수정한다.

import에 추가:

```ts
import { BulkUpdateMallLinkedProductsBody } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { bulkUpdateMockMallLinkedProducts } from '../utils/bulkUpdateMallLinkedProducts';
```

핸들러는 **`http.get(.../:id)`보다 위에** 넣는다 (고정 경로가 동적 경로보다 먼저 등록되어야 한다 — `msw-rules.md`). `resend` 핸들러 바로 다음 자리가 맞다:

```ts
  // 고정 경로이므로 `/:id` 핸들러보다 먼저 등록해야 한다 (msw-rules.md 경로 충돌 규칙).
  http.patch(`${baseUrl}/api/shopping/linked-products/bulk`, async ({ request }) => {
    const body = (await request.json()) as BulkUpdateMallLinkedProductsBody;
    const result = bulkUpdateMockMallLinkedProducts(body);
    if (!result) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json(result);
  }),
```

- [ ] **Step 2: fetch 래퍼 작성**

`src/features/mallLinkedProduct/api/bulkUpdateMallLinkedProducts.ts`:

```ts
import { BulkUpdateMallLinkedProductsBody, BulkUpdateMallLinkedProductsResult } from '../types/mallLinkedProduct.types';

export const bulkUpdateMallLinkedProducts = async (
  body: BulkUpdateMallLinkedProductsBody,
): Promise<BulkUpdateMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 일괄수정 실패');
  }

  return response.json();
};
```

- [ ] **Step 3: React Query 훅 작성**

`src/features/mallLinkedProduct/api/useBulkUpdateMallLinkedProducts.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { emailAtom, workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { BulkUpdateMallLinkedProductsBody } from '../types/mallLinkedProduct.types';
import { MALL_LINKED_PRODUCTS_QUERY_KEY } from './useGetMallLinkedProducts';
import { MALL_LINKED_PRODUCT_QUERY_KEY } from './useGetMallLinkedProduct';
import { bulkUpdateMallLinkedProducts } from './bulkUpdateMallLinkedProducts';

/** ownerId·updatedByEmail은 호출부가 넘기지 않는다 — useUpdateMallLinkedProduct와 같은 방식. */
export type BulkUpdateVariables = Omit<BulkUpdateMallLinkedProductsBody, 'ownerId' | 'updatedByEmail'>;

export const useBulkUpdateMallLinkedProducts = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const email = useAtomValue(emailAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: BulkUpdateVariables) =>
      bulkUpdateMallLinkedProducts({ ownerId: workspaceOwnerId, updatedByEmail: email, ...variables }),
    onSuccess: () => {
      // 목록뿐 아니라 개별 상세 캐시도 오래된 스냅샷을 들고 있게 되므로 함께 무효화한다.
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY] });
    },
  });
};
```

- [ ] **Step 4: 타입 체크와 전체 테스트 통과 확인**

Run: `npm run lint && npm run test`
Expected: PASS — lint 에러 없음, 기존 테스트 전부 통과

- [ ] **Step 5: 커밋** *(사용자가 요청한 경우에만 실행)*

```bash
git add src/mocks/handlers/mallLinkedProducts.ts src/features/mallLinkedProduct/api/bulkUpdateMallLinkedProducts.ts src/features/mallLinkedProduct/api/useBulkUpdateMallLinkedProducts.ts
git commit -m "feat: 연동상품 일괄수정 MSW 핸들러와 클라이언트 API를 배선한다"
```

---

### Task 4: 액션 버튼 영역 (재전송 이동 + 진입 가드)

**Files:**
- Create: `src/features/mallLinkedProduct/ui/MallLinkedProductActionSection.tsx`
- Modify: `src/features/mallLinkedProduct/store/selection.store.ts`
- Modify: `src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx`
- Modify: `src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx`

**Interfaces:**
- Consumes: `selectedLinkedIdsAtom`, `useResendMallLinkedProducts`, `useGetMallLinkedProducts`
- Produces:
  - `isSettingApplyModalOpenAtom` — `atom<boolean>(false)`
  - `MallLinkedProductActionSection` — props 없음

**테스트 없음.** UI 컴포넌트는 프로젝트 관례상 테스트하지 않는다. 검증은 Step 5의 수동 확인으로 대신한다.

- [ ] **Step 1: 모달 open atom 추가**

`src/features/mallLinkedProduct/store/selection.store.ts`에 덧붙인다:

```ts
// 쇼핑몰 정보설정 적용 모달의 열림 상태. 선택한 건들에 대해 동작하므로 선택 store에 함께 둔다.
export const isSettingApplyModalOpenAtom = atom<boolean>(false);
```

- [ ] **Step 2: 액션 영역 컴포넌트 작성**

`src/features/mallLinkedProduct/ui/MallLinkedProductActionSection.tsx`:

```tsx
'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import {
  isSettingApplyModalOpenAtom,
  selectedLinkedIdsAtom,
} from '@/features/mallLinkedProduct/store/selection.store';
import { useResendMallLinkedProducts } from '@/features/mallLinkedProduct/api/useResendMallLinkedProducts';

type Props = {
  linkedProducts: MallLinkedProduct[];
};

const PRODUCT_BULK_EDIT_PATH = '/shopping/linked-products/bulk-edit/product';

export const MallLinkedProductActionSection = ({ linkedProducts }: Props) => {
  const router = useRouter();
  const [selectedLinkedIds, setSelectedLinkedIds] = useAtom(selectedLinkedIdsAtom);
  const setSettingModalOpen = useSetAtom(isSettingApplyModalOpenAtom);
  const { mutate: resend, isPending } = useResendMallLinkedProducts();
  const { showAlert } = useAlert();

  const selectedRecords = linkedProducts.filter((linked) => selectedLinkedIds.includes(linked.id));

  const handleResend = () => {
    if (selectedLinkedIds.length === 0) {
      showAlert({ message: '재전송할 연동 상품을 선택해주세요.', type: 'warning' });
      return;
    }

    resend(selectedLinkedIds, {
      onSuccess: ({ totalCount, successCount, failCount }) => {
        // 결과와 무관하게 선택을 비운다. 목록을 다시 불러오므로 처리된 행이 계속 체크돼 있으면 혼란스럽다.
        // 실패 건은 목록에 사유와 함께 남아 거기서 다시 조치한다.
        setSelectedLinkedIds([]);

        if (failCount === 0) {
          showAlert({ message: `${successCount}건이 쇼핑몰로 전송되었습니다.`, type: 'success' });
          return;
        }

        showAlert({
          message: `총 ${totalCount}건 중 ${successCount}건 전송 성공, ${failCount}건 실패했습니다.`,
          type: 'warning',
        });
      },
      onError: () => {
        setSelectedLinkedIds([]);
        showAlert({ message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
      },
    });
  };

  const handleProductBulkEdit = () => {
    if (selectedLinkedIds.length === 0) {
      showAlert({ message: '수정할 연동 상품을 선택해주세요.', type: 'warning' });
      return;
    }
    // 상품 값은 몰과 무관하므로 몰·계정이 섞여 있어도 그대로 진입한다.
    router.push(PRODUCT_BULK_EDIT_PATH);
  };

  const handleSettingBulkEdit = () => {
    if (selectedLinkedIds.length === 0) {
      showAlert({ message: '수정할 연동 상품을 선택해주세요.', type: 'warning' });
      return;
    }

    // 설정 값은 몰·계정에 종속된다 — 출고지는 계정 주소록에서 고른 값이고 몰 고유정보는 몰마다 필드가 다르다.
    // 섞인 채로 적용하면 어느 쪽 기준으로 그려야 할지 정해지지 않는다 (domain-design.md).
    const mallCodes = new Set(selectedRecords.map((linked) => linked.mallCode));
    const accountIds = new Set(selectedRecords.map((linked) => linked.settingSnapshot.mallAccountId));

    if (mallCodes.size > 1 || accountIds.size > 1) {
      showAlert({ message: '동일한 쇼핑몰·쇼핑몰계정만 선택해 주세요.', type: 'warning' });
      return;
    }

    setSettingModalOpen(true);
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="min-w-16 text-sm text-muted-foreground">
        선택 <span className="font-medium text-foreground">{selectedLinkedIds.length}</span>개
      </span>
      <Button size="sm" onClick={handleResend} disabled={isPending || selectedLinkedIds.length === 0}>
        선택 재전송{selectedLinkedIds.length > 0 ? ` (${selectedLinkedIds.length})` : ''}
      </Button>
      <Button variant="outline" size="sm" onClick={handleProductBulkEdit}>
        상품정보수정
      </Button>
      <Button variant="outline" size="sm" onClick={handleSettingBulkEdit}>
        쇼핑몰정보수정
      </Button>
    </div>
  );
};
```

- [ ] **Step 3: 테이블 섹션에서 재전송 제거**

`src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx`를 아래로 **전체 교체**한다. Props는 그대로 유지한다.

```tsx
'use client';

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

- [ ] **Step 4: 레이아웃에 삽입**

`src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx`에서 import를 추가하고,

```tsx
import { MallLinkedProductActionSection } from './MallLinkedProductActionSection';
```

`<MallLinkedProductSearchFilterSection />` 바로 아래에 삽입한다:

```tsx
      <MallLinkedProductSearchFilterSection />
      <MallLinkedProductActionSection linkedProducts={data?.linkedProducts ?? []} />
      {isError ? (
```

- [ ] **Step 5: 수동 확인**

Run: `npm run lint`
Expected: PASS

Run: `npm run dev` 후 `/shopping/linked-products` 접속
Expected:
- 검색필터 카드와 테이블 카드 사이에 `선택 0개 | 선택 재전송 | 상품정보수정 | 쇼핑몰정보수정` 한 줄이 보인다
- 테이블 카드 헤더에는 `전체 N건`만 남아 있다
- 아무것도 선택하지 않고 '상품정보수정'을 누르면 `'수정할 연동 상품을 선택해주세요.'` alert
- 서로 다른 몰의 행 2개를 체크하고 '쇼핑몰정보수정'을 누르면 `'동일한 쇼핑몰·쇼핑몰계정만 선택해 주세요.'` alert
- 같은 몰·같은 계정 행을 체크하고 '선택 재전송'을 누르면 기존과 동일하게 동작한다

- [ ] **Step 6: 커밋** *(사용자가 요청한 경우에만 실행)*

```bash
git add src/features/mallLinkedProduct/ui/MallLinkedProductActionSection.tsx src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx src/features/mallLinkedProduct/store/selection.store.ts
git commit -m "feat: 연동상품 목록에 액션 버튼 영역을 추가하고 재전송을 옮긴다"
```

---

### Task 5: 쇼핑몰 정보설정 적용 모달

**Files:**
- Create: `src/features/mallLinkedProduct/ui/components/ShoppingSettingApplyModal.tsx`
- Modify: `src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx`

**Interfaces:**
- Consumes: `isSettingApplyModalOpenAtom`·`selectedLinkedIdsAtom` (Task 4), `useBulkUpdateMallLinkedProducts` (Task 3), `useGetActiveShoppingSettings`
- Produces: `ShoppingSettingApplyModal` — props `{ linkedProducts: MallLinkedProduct[] }`

**테스트 없음.** UI 컴포넌트는 프로젝트 관례상 테스트하지 않는다. 검증은 Step 3의 수동 확인으로 대신한다.

- [ ] **Step 1: 활성 설정 조회 훅 위치 확인**

Run: `grep -rn "getActiveShoppingSettings\|useGetActiveShoppingSettings" src/features --include=*.ts --include=*.tsx`
Expected: `src/features/shoppingSetting/api/` 아래에 fetch 함수와 훅이 있다. 훅 이름과 인자 시그니처를 확인해 Step 2에서 그대로 쓴다. 훅이 없고 fetch 함수만 있으면 이 Task에서 `useQuery`로 직접 호출한다.

- [ ] **Step 2: 모달 컴포넌트 작성**

`src/features/mallLinkedProduct/ui/components/ShoppingSettingApplyModal.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAlert } from '@/hooks/useAlert';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getActiveShoppingSettings } from '@/features/shoppingSetting/api/getActiveShoppingSettings';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import {
  isSettingApplyModalOpenAtom,
  selectedLinkedIdsAtom,
} from '@/features/mallLinkedProduct/store/selection.store';
import { useBulkUpdateMallLinkedProducts } from '@/features/mallLinkedProduct/api/useBulkUpdateMallLinkedProducts';

type Props = {
  linkedProducts: MallLinkedProduct[];
};

export const ShoppingSettingApplyModal = ({ linkedProducts }: Props) => {
  const [isOpen, setIsOpen] = useAtom(isSettingApplyModalOpenAtom);
  const selectedLinkedIds = useAtomValue(selectedLinkedIdsAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const { mutate: bulkUpdate, isPending } = useBulkUpdateMallLinkedProducts();
  const { showAlert } = useAlert();
  const [selectedSettingId, setSelectedSettingId] = useState<string>('');

  const { data: activeSettings } = useQuery({
    queryKey: ['activeShoppingSettings', workspaceOwnerId],
    queryFn: () => getActiveShoppingSettings(workspaceOwnerId),
    enabled: !!workspaceOwnerId && isOpen,
  });

  const selectedRecords = linkedProducts.filter((linked) => selectedLinkedIds.includes(linked.id));
  const targetMallCode = selectedRecords[0]?.mallCode;
  const targetAccountId = selectedRecords[0]?.settingSnapshot.mallAccountId;

  // 다른 계정의 설정을 적용하면 mallAccountId·mallId가 바뀌어 불변 규칙을 깨고, 재전송이 다른 계정을 향한다.
  const applicableSettings = (activeSettings ?? []).filter(
    (setting) => setting.mallCode === targetMallCode && setting.mallAccountId === targetAccountId,
  );

  // 모달을 닫았다 다시 열면 이전 선택이 남아 있지 않게 한다.
  useEffect(() => {
    if (!isOpen) setSelectedSettingId('');
  }, [isOpen]);

  const handleApply = () => {
    bulkUpdate(
      { ids: selectedLinkedIds, shoppingSettingId: selectedSettingId },
      {
        onSuccess: ({ totalCount, successCount, failCount }) => {
          setIsOpen(false);

          // 선택은 유지한다 — 수정 직후 곧바로 '선택 재전송'을 누를 수 있어야 한다.
          if (failCount === 0) {
            showAlert({ message: `${successCount}건이 수정되었습니다.`, type: 'success' });
            return;
          }

          showAlert({
            message: `총 ${totalCount}건 중 ${successCount}건 수정, ${failCount}건 실패했습니다.`,
            type: 'warning',
          });
        },
        onError: () => {
          showAlert({ message: '수정 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm">쇼핑몰정보수정</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          선택한 {selectedLinkedIds.length}건에 적용할 쇼핑몰 정보설정을 선택하세요. 선택한 설정의 값으로 통째로
          교체됩니다.
        </p>

        {applicableSettings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            이 쇼핑몰계정에 사용 가능한 정보설정이 없습니다.
          </p>
        ) : (
          <RadioGroup value={selectedSettingId} onValueChange={setSelectedSettingId} className="space-y-2">
            {applicableSettings.map((setting) => (
              <div key={setting.id} className="flex items-center gap-2">
                <RadioGroupItem value={setting.id} id={`setting-${setting.id}`} />
                <Label htmlFor={`setting-${setting.id}`}>
                  {setting.nickname} · {setting.mallId}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button size="sm" onClick={handleApply} disabled={isPending || !selectedSettingId}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 3: 레이아웃에 모달 추가**

`src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx`에 import를 추가하고,

```tsx
import { ShoppingSettingApplyModal } from './components/ShoppingSettingApplyModal';
```

`</>` 직전에 넣는다:

```tsx
      <ShoppingSettingApplyModal linkedProducts={data?.linkedProducts ?? []} />
    </>
```

- [ ] **Step 4: 수동 확인**

Run: `npm run lint`
Expected: PASS

Run: `npm run dev` 후 `/shopping/linked-products` 접속
Expected:
- 같은 몰·같은 계정의 행 2개를 체크하고 '쇼핑몰정보수정' → 모달이 열리고 그 계정의 활성 설정만 목록에 나온다
- 설정을 고르지 않으면 '적용' 버튼이 비활성
- 설정을 고르고 '적용' → `'2건이 수정되었습니다.'` alert, 모달이 닫히고 목록의 **쇼핑몰정보설정 컬럼이 고른 별칭으로 바뀐다**
- **체크가 그대로 남아 있다**
- **최종연동일시와 연동상태가 바뀌지 않았다** (전송이 아니라 수정이므로)
- 검색필터의 정보설정 필터에서 새로 고른 설정을 선택하면 방금 수정한 건들이 조회된다 (`sourceShoppingSettingId` 갱신 확인)

- [ ] **Step 5: 커밋** *(사용자가 요청한 경우에만 실행)*

```bash
git add src/features/mallLinkedProduct/ui/components/ShoppingSettingApplyModal.tsx src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx
git commit -m "feat: 연동상품 쇼핑몰정보수정 모달을 추가한다"
```

---

### Task 6: 일괄수정 폼 래퍼와 필드 단위 섹션 6개

**Files:**
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/BulkEditFieldWrapper.tsx`
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/BulkEditSectionWrapper.tsx`
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkBasicInfoSection.tsx`
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkPriceQuantitySection.tsx`
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkBrandModelSection.tsx`
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkComplianceSection.tsx`
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkMainImageSection.tsx`
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkDetailInfoSection.tsx`

**Interfaces:**
- Consumes: `ProductBulkEditGroupKey`·`ProductBulkEditChecked` (Task 1), `Product`, 기존 상수 (`PRODUCT_STATUS` — `@/features/products/constant/status.constants`, `ORIGIN_COUNTRIES`·`TAX_TYPE_OPTIONS`·`ADULT_PRODUCT_OPTIONS` — `@/features/products/constant/compliance.constants`, `DELIVERY_TYPE_OPTION` — `@/shared/constant/delivery.constant`, `MOCK_CATEGORY_DATA` — `@/mocks/data/MockCategoryData`). **어느 것도 복제하지 않는다.**
- Produces:
  - `BulkEditContext` — `{ checked, toggle }`를 하위 섹션에 내려주는 React context
  - `useBulkEditChecked()` — context 소비 훅
  - `BulkEditFieldWrapper` — props `{ group, label, children }`. 체크박스 + 라벨을 그리고, 미체크면 `children`을 `pointer-events-none opacity-50`로 감싼다
  - `BulkEditSectionWrapper` — props `{ group, title, description, children }`. 카드 헤더에 체크박스 1개
  - 섹션 6개 — props 없음, 전부 `'use client'`

**테스트 없음.** UI 컴포넌트는 프로젝트 관례상 테스트하지 않는다. 검증은 Task 7 Step 5의 수동 확인에서 함께 한다.

**주의:** 각 섹션의 카드 마크업은 `ui-conventions.md`의 Card 패턴을 따른다 — `<Card className="overflow-hidden">` + `<CardHeader className="border-b border-border/50 px-6 py-4">` + accent 바(`<div className="h-4 w-[3px] rounded-full bg-primary" />`) + `<CardTitle className="text-sm">`. **폰트 크기와 색상은 기존 상품 폼 섹션과 동일하게 유지한다.**

- [ ] **Step 1: 체크 컨텍스트와 필드 래퍼 작성**

`src/features/mallLinkedProduct/ui/bulkEdit/product/BulkEditFieldWrapper.tsx`:

```tsx
'use client';

import { createContext, ReactNode, useContext } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  ProductBulkEditChecked,
  ProductBulkEditGroupKey,
} from '@/features/mallLinkedProduct/constant/productBulkEdit.constants';

type BulkEditContextValue = {
  checked: ProductBulkEditChecked;
  toggle: (group: ProductBulkEditGroupKey, next: boolean) => void;
};

const BulkEditContext = createContext<BulkEditContextValue | null>(null);

export const BulkEditProvider = ({ value, children }: { value: BulkEditContextValue; children: ReactNode }) => (
  <BulkEditContext.Provider value={value}>{children}</BulkEditContext.Provider>
);

export const useBulkEditChecked = (): BulkEditContextValue => {
  const context = useContext(BulkEditContext);
  if (!context) throw new Error('useBulkEditChecked는 BulkEditProvider 안에서만 쓸 수 있습니다.');
  return context;
};

type Props = {
  group: ProductBulkEditGroupKey;
  label: string;
  children: ReactNode;
};

/**
 * 필드 하나를 체크박스 + 라벨과 함께 감싼다.
 *
 * 체크 해제 시 입력을 지우지 않고 비활성화만 한다 — 체크를 껐다 켜는 사이에 입력값이 사라지면
 * 사용자가 다시 입력해야 한다.
 */
export const BulkEditFieldWrapper = ({ group, label, children }: Props) => {
  const { checked, toggle } = useBulkEditChecked();
  const isChecked = checked[group] === true;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`bulk-${group}`}
          checked={isChecked}
          onCheckedChange={(next: boolean) => toggle(group, next)}
        />
        <Label htmlFor={`bulk-${group}`}>{label}</Label>
      </div>
      <div className={isChecked ? undefined : 'pointer-events-none opacity-50'}>{children}</div>
    </div>
  );
};
```

- [ ] **Step 2: 섹션 래퍼 작성**

`src/features/mallLinkedProduct/ui/bulkEdit/product/BulkEditSectionWrapper.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ProductBulkEditGroupKey } from '@/features/mallLinkedProduct/constant/productBulkEdit.constants';
import { useBulkEditChecked } from './BulkEditFieldWrapper';

type Props = {
  group: ProductBulkEditGroupKey;
  title: string;
  description: string;
  children: ReactNode;
};

/**
 * 섹션 전체를 체크박스 하나로 켜고 끈다 (옵션·정보고시용).
 *
 * 이 두 섹션은 기존 상품 폼 컴포넌트를 그대로 재사용하므로 내부에 체크박스를 넣을 수 없다.
 * 대신 카드로 감싸 헤더에 체크박스를 두고, 미체크면 내부 조작을 막는다.
 */
export const BulkEditSectionWrapper = ({ group, title, description, children }: Props) => {
  const { checked, toggle } = useBulkEditChecked();
  const isChecked = checked[group] === true;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Checkbox
            id={`bulk-${group}`}
            checked={isChecked}
            onCheckedChange={(next: boolean) => toggle(group, next)}
          />
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">
              <Label htmlFor={`bulk-${group}`}>{title}</Label>
            </CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className={isChecked ? undefined : 'pointer-events-none opacity-50'}>{children}</div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 3: 기본정보 섹션 작성**

`src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkBasicInfoSection.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { X } from 'lucide-react';
import { Product } from '@/features/products/types/product.types';
import { MOCK_CATEGORY_DATA } from '@/mocks/data/MockCategoryData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkBasicInfoSection = () => {
  const [keywordInput, setKeywordInput] = useState<string>('');
  const { register, setValue, watch, control } = useFormContext<Product>();

  const keyWords = watch('keyWords') ?? [];

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keyWords.includes(keywordInput.trim())) {
      setValue('keyWords', [...keyWords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setValue(
      'keyWords',
      keyWords.filter((k) => k !== keyword),
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">기본 정보</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <BulkEditFieldWrapper group="customerCode" label="고객사 상품코드">
          <Input {...register('customerCode')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="name" label="상품명">
          <Input {...register('name')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="keyWords" label="상품 키워드">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="키워드를 입력하고 Enter를 누르세요."
              />
              <Button type="button" variant="outline" onClick={handleAddKeyword}>
                추가
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {keyWords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <button type="button" onClick={() => handleRemoveKeyword(keyword)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="categoryId" label="카테고리">
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="카테고리를 선택하세요." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_CATEGORY_DATA.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="state" label="판매상태">
          <Controller
            control={control}
            name="state"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="판매상태를 선택하세요." />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
```

**`FilterSelect`를 쓰지 않는 이유:** `FilterSelect`는 `label`이 필수 prop이고 내부에서 `<Label>`을 직접 그린다. `BulkEditFieldWrapper`가 이미 체크박스 옆에 라벨을 그리므로 라벨이 두 번 나온다. 그래서 `@/components/ui/select`의 원시 컴포넌트를 쓴다 — `ShoppingSettingActionSection`도 같은 이유로 원시 `Select`를 쓴다.

**옵션 상수는 재정의하지 않는다.** `MOCK_CATEGORY_DATA`(`@/mocks/data/MockCategoryData`)와 `PRODUCT_STATUS`(`@/features/products/constant/status.constants`) 모두 `{ id, name }[]` 형태이며 기존 상품 폼이 쓰는 것을 그대로 import한다.

- [ ] **Step 4: 가격·수량 섹션 작성**

`src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkPriceQuantitySection.tsx`:

```tsx
'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

// 빈 입력을 NaN이 아니라 undefined로 받는다 — valueAsNumber를 쓰면 "비었다"와 "0"을 구분할 수 없다.
const numberOptions = { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) };

export const BulkPriceQuantitySection = () => {
  const { register, control, watch, setValue } = useFormContext<Product>();

  // 원본(ProductPriceAndQuantityInfo)과 같은 조건. 무료/착불이면 배송비 입력이 의미가 없다.
  const deliveryType = watch('deliveryType');
  const isDeliveryPrice = deliveryType === 'NOT_FREE' || deliveryType === 'CONDITIONAL_FREE';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">가격 및 수량</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <BulkEditFieldWrapper group="netPrice" label="공급가">
          <Input type="number" placeholder="0" {...register('netPrice', numberOptions)} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="price" label="판매가">
          <Input type="number" placeholder="0" {...register('price', numberOptions)} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="totalQuantity" label="총수량">
          <Input type="number" placeholder="0" {...register('totalQuantity', numberOptions)} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="delivery" label="배송정책 · 배송비">
          <div className="space-y-2">
            <Controller
              control={control}
              name="deliveryType"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // 무료·착불로 바꾸면 이전에 입력한 배송비가 남아 함께 전송되므로 0으로 되돌린다 (원본과 동일).
                    if (value !== 'NOT_FREE' && value !== 'CONDITIONAL_FREE') setValue('deliveryPrice', 0);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="배송정책을 선택하세요." />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_TYPE_OPTION.map((option) => (
                      <SelectItem key={option.id} value={option.id ?? ''}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {isDeliveryPrice && (
              <div className="space-y-2">
                <Label htmlFor="bulk-deliveryPrice">배송비</Label>
                <Input
                  id="bulk-deliveryPrice"
                  type="number"
                  placeholder="0"
                  {...register('deliveryPrice', numberOptions)}
                />
              </div>
            )}
          </div>
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
```

`deliveryType`과 `deliveryPrice`를 한 체크박스로 묶은 이유가 여기 보인다 — 배송정책을 바꾸면 배송비 입력이 나타나거나 사라지고 값도 함께 조정되므로, 둘을 따로 체크할 수 있게 두면 반쪽만 바뀐 상태가 만들어진다.

- [ ] **Step 5: 브랜드·모델 섹션 작성**

`src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkBrandModelSection.tsx`:

```tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkBrandModelSection = () => {
  const { register } = useFormContext<Product>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">브랜드 및 모델</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <BulkEditFieldWrapper group="brand" label="브랜드">
          <Input placeholder="브랜드를 입력하세요." {...register('brand')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="manufacturer" label="제조업체">
          <Input placeholder="제조업체를 입력하세요." {...register('manufacturer')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="modelName" label="모델명">
          <Input placeholder="모델명을 입력하세요." {...register('modelName')} />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="modelId" label="모델번호">
          <Input placeholder="모델번호를 입력하세요." {...register('modelId')} />
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 6: 규정 정보 섹션 작성**

`src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkComplianceSection.tsx`:

```tsx
'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ADULT_PRODUCT_OPTIONS,
  ORIGIN_COUNTRIES,
  TAX_TYPE_OPTIONS,
} from '@/features/products/constant/compliance.constants';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkComplianceSection = () => {
  const { register, control, watch } = useFormContext<Product>();
  const originCountryCode = watch('originCountryCode');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">규정 정보</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <BulkEditFieldWrapper group="originCountry" label="원산지">
          <div className="space-y-2">
            <Controller
              control={control}
              name="originCountryCode"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="원산지를 선택하세요." />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGIN_COUNTRIES.map((option) => (
                      <SelectItem key={option.id} value={option.id ?? ''}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {originCountryCode === 'ETC' && (
              <Input placeholder="원산지를 입력하세요." {...register('originCountryEtc')} />
            )}
          </div>
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="taxType" label="부가세유형">
          <Controller
            control={control}
            name="taxType"
            render={({ field }) => (
              <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-4">
                {TAX_TYPE_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`bulk-taxType-${option.id}`} />
                    <Label htmlFor={`bulk-taxType-${option.id}`}>{option.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </BulkEditFieldWrapper>

        <BulkEditFieldWrapper group="adultProductType" label="성인상품여부">
          <Controller
            control={control}
            name="adultProductType"
            render={({ field }) => (
              <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-4">
                {ADULT_PRODUCT_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`bulk-adult-${option.id}`} />
                    <Label htmlFor={`bulk-adult-${option.id}`}>{option.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 7: 대표이미지·상세설명 섹션 작성**

두 섹션은 필드가 하나뿐이다. 각각 원본(`ProductMainImageInfo.tsx`, `ProductDetailInfo.tsx`)의 입력 UI를 그대로 옮기되 `required`를 떼고 `BulkEditFieldWrapper`로 감싼다.

`src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkDetailInfoSection.tsx`:

```tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkDetailInfoSection = () => {
  const { register } = useFormContext<Product>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">상품 상세설명</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <BulkEditFieldWrapper group="detailPage" label="상품상세설명">
          <Textarea rows={10} placeholder="상품상세설명을 입력하세요." {...register('detailPage')} />
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
```

`src/features/mallLinkedProduct/ui/bulkEdit/product/sections/BulkMainImageSection.tsx`:

```tsx
'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Upload, X } from 'lucide-react';
import { acceptImage } from '@/constant/accept.content';
import { Product } from '@/features/products/types/product.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkEditFieldWrapper } from '../BulkEditFieldWrapper';

export const BulkMainImageSection = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setValue } = useFormContext<Product>();

  // 원본(ProductMainImageInfo)과 같이 File 객체를 그대로 폼에 넣는다.
  // 드래그앤드롭은 넣지 않는다 — 일괄수정은 이미지 1개를 고르는 것이 전부라 파일 선택 버튼이면 충분하다.
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setValue('mainImage', file);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setValue('mainImage', '');
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">메인이미지</CardTitle>
            <CardDescription className="mt-0.5">일괄로 바꿀 항목만 체크하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <BulkEditFieldWrapper group="mainImage" label="대표이미지">
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">선택한 연동 상품 전부에 같은 이미지가 적용됩니다.</p>
              <input
                type="file"
                accept={acceptImage}
                onChange={handleImageUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <Button
                type="button"
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                파일 선택
              </Button>
            </div>

            {preview && (
              <div className="relative w-1/2">
                <img src={preview} alt="대표 이미지 미리보기" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemoveImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </BulkEditFieldWrapper>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 8: 타입 체크**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 9: 커밋** *(사용자가 요청한 경우에만 실행)*

```bash
git add src/features/mallLinkedProduct/ui/bulkEdit/
git commit -m "feat: 연동상품 일괄수정 폼의 체크박스 래퍼와 필드 단위 섹션을 추가한다"
```

---

### Task 7: 일괄수정 화면 조립과 라우트

**Files:**
- Create: `src/features/mallLinkedProduct/ui/bulkEdit/product/ProductBulkEditLayout.tsx`
- Create: `src/app/(authenticated)/shopping/linked-products/bulk-edit/product/page.tsx`

**Interfaces:**
- Consumes: Task 1(`buildProductBulkPatch`, `collectCheckedFieldNames`, `REQUIRED_BULK_EDIT_GROUPS`), Task 3(`useBulkUpdateMallLinkedProducts`), Task 6(`BulkEditProvider`, 섹션 6개, `BulkEditSectionWrapper`), 기존 `ProductOptionSection`·`ProductInformationDisclosureSection`
- Produces: `ProductBulkEditLayout` — props 없음

**테스트 없음.** UI 컴포넌트는 프로젝트 관례상 테스트하지 않는다. 검증은 Step 4의 수동 확인으로 대신한다.

- [ ] **Step 1: 레이아웃 작성**

`src/features/mallLinkedProduct/ui/bulkEdit/product/ProductBulkEditLayout.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { Product } from '@/features/products/types/product.types';
import { ProductOptionSection } from '@/features/products/ui/components/options/ProductOptionSection';
import { ProductInformationDisclosureSection } from '@/features/products/ui/components/productDisclosure/ProductInformationDisclosureSection';
import { selectedLinkedIdsAtom } from '@/features/mallLinkedProduct/store/selection.store';
import { useBulkUpdateMallLinkedProducts } from '@/features/mallLinkedProduct/api/useBulkUpdateMallLinkedProducts';
import {
  PRODUCT_BULK_EDIT_GROUPS,
  ProductBulkEditChecked,
  ProductBulkEditGroupKey,
  REQUIRED_BULK_EDIT_GROUPS,
} from '@/features/mallLinkedProduct/constant/productBulkEdit.constants';
import {
  buildProductBulkPatch,
  collectCheckedFieldNames,
} from '@/features/mallLinkedProduct/util/buildProductBulkPatch';
import { BulkEditProvider } from './BulkEditFieldWrapper';
import { BulkEditSectionWrapper } from './BulkEditSectionWrapper';
import { BulkBasicInfoSection } from './sections/BulkBasicInfoSection';
import { BulkPriceQuantitySection } from './sections/BulkPriceQuantitySection';
import { BulkBrandModelSection } from './sections/BulkBrandModelSection';
import { BulkComplianceSection } from './sections/BulkComplianceSection';
import { BulkMainImageSection } from './sections/BulkMainImageSection';
import { BulkDetailInfoSection } from './sections/BulkDetailInfoSection';

const LIST_PATH = '/shopping/linked-products';

export const ProductBulkEditLayout = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const selectedLinkedIds = useAtomValue(selectedLinkedIdsAtom);
  const { mutate: bulkUpdate, isPending } = useBulkUpdateMallLinkedProducts();

  // 값은 Product 그대로의 flat 폼으로 둔다 — 기존 옵션·정보고시 섹션이 이 구조를 전제로 만들어져 있다.
  const valuesForm = useForm<Product>();
  const [checked, setChecked] = useState<ProductBulkEditChecked>({});

  const goList = () => router.push(LIST_PATH);

  // 선택은 전역 Jotai에 있어 라우트 이동은 견디지만 새로고침에는 사라진다.
  useEffect(() => {
    if (selectedLinkedIds.length === 0) {
      showAlert({
        message: '선택 정보가 없습니다. 목록에서 다시 선택해 주세요.',
        type: 'warning',
        onConfirm: () => router.replace(LIST_PATH),
      });
    }
    // 진입 시 1회만 판정한다. 이후 선택이 바뀌는 경로는 이 화면에 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (group: ProductBulkEditGroupKey, next: boolean) =>
    setChecked((prev) => ({ ...prev, [group]: next }));

  const handleSubmit = async () => {
    const checkedFieldNames = collectCheckedFieldNames(checked);

    if (checkedFieldNames.length === 0) {
      showAlert({ message: '수정할 항목을 체크해주세요.', type: 'warning' });
      return;
    }

    // handleSubmit을 쓰지 않는다 — 재사용하는 정보고시 섹션에 required 규칙이 있어,
    // 전체 검증을 돌리면 체크하지 않은 정보고시 때문에 제출이 막힌다.
    if (!(await valuesForm.trigger(checkedFieldNames))) return;

    // 필수 필드가 undefined로 저장되면 목록·수정 화면이 곧바로 깨진다 (price.toLocaleString() 등).
    const values = valuesForm.getValues();
    const hasEmptyRequired = REQUIRED_BULK_EDIT_GROUPS.some(
      (group) =>
        checked[group] === true &&
        PRODUCT_BULK_EDIT_GROUPS[group].some((key) => values[key] === undefined || values[key] === ''),
    );
    if (hasEmptyRequired) {
      showAlert({ message: '체크한 필수 항목의 값을 입력해 주세요.', type: 'warning' });
      return;
    }

    bulkUpdate(
      { ids: selectedLinkedIds, productSnapshot: buildProductBulkPatch(values, checked) },
      {
        onSuccess: ({ totalCount, successCount, failCount }) => {
          // 선택은 유지한다 — 수정 직후 곧바로 '선택 재전송'을 누를 수 있어야 한다.
          if (failCount === 0) {
            showAlert({ message: `${successCount}건이 수정되었습니다.`, type: 'success', onConfirm: goList });
            return;
          }

          showAlert({
            message: `총 ${totalCount}건 중 ${successCount}건 수정, ${failCount}건 실패했습니다.`,
            type: 'warning',
            onConfirm: goList,
          });
        },
        onError: () => {
          showAlert({ message: '수정 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">상품정보 일괄수정</h1>
        <p className="text-muted-foreground">
          선택한 {selectedLinkedIds.length}건의 연동 상품 중, 체크한 항목만 입력한 값으로 바뀝니다.
        </p>
      </div>

      <BulkEditProvider value={{ checked, toggle }}>
        <FormProvider {...valuesForm}>
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <BulkBasicInfoSection />
              <BulkPriceQuantitySection />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <BulkBrandModelSection />
              <BulkComplianceSection />
            </div>

            {/* 옵션·정보고시는 기존 상품 폼 컴포넌트를 그대로 재사용하고 체크박스 카드로만 감싼다. */}
            <BulkEditSectionWrapper
              group="option"
              title="옵션"
              description="체크하면 선택한 연동 상품의 옵션 조합이 아래 값으로 통째 교체됩니다."
            >
              <ProductOptionSection />
            </BulkEditSectionWrapper>

            <div className="grid gap-6 lg:grid-cols-2">
              <BulkMainImageSection />
              <BulkDetailInfoSection />
            </div>

            <BulkEditSectionWrapper
              group="informationDisclosure"
              title="상품정보고시"
              description="체크하면 선택한 연동 상품의 고시 카테고리와 항목이 아래 값으로 통째 교체됩니다."
            >
              <ProductInformationDisclosureSection />
            </BulkEditSectionWrapper>
          </div>
        </FormProvider>
      </BulkEditProvider>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={goList} disabled={isPending}>
          취소
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          수정
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 라우트 페이지 작성**

`src/app/(authenticated)/shopping/linked-products/bulk-edit/product/page.tsx`:

```tsx
import { ProductBulkEditLayout } from '@/features/mallLinkedProduct/ui/bulkEdit/product/ProductBulkEditLayout';

export default function ProductBulkEditPage() {
  return <ProductBulkEditLayout />;
}
```

- [ ] **Step 3: 타입 체크와 전체 테스트**

Run: `npm run lint && npm run test`
Expected: PASS

- [ ] **Step 4: 수동 확인**

Run: `npm run dev` 후 `/shopping/linked-products` 접속
Expected:
- 행 2개를 체크하고 '상품정보수정' → `/shopping/linked-products/bulk-edit/product`로 이동, 헤더에 `선택한 2건의 연동 상품 중...` 문구
- 모든 입력이 비어 있고 흐리게(비활성) 보인다
- 아무것도 체크하지 않고 '수정' → `'수정할 항목을 체크해주세요.'` alert
- '상품명'만 체크하고 비워둔 채 '수정' → `'체크한 필수 항목의 값을 입력해 주세요.'` alert
- '상품명'을 체크하고 값을 입력한 뒤 '수정' → `'2건이 수정되었습니다.'` alert, 목록으로 복귀
- 목록에서 **그 2건의 상품명만 바뀌고 판매가·연동상태·최종연동일시는 그대로**다
- **체크가 그대로 남아 있다**
- 그 상태에서 브라우저 새로고침(F5) → `'선택 정보가 없습니다...'` alert 후 목록으로 이동
- 옵션 섹션 체크 후 옵션을 확정하고 '수정' → 선택한 건들의 옵션이 모두 그 조합으로 바뀐다
- 정보고시를 체크하지 않고 다른 항목만 수정해도 제출이 막히지 않는다

- [ ] **Step 5: 커밋** *(사용자가 요청한 경우에만 실행)*

```bash
git add src/features/mallLinkedProduct/ui/bulkEdit/product/ProductBulkEditLayout.tsx "src/app/(authenticated)/shopping/linked-products/bulk-edit"
git commit -m "feat: 연동상품 상품정보 일괄수정 화면을 추가한다"
```

---

## 완료 후

1. `superpowers:requesting-code-review`로 코드 리뷰 — Critical은 즉시, Important는 다음 단계 전 수정
2. `/ce-compound`로 비자명한 결정을 `docs/solutions/`에 문서화 제안. 후보:
   - 일괄수정 폼에서 `handleSubmit` 대신 `trigger(checkedFieldNames)`를 쓰는 이유 (재사용 섹션의 `required`와 부분 수정의 충돌)
   - patch에서 미체크 키를 `undefined`가 아니라 **키 부재**로 표현해야 하는 이유 (얕은 병합에서 값이 지워짐)
   - 설정 교체를 클라이언트 스냅샷 조립이 아니라 서버 원본 복사로 처리한 이유 (생성 흐름과 같은 책임 분담)
3. `superpowers:finishing-a-development-branch`로 브랜치 마무리

## 오픈 이슈 (구현 중 판단이 필요할 수 있는 것)

- **`mainImage`(`string | File`)와 `structuredClone`.** `bulkUpdateMockMallLinkedProducts`가 patch를 `structuredClone`하는데, `File`은 구조화 복제 알고리즘이 지원하는 타입이라 통과할 것으로 본다. Task 7의 수동 확인에서 대표이미지를 체크해 수정했을 때 `DataCloneError`가 나는지 확인하고, 나면 patch를 복제하기 전에 `mainImage`만 따로 꺼내 얕게 넘기는 예외를 둔다.
  - 참고: 이 프로젝트는 개발환경에서 MSW가 메모리 배열을 다루므로 File을 그대로 보관해도 동작한다. 실 API 연동 시에는 업로드 후 URL 문자열로 바뀌므로 이 문제가 사라진다 — 저장소 논의는 별개 항목으로 보류 중이다.
- **`ORIGIN_COUNTRIES`·`TAX_TYPE_OPTIONS`·`ADULT_PRODUCT_OPTIONS`의 형태.** `FilterOption`(`{ id?: string; name: string }`)으로 가정하고 `option.id ?? ''`를 썼다. `id`가 non-optional이면 `?? ''`를 제거한다.
