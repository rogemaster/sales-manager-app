# 쇼핑몰 상품등록 액션 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상품을 여러 몰(ShoppingSetting)에 등록(전송)하는 신규 화면(`/shopping/register`)을 구현한다.

**Architecture:** 신규 feature 모듈 `src/features/mallRegistration/`을 만들고, 기존 상품 목록(`getProducts`)과 검색 필터(`ProductSearchFilterSection`)를 재사용한다. 등록 대상 선택은 화면 전용 plain Jotai atom(스코프 Provider 없음)으로 스테이징하고, 사용자가 명시적으로 "쇼핑몰 전송"을 눌러야 신규 bulk API로 `Product.registeredMalls`에 반영된다.

**Tech Stack:** Next.js 15 App Router, Jotai, TanStack Query, MSW, Vitest, shadcn/ui(Dialog/RadioGroup/Checkbox/Badge)

## Global Constraints

- Prettier: `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`
- MSW 규칙(`msw-rules.md`): `src/app/api/.../route.ts` 신규 생성 금지 — `src/mocks/handlers/*.ts`에 핸들러 추가, 로직은 `src/mocks/utils/`로 위임
- 고정 경로 핸들러는 동적 경로(`/:id`)보다 먼저 등록
- 필터/검색 조건을 body로 전달하는 조회는 `POST` 사용
- Atoms naming: `[name]Atom`
- API 함수: verb-first (`getX`, `createX`, `registerX`)
- 테스트 커버리지는 `src/mocks/utils/`에만 적용 — UI 컴포넌트/API fetch wrapper/Jotai atom은 테스트 파일 없이 진행하고 `npx tsc --noEmit`로 타입 검증
- **커밋은 자동 실행하지 않는다** — 각 Task의 커밋 스텝은 안내이며, 사용자가 명시적으로 요청한 시점에만 실제 git 명령을 실행한다 (CLAUDE.md Git/PR 규칙)

---

## Task 1: `Product` 타입에 `registeredMalls` 추가

**Files:**
- Modify: `src/features/products/types/product.types.ts`

**Interfaces:**
- Produces: `MallRegistration { id: string; mallCode: ShoppingMalls; shoppingSettingId: string; registeredAt: string }`, `Product.registeredMalls?: MallRegistration[]`

- [x] **Step 1: 타입 추가**

`src/features/products/types/product.types.ts` 최상단에 import 추가:

```ts
import { ShoppingMalls } from '@/types/common.type';
```

`export type AdultProductType = ...` 아래, `export interface Product` 위에 추가:

```ts
export interface MallRegistration {
  id: string;
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  registeredAt: string;
}
```

`Product` 인터페이스 마지막(`adultProductType?: AdultProductType;` 다음 줄)에 추가:

```ts
  registeredMalls?: MallRegistration[];
```

- [x] **Step 2: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (기존 코드가 `Product`를 spread/생성하는 곳은 모두 optional 필드라 영향 없음)

- [ ] **Step 3: Commit (안내 — 사용자 요청 시에만 실행)**

```bash
git add src/features/products/types/product.types.ts
git commit -m "feat: Product에 registeredMalls 타입 추가"
```

---

## Task 2: 활성 ShoppingSetting 조회 API

**Files:**
- Create: `src/features/mallRegistration/types/mallRegistration.types.ts`
- Create: `src/mocks/utils/getActiveShoppingSettings.ts`
- Test: `src/mocks/utils/getActiveShoppingSettings.test.ts`
- Modify: `src/mocks/handlers/shoppingSettings.ts`
- Create: `src/features/mallRegistration/api/getActiveShoppingSettings.ts`
- Create: `src/features/mallRegistration/api/useGetActiveShoppingSettings.ts`

**Interfaces:**
- Produces: `ActiveShoppingSettingOption { id: string; mallCode: ShoppingMalls; mallId: string; nickname: string }`, `getMockActiveShoppingSettings(ownerId: string): ActiveShoppingSettingOption[]`, `useGetActiveShoppingSettings(): UseQueryResult<ActiveShoppingSettingOption[]>`

**최종 전체 브랜치 리뷰 보완:** 전 Task 완료 후 최종 리뷰에서 스펙("스마트스토어 - 기본설정 ✕" 형태로 몰이름+설정별칭을 함께 배지에 표시)과의 이탈이 Important finding으로 발견됨 — `StagedRegistration`에 `nickname` 필드가 없어 배지가 몰이름만 표시했고, 같은 몰의 서로 다른 설정 2개를 스테이징하면 배지가 시각적으로 구분 불가능했음. 사용자 승인 후 `StagedRegistration`에 `nickname: string`을 추가(아래 코드는 반영된 최종본)하고, Task 5(모달)/Task 6(테이블)/Task 7(전송)도 함께 수정.

- [x] **Step 1: 타입 파일 작성**

`src/features/mallRegistration/types/mallRegistration.types.ts`:

```ts
import { ShoppingMalls } from '@/types/common.type';

export interface ActiveShoppingSettingOption {
  id: string;
  mallCode: ShoppingMalls;
  mallId: string;
  nickname: string;
}

export interface StagedRegistration {
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  nickname: string;
}

export interface MallRegistrationRequestItem {
  productId: string;
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
}
```

- [x] **Step 2: 실패하는 테스트 작성**

`src/mocks/utils/getActiveShoppingSettings.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => {
  const makeSetting = (overrides: Partial<ShoppingSetting>): ShoppingSetting =>
    ({
      id: 'ss_001',
      mallAccountId: 'sa_001',
      mallCode: 'COUP',
      mallId: 'coupang_seller_001',
      nickname: '기본 설정',
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2025-05-01',
      updatedAt: '2025-05-01',
      ...overrides,
    }) as ShoppingSetting;

  return {
    SETTINGS: [
      makeSetting({ id: 'ss_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡 메인' }),
      makeSetting({ id: 'ss_002', mallCode: 'NSST', mallId: 'coupang_seller_001', nickname: '네이버 기본' }),
      makeSetting({ id: 'ss_003', mallCode: 'GMK', mallId: 'coupang_seller_001', nickname: '지마켓 비활성', isActive: false }),
      makeSetting({ id: 'ss_004', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '다른 사용자', ownerId: 'usr_005' }),
    ],
  };
});

vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));

import { getMockActiveShoppingSettings } from './getActiveShoppingSettings';

describe('getMockActiveShoppingSettings', () => {
  it('ownerId가 일치하는 활성 설정만 반환한다', () => {
    const result = getMockActiveShoppingSettings('usr_001');
    expect(result.map((r) => r.id)).toEqual(['ss_001', 'ss_002']);
  });

  it('isActive가 false인 설정은 제외한다', () => {
    const result = getMockActiveShoppingSettings('usr_001');
    expect(result.find((r) => r.id === 'ss_003')).toBeUndefined();
  });

  it('다른 owner의 설정은 제외한다', () => {
    const result = getMockActiveShoppingSettings('usr_001');
    expect(result.find((r) => r.id === 'ss_004')).toBeUndefined();
  });

  it('필요한 필드만 매핑해 반환한다', () => {
    const result = getMockActiveShoppingSettings('usr_001');
    expect(result[0]).toEqual({ id: 'ss_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡 메인' });
  });
});
```

- [x] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/mocks/utils/getActiveShoppingSettings.test.ts`
Expected: FAIL — `Cannot find module './getActiveShoppingSettings'`

- [x] **Step 4: 최소 구현**

`src/mocks/utils/getActiveShoppingSettings.ts`:

```ts
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ActiveShoppingSettingOption } from '@/features/mallRegistration/types/mallRegistration.types';

export const getMockActiveShoppingSettings = (ownerId: string): ActiveShoppingSettingOption[] => {
  return MOCK_SHOPPING_SETTINGS_DATA.filter((setting) => setting.ownerId === ownerId && setting.isActive).map(
    ({ id, mallCode, mallId, nickname }) => ({ id, mallCode, mallId, nickname }),
  );
};
```

- [x] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/mocks/utils/getActiveShoppingSettings.test.ts`
Expected: PASS (4 tests)

- [x] **Step 6: MSW 핸들러 추가**

`src/mocks/handlers/shoppingSettings.ts` 상단 import에 추가:

```ts
import { getMockActiveShoppingSettings } from '../utils/getActiveShoppingSettings';
```

`http.post(\`${baseUrl}/api/shopping/settings/available-accounts\`, ...)` 블록 바로 다음(고정 경로 구간, `/:id` 이전)에 추가:

```ts
  http.post(`${baseUrl}/api/shopping/settings/active`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    return HttpResponse.json(getMockActiveShoppingSettings(ownerId));
  }),
```

- [x] **Step 7: 클라이언트 API 함수 작성**

`src/features/mallRegistration/api/getActiveShoppingSettings.ts`:

```ts
import { ActiveShoppingSettingOption } from '../types/mallRegistration.types';

export const getActiveShoppingSettings = async (ownerId: string): Promise<ActiveShoppingSettingOption[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!response.ok) throw new Error('활성 쇼핑몰 설정 조회 실패');
  return response.json();
};
```

- [x] **Step 8: React Query 훅 작성**

`src/features/mallRegistration/api/useGetActiveShoppingSettings.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getActiveShoppingSettings } from './getActiveShoppingSettings';

export const ACTIVE_SHOPPING_SETTINGS_QUERY_KEY = 'activeShoppingSettings';

export const useGetActiveShoppingSettings = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [ACTIVE_SHOPPING_SETTINGS_QUERY_KEY, workspaceOwnerId],
    queryFn: () => getActiveShoppingSettings(workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });
};
```

- [x] **Step 9: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 10: Commit (안내 — 사용자 요청 시에만 실행)**

```bash
git add src/features/mallRegistration/types/mallRegistration.types.ts src/mocks/utils/getActiveShoppingSettings.ts src/mocks/utils/getActiveShoppingSettings.test.ts src/mocks/handlers/shoppingSettings.ts src/features/mallRegistration/api/getActiveShoppingSettings.ts src/features/mallRegistration/api/useGetActiveShoppingSettings.ts
git commit -m "feat: 활성 쇼핑몰 설정 조회 API 추가"
```

---

## Task 3: 몰 등록 전송(bulk) API

**Files:**
- Create: `src/mocks/utils/registerProductsToMalls.ts`
- Test: `src/mocks/utils/registerProductsToMalls.test.ts`
- Modify: `src/mocks/handlers/products.ts`
- Create: `src/features/mallRegistration/api/registerProductsToMalls.ts`
- Create: `src/features/mallRegistration/api/useRegisterProductsToMalls.ts`

**Interfaces:**
- Consumes: `MallRegistrationRequestItem`(Task 2), `Product.registeredMalls`(Task 1)
- Produces: `registerMockProductsToMalls(items: MallRegistrationRequestItem[]): number`, `registerProductsToMalls(ownerId, items): Promise<{ success: boolean; count: number }>`, `useRegisterProductsToMalls()`

**보안 주의 (2단계 수정):** Task 3 최초 리뷰에서 ownerId 검증 누락(다른 사용자의 상품도 수정 가능)이 Important finding으로 발견되어, 처음엔 `registerMockProductsToMalls`에 `ownerId`를 넘겨 소유하지 않은 항목을 조용히 건너뛰는(skip) 방식으로 수정했다. 그런데 최종 전체 브랜치 리뷰 준비 중 기존 문서(`docs/solutions/architecture-patterns/single-item-ownership-header-pattern.md`)를 확인한 결과, 이 프로젝트는 **2026-07-16에 이미 "필터링-후-진행" 방식을 fail-closed로 뒤집은 전례**가 있었다는 게 드러났다 — 여러 id를 받는 bulk 액션은 하나라도 소유하지 않은 게 섞이면 **전체를 403으로 거부**하는 게 확립된 컨벤션이다(`allOwnedBy`/`triggerOrderCollectionMock` 패턴). 소유 여부가 섞여 들어왔다는 것 자체가 이미 비정상 신호라는 게 근거다. 그래서 skip 방식을 되돌리고, **핸들러 레벨에서 사전 소유권 검증 → 불일치 시 403 전체 거부 → 통과 시에만 이미 검증된 `items`를 순수 함수에 전달**하는 방식으로 재수정했다(`triggerOrderCollectionMock`과 동일한 형태 — `registerMockProductsToMalls`는 ownerId를 모르는 순수 함수로 되돌아간다). `Product`는 식별자 필드명이 `id`가 아니라 `productId`라 기존 `allOwnedBy`(제네릭이 `.id`를 요구)를 그대로 재사용할 수 없어, `isOwnerMatch`를 핸들러에서 직접 순회 호출하는 인라인 체크로 작성한다(`findOwnedOrder`가 `orderNumber` 필드 때문에 커스텀 헬퍼를 썼던 것과 동일한 이유). 아래 코드는 이 재수정이 반영된 최종본이다.

- [x] **Step 1: 실패하는 테스트 작성**

`src/mocks/utils/registerProductsToMalls.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';

const { PRODUCTS } = vi.hoisted(() => {
  const makeProduct = (overrides: Partial<Product>): Product =>
    ({
      productId: 'p_001',
      name: '상품A',
      categoryId: 'c00001',
      price: 10000,
      state: 'ON_SALE',
      deliveryType: 'FREE',
      deliveryPrice: 0,
      mainImage: '',
      detailPage: '',
      totalQuantity: 10,
      createDate: new Date('2025-01-01'),
      updateDate: new Date('2025-01-01'),
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      ownerId: 'usr_001',
      ...overrides,
    }) as Product;

  return {
    PRODUCTS: [makeProduct({ productId: 'p_001' }), makeProduct({ productId: 'p_002' })],
  };
});

vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));

import { registerMockProductsToMalls } from './registerProductsToMalls';

describe('registerMockProductsToMalls', () => {
  it('해당 상품의 registeredMalls에 항목을 추가하고 처리 건수를 반환한다', () => {
    const count = registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_003' }]);
    expect(count).toBe(1);
    expect(PRODUCTS[0].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[0].registeredMalls?.[0]).toMatchObject({ mallCode: 'NSST', shoppingSettingId: 'ss_003' });
  });

  it('같은 상품에 같은 몰-설정 조합을 여러 번 등록해도 각각 별도 이력으로 누적된다', () => {
    registerMockProductsToMalls([{ productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);
    registerMockProductsToMalls([{ productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);
    expect(PRODUCTS[1].registeredMalls).toHaveLength(2);
  });

  it('존재하지 않는 productId는 건너뛰고 건수에 포함하지 않는다', () => {
    const count = registerMockProductsToMalls([{ productId: 'nope', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);
    expect(count).toBe(0);
  });
});
```

**참고:** 소유권 검증(ownerId)은 이제 이 함수가 아니라 핸들러 레벨에서 fail-closed로 수행되므로(아래 Step 5), 이 테스트 파일은 순수 append/누적/skip-if-not-found 로직만 검증한다. 소유권 fail-closed 검증 자체는 `src/mocks/handlers/products.ts`의 핸들러 로직이며, 이 프로젝트 컨벤션상 핸들러 자체는 별도 테스트 파일 대상이 아니다(mocks/utils만 테스트 커버리지 대상).

- [x] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/mocks/utils/registerProductsToMalls.test.ts`
Expected: FAIL — `Cannot find module './registerProductsToMalls'`

- [x] **Step 3: 최소 구현**

`src/mocks/utils/registerProductsToMalls.ts`:

```ts
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';

export const registerMockProductsToMalls = (items: MallRegistrationRequestItem[]): number => {
  const now = new Date().toISOString();
  let count = 0;

  items.forEach((item, index) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    if (!product) return;
    if (!product.registeredMalls) product.registeredMalls = [];
    product.registeredMalls.push({
      id: `mr_${Date.now()}_${index}`,
      mallCode: item.mallCode,
      shoppingSettingId: item.shoppingSettingId,
      registeredAt: now,
    });
    count += 1;
  });

  return count;
};
```

- [x] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/mocks/utils/registerProductsToMalls.test.ts`
Expected: PASS (3 tests)

- [x] **Step 5: MSW 핸들러 추가**

`src/mocks/handlers/products.ts` 상단 import에 추가 (`isOwnerMatch`는 이미 이 파일에 import돼 있으므로 그대로 재사용):

```ts
import { registerMockProductsToMalls } from '../utils/registerProductsToMalls';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';
```

`bulk` 핸들러 다음(배열 마지막)에 추가 — fail-closed: 요청에 포함된 productId 중 하나라도 소유하지 않으면 전체 요청을 403으로 거부한다(`allOwnedBy`는 `.id` 필드를 요구하는데 `Product`는 `productId`라 그대로 못 쓰므로, 동일한 검증을 인라인으로 작성):

```ts
  http.post(`${baseUrl}/api/products/mall-registration`, async ({ request }) => {
    await delay(500);
    const { ownerId, items } = (await request.json()) as { ownerId: string; items: MallRegistrationRequestItem[] };
    const productIds = [...new Set(items.map((item) => item.productId))];
    const allOwned = productIds.every((id) => {
      const product = MOCK_PRODUCT_DATA.find((p) => p.productId === id);
      return !!product && isOwnerMatch(product.ownerId, ownerId);
    });
    if (!allOwned) {
      return new HttpResponse(null, { status: 403 });
    }
    const count = registerMockProductsToMalls(items);
    return HttpResponse.json({ success: true, count });
  }),
```

(참고: `delay(500)`은 excel.md에 문서화된 AlertProvider race condition 방지 컨벤션과 동일한 이유로 적용)

- [x] **Step 6: 클라이언트 API 함수 작성**

`src/features/mallRegistration/api/registerProductsToMalls.ts`:

```ts
import { MallRegistrationRequestItem } from '../types/mallRegistration.types';

export interface RegisterProductsToMallsResponse {
  success: boolean;
  count: number;
}

export const registerProductsToMalls = async (
  ownerId: string,
  items: MallRegistrationRequestItem[],
): Promise<RegisterProductsToMallsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/mall-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, items }),
  });
  if (!response.ok) throw new Error('쇼핑몰 등록 전송 실패');
  return response.json();
};
```

- [x] **Step 7: React Query mutation 훅 작성**

`src/features/mallRegistration/api/useRegisterProductsToMalls.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { registerProductsToMalls } from './registerProductsToMalls';
import { MallRegistrationRequestItem } from '../types/mallRegistration.types';

export const useRegisterProductsToMalls = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (items: MallRegistrationRequestItem[]) => registerProductsToMalls(workspaceOwnerId, items),
  });
};
```

- [x] **Step 8: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 9: Commit (안내 — 사용자 요청 시에만 실행)**

```bash
git add src/mocks/utils/registerProductsToMalls.ts src/mocks/utils/registerProductsToMalls.test.ts src/mocks/handlers/products.ts src/features/mallRegistration/api/registerProductsToMalls.ts src/features/mallRegistration/api/useRegisterProductsToMalls.ts
git commit -m "feat: 몰 등록 전송 bulk API 추가"
```

---

## Task 4: 스테이징 상태 스토어 (Jotai)

**Files:**
- Create: `src/features/mallRegistration/store/mallRegistration.store.ts`

**Interfaces:**
- Consumes: `StagedRegistration`(Task 2)
- Produces: `selectedProductIdsAtom`, `isRegisterModalOpenAtom`, `stagedRegistrationsAtom`, `stagedCountAtom`, `addStagedRegistrationsAtom`, `removeStagedRegistrationAtom`, `resetMallRegistrationStateAtom`

- [x] **Step 1: 스토어 작성**

`src/features/mallRegistration/store/mallRegistration.store.ts`:

```ts
import { atom } from 'jotai';
import { StagedRegistration } from '../types/mallRegistration.types';

export const selectedProductIdsAtom = atom<string[]>([]);
export const isRegisterModalOpenAtom = atom<boolean>(false);

// productId -> 스테이징된 (몰, 설정) 조합 목록. 서버에 저장되지 않는 화면 임시 상태.
export const stagedRegistrationsAtom = atom<Record<string, StagedRegistration[]>>({});

export const stagedCountAtom = atom((get) =>
  Object.values(get(stagedRegistrationsAtom)).reduce((sum, list) => sum + list.length, 0),
);

// 모달 완료 시 선택된 상품 전체에 스테이징 항목을 append. 동일 (몰,설정) 조합 중복 추가는 무시한다.
export const addStagedRegistrationsAtom = atom(
  null,
  (get, set, params: { productIds: string[]; registrations: StagedRegistration[] }) => {
    const current = get(stagedRegistrationsAtom);
    const next = { ...current };

    params.productIds.forEach((productId) => {
      const existing = next[productId] ?? [];
      const merged = [...existing];
      params.registrations.forEach((reg) => {
        const isDuplicate = merged.some(
          (item) => item.mallCode === reg.mallCode && item.shoppingSettingId === reg.shoppingSettingId,
        );
        if (!isDuplicate) merged.push(reg);
      });
      next[productId] = merged;
    });

    set(stagedRegistrationsAtom, next);
  },
);

// 배지 개별 취소 (전송 전)
export const removeStagedRegistrationAtom = atom(
  null,
  (get, set, params: { productId: string; mallCode: string; shoppingSettingId: string }) => {
    const current = get(stagedRegistrationsAtom);
    const list = current[params.productId] ?? [];
    const filtered = list.filter(
      (item) => !(item.mallCode === params.mallCode && item.shoppingSettingId === params.shoppingSettingId),
    );
    set(stagedRegistrationsAtom, { ...current, [params.productId]: filtered });
  },
);

export const resetMallRegistrationStateAtom = atom(null, (_, set) => {
  set(stagedRegistrationsAtom, {});
  set(selectedProductIdsAtom, []);
  set(isRegisterModalOpenAtom, false);
});
```

- [x] **Step 2: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit (안내 — 사용자 요청 시에만 실행)**

```bash
git add src/features/mallRegistration/store/mallRegistration.store.ts
git commit -m "feat: 쇼핑몰 등록 스테이징 상태 스토어 추가"
```

---

## Task 5: `MallSelectModal` 컴포넌트

**Files:**
- Create: `src/features/mallRegistration/ui/components/MallSelectModal.tsx`

**Interfaces:**
- Consumes: `useGetActiveShoppingSettings()`(Task 2), `isRegisterModalOpenAtom`/`selectedProductIdsAtom`/`addStagedRegistrationsAtom`(Task 4)

**스펙 보완:** Task 5 최초 리뷰에서 스펙(`등록 플로우` 5단계: "완료 클릭 → 모달 닫힘 → `selectedProductIdsAtom` 초기화")과의 누락이 Important finding으로 발견되어 사용자 승인 후 즉시 반영됨 — 아래 코드는 수정 반영된 최종본이다. **완료(`handleComplete`) 시에만** `selectedProductIdsAtom`을 초기화하고, **취소(`handleClose`)는 기존 선택을 그대로 유지**한다 (취소는 사용자의 실수일 수 있으므로 선택을 잃지 않도록).

- [x] **Step 1: 컴포넌트 작성**

`src/features/mallRegistration/ui/components/MallSelectModal.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { ShoppingMalls } from '@/types/common.type';
import { useGetActiveShoppingSettings } from '@/features/mallRegistration/api/useGetActiveShoppingSettings';
import {
  isRegisterModalOpenAtom,
  selectedProductIdsAtom,
  addStagedRegistrationsAtom,
} from '@/features/mallRegistration/store/mallRegistration.store';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const MallSelectModal = () => {
  const [open, setOpen] = useAtom(isRegisterModalOpenAtom);
  const [selectedProductIds, setSelectedProductIds] = useAtom(selectedProductIdsAtom);
  const addStagedRegistrations = useSetAtom(addStagedRegistrationsAtom);
  const { data: options = [] } = useGetActiveShoppingSettings();

  const [selectedMalls, setSelectedMalls] = useState<ShoppingMalls[]>([]);
  const [settingByMall, setSettingByMall] = useState<Record<string, string>>({});

  const mallGroups = useMemo(() => {
    const groups: Record<string, typeof options> = {};
    options.forEach((option) => {
      if (!groups[option.mallCode]) groups[option.mallCode] = [];
      groups[option.mallCode].push(option);
    });
    return groups;
  }, [options]);

  const availableMallCodes = Object.keys(mallGroups) as ShoppingMalls[];

  const handleToggleMall = (mallCode: ShoppingMalls, checked: boolean) => {
    setSelectedMalls((prev) => (checked ? [...prev, mallCode] : prev.filter((code) => code !== mallCode)));
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedMalls([]);
    setSettingByMall({});
  };

  const handleComplete = () => {
    const registrations = selectedMalls
      .filter((mallCode) => !!settingByMall[mallCode])
      .map((mallCode) => {
        const settingId = settingByMall[mallCode];
        const setting = mallGroups[mallCode]?.find((option) => option.id === settingId);
        return { mallCode, shoppingSettingId: settingId, nickname: setting?.nickname || setting?.mallId || '' };
      });

    if (registrations.length > 0) {
      addStagedRegistrations({ productIds: selectedProductIds, registrations });
    }
    setSelectedProductIds([]);
    setOpen(false);
    setSelectedMalls([]);
    setSettingByMall({});
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>쇼핑몰 등록</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {availableMallCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록 가능한 쇼핑몰 설정이 없습니다.</p>
          ) : (
            availableMallCodes.map((mallCode) => (
              <div key={mallCode} className="space-y-2 rounded-md border border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedMalls.includes(mallCode)}
                    onCheckedChange={(checked: boolean) => handleToggleMall(mallCode, checked)}
                  />
                  <span className="text-sm font-medium">{getMallName(mallCode)}</span>
                </div>
                {selectedMalls.includes(mallCode) && (
                  <RadioGroup
                    value={settingByMall[mallCode] ?? ''}
                    onValueChange={(value) => setSettingByMall((prev) => ({ ...prev, [mallCode]: value }))}
                    className="pl-6"
                  >
                    {mallGroups[mallCode].map((setting) => (
                      <div key={setting.id} className="flex items-center gap-2">
                        <RadioGroupItem value={setting.id} id={setting.id} />
                        <Label htmlFor={setting.id} className="text-sm font-normal">
                          {setting.nickname || setting.mallId}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleComplete}>완료</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [x] **Step 2: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit (안내 — 사용자 요청 시에만 실행)**

```bash
git add src/features/mallRegistration/ui/components/MallSelectModal.tsx
git commit -m "feat: 몰 선택 모달 컴포넌트 추가"
```

---

## Task 6: `MallRegistrationTable` 컴포넌트

**Files:**
- Create: `src/features/mallRegistration/constant/mallRegistration.constants.ts`
- Create: `src/features/mallRegistration/ui/components/MallRegistrationTable.tsx`

**Interfaces:**
- Consumes: `Product[]`(props), `selectedProductIdsAtom`/`stagedRegistrationsAtom`/`removeStagedRegistrationAtom`(Task 4)
- Produces: `MALL_REGISTRATION_TABLE_HEAD`

**컬럼 정의 분리 이유:** Task 6 최초 리뷰에서 `products` 도메인 전용 상수인 `LIST_TABLE_HEAD`(8개 컬럼)를 그대로 재사용하다 보니 실제 렌더링한 데이터 셀(7개)과 헤더 개수가 어긋나는 밀림 버그가 Important finding으로 발견됨 — 사용자와 논의 후, "화면마다 헤더 상수를 분리한다"는 기존 컨벤션(`shoppingSetting`의 `SHOPPING_SETTING_TABLE_HEAD`가 `products`와 별개인 것과 동일)을 따르기로 결정. `LIST_TABLE_HEAD`를 계속 재사용하는 대신 이 화면 전용 `MALL_REGISTRATION_TABLE_HEAD`(공급가 제외, 7개 컬럼)를 신설해 `products/list` 쪽 변경에 영향받지 않게 분리한다. 아래 코드는 이 결정이 반영된 최종본이다.

- [x] **Step 1: 화면 전용 테이블 헤더 상수 작성**

`src/features/mallRegistration/constant/mallRegistration.constants.ts`:

```ts
import { TableTitleValue } from '@/types/common.type';

export const MALL_REGISTRATION_TABLE_HEAD: TableTitleValue[] = [
  { id: 'productCode', title: '상품코드', width: 'w-40' },
  { id: 'productName', title: '상품명' },
  { id: 'categoryCode', title: '카테고리', width: 'w-28' },
  { id: 'productPrice', title: '판매가', width: 'w-28' },
  { id: 'productStatus', title: '판매상태', width: 'w-28' },
  { id: 'productCreateDate', title: '등록일', width: 'w-32' },
  { id: 'productUpdateDate', title: '수정일', width: 'w-32' },
];
```

- [x] **Step 2: 컴포넌트 작성**

`src/features/mallRegistration/ui/components/MallRegistrationTable.tsx`:

```tsx
'use client';

import dayjs from 'dayjs';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCategoryName } from '@/lib/utils';
import { MALL_REGISTRATION_TABLE_HEAD } from '@/features/mallRegistration/constant/mallRegistration.constants';
import { ProductStatusBadge } from '@/components/common/ProductStatusBadge';
import { Product } from '@/features/products/types/product.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import {
  selectedProductIdsAtom,
  stagedRegistrationsAtom,
  removeStagedRegistrationAtom,
} from '@/features/mallRegistration/store/mallRegistration.store';

type Props = {
  products: Product[];
};

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const MallRegistrationTable = ({ products }: Props) => {
  const [selectedProductIds, setSelectedProductIds] = useAtom(selectedProductIdsAtom);
  const stagedRegistrations = useAtomValue(stagedRegistrationsAtom);
  const removeStagedRegistration = useSetAtom(removeStagedRegistrationAtom);

  const handleSelect = (productId: string, checked: boolean) => {
    setSelectedProductIds((prev) => (checked ? [...prev, productId] : prev.filter((id) => id !== productId)));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProductIds(checked ? products.map((p) => p.productId) : []);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
          <TableHead className="w-12">
            <Checkbox
              checked={products.length > 0 && products.every((p) => selectedProductIds.includes(p.productId))}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {MALL_REGISTRATION_TABLE_HEAD.map((item) => (
            <TableHead
              key={item.id}
              className={`text-center font-bold uppercase tracking-widest ${item.width ?? ''}`}
            >
              {item.title}
            </TableHead>
          ))}
          <TableHead className="text-center font-bold uppercase tracking-widest">등록예정 쇼핑몰</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={MALL_REGISTRATION_TABLE_HEAD.length + 2}
              className="h-40 text-center text-sm text-muted-foreground"
            >
              조건에 맞는 상품이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          products.map((product) => {
            const badges = stagedRegistrations[product.productId] ?? [];
            return (
              <TableRow
                key={product.productId}
                className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedProductIds.includes(product.productId)}
                    onCheckedChange={(checked: boolean) => handleSelect(product.productId, checked)}
                  />
                </TableCell>
                <TableCell className="text-center font-mono text-sm text-muted-foreground">
                  {product.productId}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-center">{getCategoryName(product.categoryId)}</TableCell>
                <TableCell className="text-center">{product.price.toLocaleString()}원</TableCell>
                <TableCell className="text-center">
                  <ProductStatusBadge status={product.state} />
                </TableCell>
                <TableCell className="text-center">{dayjs(product.createDate).format('YYYY-MM-DD')}</TableCell>
                <TableCell className="text-center">{dayjs(product.updateDate).format('YYYY-MM-DD')}</TableCell>
                <TableCell>
                  {badges.length === 0 ? (
                    <span className="text-xs text-muted-foreground">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {badges.map((badge) => (
                        <Badge
                          key={`${badge.mallCode}-${badge.shoppingSettingId}`}
                          variant="secondary"
                          className="gap-1"
                        >
                          {getMallName(badge.mallCode)} - {badge.nickname}
                          <button
                            type="button"
                            onClick={() =>
                              removeStagedRegistration({
                                productId: product.productId,
                                mallCode: badge.mallCode,
                                shoppingSettingId: badge.shoppingSettingId,
                              })
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};
```

- [x] **Step 3: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: Commit (안내 — 사용자 요청 시에만 실행)**

```bash
git add src/features/mallRegistration/constant/mallRegistration.constants.ts src/features/mallRegistration/ui/components/MallRegistrationTable.tsx
git commit -m "feat: 쇼핑몰 등록 상품 테이블 컴포넌트 추가"
```

---

## Task 7: `MallRegistrationActionSection` 컴포넌트

**Files:**
- Create: `src/features/mallRegistration/ui/MallRegistrationActionSection.tsx`

**Interfaces:**
- Consumes: `useRegisterProductsToMalls()`(Task 3), `selectedProductIdsAtom`/`isRegisterModalOpenAtom`/`stagedRegistrationsAtom`/`stagedCountAtom`/`resetMallRegistrationStateAtom`(Task 4)

- [x] **Step 1: 컴포넌트 작성**

`src/features/mallRegistration/ui/MallRegistrationActionSection.tsx`:

```tsx
'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { useRegisterProductsToMalls } from '@/features/mallRegistration/api/useRegisterProductsToMalls';
import {
  selectedProductIdsAtom,
  isRegisterModalOpenAtom,
  stagedRegistrationsAtom,
  stagedCountAtom,
  resetMallRegistrationStateAtom,
} from '@/features/mallRegistration/store/mallRegistration.store';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';

export const MallRegistrationActionSection = () => {
  const selectedProductIds = useAtomValue(selectedProductIdsAtom);
  const setModalOpen = useSetAtom(isRegisterModalOpenAtom);
  const stagedRegistrations = useAtomValue(stagedRegistrationsAtom);
  const stagedCount = useAtomValue(stagedCountAtom);
  const resetState = useSetAtom(resetMallRegistrationStateAtom);
  const { mutate: registerToMalls, isPending } = useRegisterProductsToMalls();
  const { showAlert } = useAlert();

  const handleOpenModal = () => {
    if (selectedProductIds.length === 0) {
      showAlert({ message: '등록할 상품을 선택해주세요.', type: 'warning' });
      return;
    }
    setModalOpen(true);
  };

  const handleSend = () => {
    const items: MallRegistrationRequestItem[] = Object.entries(stagedRegistrations).flatMap(
      ([productId, registrations]) =>
        registrations.map((reg) => ({
          productId,
          mallCode: reg.mallCode,
          shoppingSettingId: reg.shoppingSettingId,
        })),
    );

    if (items.length === 0) {
      showAlert({ message: '전송할 쇼핑몰 등록 내역이 없습니다.', type: 'warning' });
      return;
    }

    registerToMalls(items, {
      onSuccess: (data) => {
        resetState();
        showAlert({ message: `${data.count}건이 쇼핑몰로 전송되었습니다.`, type: 'success' });
      },
      onError: () => {
        showAlert({ message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
      },
    });
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="min-w-16 text-sm text-muted-foreground">
        선택 <span className="font-medium text-foreground">{selectedProductIds.length}</span>개
      </span>
      <Button variant="outline" size="sm" onClick={handleOpenModal}>
        쇼핑몰등록
      </Button>
      <Button size="sm" onClick={handleSend} disabled={isPending || stagedCount === 0}>
        쇼핑몰 전송{stagedCount > 0 ? ` (${stagedCount})` : ''}
      </Button>
    </div>
  );
};
```

- [x] **Step 2: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit (안내 — 사용자 요청 시에만 실행)**

```bash
git add src/features/mallRegistration/ui/MallRegistrationActionSection.tsx
git commit -m "feat: 쇼핑몰 등록 액션바 컴포넌트 추가"
```

---

## Task 8: 화면 조립 (Layout, Header, Route, Sidebar)

**Files:**
- Create: `src/features/mallRegistration/ui/MallRegistrationHeaderSection.tsx`
- Create: `src/features/mallRegistration/ui/MallRegistrationTableSection.tsx`
- Create: `src/features/mallRegistration/ui/MallRegistrationLayout.tsx`
- Create: `src/app/(authenticated)/shopping/register/page.tsx`
- Modify: `src/constant/sidebarMenu.constant.ts`

**Interfaces:**
- Consumes: `ProductSearchFilterSection`(기존, `@/features/products/ui/list`), `getProducts`(기존), `MallRegistrationTable`(Task 6), `MallRegistrationActionSection`(Task 7), `MallSelectModal`(Task 5), `resetMallRegistrationStateAtom`(Task 4)

- [x] **Step 1: 헤더 섹션 작성**

`src/features/mallRegistration/ui/MallRegistrationHeaderSection.tsx`:

```tsx
export const MallRegistrationHeaderSection = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">쇼핑몰 상품등록</h1>
      <p className="text-muted-foreground">상품을 선택해 쇼핑몰에 등록하세요.</p>
    </div>
  );
};
```

- [x] **Step 2: 테이블 섹션(카드 래핑 + 페이지네이션) 작성**

`src/features/mallRegistration/ui/MallRegistrationTableSection.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { Product } from '@/features/products/types/product.types';
import { MallRegistrationTable } from './components/MallRegistrationTable';

type Props = {
  products: Product[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
};

export const MallRegistrationTableSection = ({
  products,
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
            <MallRegistrationTable products={products} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

- [x] **Step 3: Layout 조립 (ProductListLayout과 동일한 데이터 패칭 패턴)**

`src/features/mallRegistration/ui/MallRegistrationLayout.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { getSearchFilterAtom } from '@/features/products/store/search.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getProducts, GetProductsResponse } from '@/features/products/api/getProducts';
import { ProductSearchFilterSection } from '@/features/products/ui/list';
import { resetMallRegistrationStateAtom } from '@/features/mallRegistration/store/mallRegistration.store';
import { MallRegistrationHeaderSection } from './MallRegistrationHeaderSection';
import { MallRegistrationActionSection } from './MallRegistrationActionSection';
import { MallRegistrationTableSection } from './MallRegistrationTableSection';
import { MallSelectModal } from './components/MallSelectModal';

export const MallRegistrationLayout = () => {
  const currentFilter = useAtomValue(getSearchFilterAtom);
  const [appliedFilter, setAppliedFilter] = useState(currentFilter);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const resetState = useSetAtom(resetMallRegistrationStateAtom);

  const { data, isLoading, isError } = useQuery<GetProductsResponse>({
    queryKey: ['mallRegistrationProducts', workspaceOwnerId, appliedFilter, currentPage],
    queryFn: () => getProducts(workspaceOwnerId, appliedFilter, currentPage),
    enabled: !!workspaceOwnerId,
  });

  useEffect(() => resetState, [resetState]);

  const handleSearch = () => {
    setAppliedFilter(currentFilter);
    setCurrentPage(1);
  };

  return (
    <>
      <MallRegistrationHeaderSection />
      <ProductSearchFilterSection onSearch={handleSearch} />
      <MallRegistrationActionSection />
      {isError ? (
        <p className="py-10 text-center text-sm text-destructive">상품 목록을 불러오는데 실패했습니다.</p>
      ) : (
        <MallRegistrationTableSection
          products={data?.products ?? []}
          total={data?.total ?? 0}
          totalPages={data?.totalPages ?? 1}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          isLoading={isLoading}
        />
      )}
      <MallSelectModal />
    </>
  );
};
```

- [x] **Step 4: 라우트 페이지 작성**

`src/app/(authenticated)/shopping/register/page.tsx`:

```tsx
import { MallRegistrationLayout } from '@/features/mallRegistration/ui/MallRegistrationLayout';

export default function MallRegistrationPage() {
  return <MallRegistrationLayout />;
}
```

- [x] **Step 5: 사이드바 메뉴 추가**

`src/constant/sidebarMenu.constant.ts`의 `쇼핑몰관리` 그룹 `items` 배열에 추가:

```ts
      {
        title: '쇼핑몰 상품등록',
        url: '/shopping/register',
      },
```

(`쇼핑몰 정보설정` 항목 다음, 그룹 닫는 배열 끝 이전)

- [x] **Step 6: 타입 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [x] **Step 7: 수동 동작 확인 (dev 서버)**

Run: `npm run dev`

확인 항목:
1. 사이드바 `쇼핑몰관리` > `쇼핑몰 상품등록` 진입 시 `/shopping/register`에서 상품 목록이 로드된다
2. 상품 여러 건 체크 → `쇼핑몰등록` 클릭 → 모달에서 몰 다중선택 + 몰별 설정 라디오 선택 → 완료 시 모달이 닫히고 선택했던 상품 행 하단에 배지가 표시된다
3. 배지의 `X` 클릭 시 해당 배지만 제거된다
4. `쇼핑몰 전송` 클릭 시 성공 alert가 뜨고 모든 배지가 초기화된다
5. 새로고침 시 배지가 항상 빈 상태로 시작한다 (이전 전송 이력이 표시되지 않음)

- [x] **Step 8: 전체 테스트 실행**

Run: `npm run test`
Expected: 전체 PASS (Task 2, 3에서 추가한 테스트 포함)

- [ ] **Step 9: Commit (안내 — 사용자 요청 시에만 실행)**

```bash
git add src/features/mallRegistration/ui/MallRegistrationHeaderSection.tsx src/features/mallRegistration/ui/MallRegistrationTableSection.tsx src/features/mallRegistration/ui/MallRegistrationLayout.tsx src/app/\(authenticated\)/shopping/register/page.tsx src/constant/sidebarMenu.constant.ts
git commit -m "feat: 쇼핑몰 상품등록 화면 라우트 및 조립 완료"
```
