# 쇼핑몰 정보설정 - 정보 입력 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 쇼핑몰 정보설정 리스트 화면에서 "준비중"으로 막혀 있던 등록/수정 진입점을 실제 정보 입력 화면(생성/수정 공용)으로 연결한다.

**Architecture:** Products 화면 패턴(패턴 B)을 따른다 — `ShoppingSettingCreateLayout`/`ShoppingSettingModifyLayout`이 각각 `useForm<ShoppingSetting>()` + `FormProvider`를 소유하고, 동일한 `ShoppingSettingForm`(공통 필드 섹션 + 출고지/반품지 섹션 + 쇼핑몰별 필드 빈 섹션)을 재사용한다. `mode` prop은 사용하지 않는다. 출고지/반품지는 몰별 MSW 목업 주소록 API에서 조회해 모달로 선택한다.

**Tech Stack:** Next.js 15 App Router, React Hook Form(FormProvider/Controller, zod 미사용 — RHF 기본 `rules`), TanStack Query, Jotai(auth atom만 재사용), MSW, Vitest(mocks/utils 레이어만)

## Global Constraints

- 서명된 스펙: `docs/superpowers/specs/2026-07-10-shopping-setting-info-input-design.md`
- **테스트 범위**: 이 프로젝트는 `src/mocks/utils/*.ts`(순수 비즈니스 로직)에 한해 Vitest 단위 테스트가 존재한다(`getShoppingSettings.test.ts` 등 기존 예시). UI 컴포넌트, fetch 래퍼 API 함수(`features/*/api/*.ts`), React Query 훅에는 테스트 파일이 없는 것이 기존 관례다. 이 계획도 동일 관례를 따른다 — **mocks/utils 함수만 실패 테스트 → 구현 → 통과 확인의 TDD 사이클을 적용**하고, 나머지 파일은 구현 후 `npm run lint`와 수동 브라우저 확인으로 검증한다.
- **커밋 금지**: 각 Task의 "Commit" 스텝은 문서 안내일 뿐이다. `git add`/`git commit` 등 모든 git 작업은 사용자가 그 시점에 명시적으로 요청한 경우에만 실행한다(CLAUDE.md Git/PR 규칙). 서브에이전트에게 디스패치할 때도 git 명령 지시를 넣지 않는다.
- 폰트 크기·색상은 변경하지 않는다(CLAUDE.md 스타일 규칙).
- 연락처 필드는 이번 작업에 포함되지 않는다(해당 없음).
- 모든 fetch 기반 API 함수는 `${process.env.NEXT_PUBLIC_BASE_URL}` 프리픽스와 실패 시 `throw new Error('...')` 패턴을 따른다(기존 `shoppingAccount`/`shoppingSetting` API 파일과 동일).

---

### Task 1: 데이터 모델 확장 (타입 + Mock 데이터)

**Files:**
- Modify: `src/features/shoppingSetting/types/shoppingSetting.types.ts`
- Modify: `src/mocks/data/MockShoppingSettingsData.ts`

**Interfaces:**
- Produces: `ProductCondition = 'NEW' | 'USED'`, `SalesPeriod = 7 | 15 | 30 | 60 | 90`, `MallAddress { code, name, zipCode, address, addressDetail }`, 확장된 `ShoppingSetting`(`productCondition`, `salesPeriod`, `shippingAddress: MallAddress | null`, `returnAddress: MallAddress | null` 필드 추가), `CreateShoppingSettingBody = Omit<ShoppingSetting, 'id'|'ownerId'|'createdAt'|'updatedAt'>`, `UpdateShoppingSettingBody = Partial<CreateShoppingSettingBody>` — 이후 모든 Task가 이 타입들을 사용한다.

이 Task는 테스트 대상 로직이 없는 순수 타입/데이터 변경이므로 TDD 사이클 대신 타입체크로 검증한다.

- [ ] **Step 1: 타입 파일 전체 교체**

`src/features/shoppingSetting/types/shoppingSetting.types.ts` 전체를 다음으로 교체:

```ts
import { ShoppingMalls } from '@/types/common.type';

export type ProductCondition = 'NEW' | 'USED'; // 신상품 / 중고상품
export type SalesPeriod = 7 | 15 | 30 | 60 | 90;

export interface MallAddress {
  code: string; // 출고지코드 / 반품지코드 (몰 내부 식별자)
  name: string; // 출고지명 / 반품지명
  zipCode: string;
  address: string;
  addressDetail: string;
}

export interface ShoppingSetting {
  id: string;
  mallAccountId: string; // 참조: ShoppingAccount.id
  mallCode: ShoppingMalls;
  mallId: string;
  nickname: string;
  isActive: boolean;
  productCondition: ProductCondition;
  salesPeriod: SalesPeriod;
  shippingAddress: MallAddress | null;
  returnAddress: MallAddress | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingSettingSearchType {
  dateType: 'createdAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  mallAccountId: string; // 'ALL' 기본값, ShoppingAccount.id 참조
  searchValue: string;
}

export interface GetShoppingSettingsResponse {
  settings: ShoppingSetting[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AvailableMallAccount {
  id: string; // ShoppingAccount.id
  mallCode: ShoppingMalls;
  mallId: string;
  settingCount: number;
}

export type CreateShoppingSettingBody = Omit<ShoppingSetting, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdateShoppingSettingBody = Partial<CreateShoppingSettingBody>;
```

- [ ] **Step 2: Mock 데이터에 신규 필드 반영**

`src/mocks/data/MockShoppingSettingsData.ts` 전체를 다음으로 교체:

```ts
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const SAMPLE_SHIPPING_ADDRESS = {
  code: 'COUP-WH-01',
  name: '쿠팡 본사 물류센터',
  zipCode: '08589',
  address: '서울특별시 금천구 가산디지털1로 168',
  addressDetail: '3층 301호',
};

const SAMPLE_RETURN_ADDRESS = {
  code: 'COUP-WH-02',
  name: '쿠팡 경기 물류센터',
  zipCode: '14548',
  address: '경기도 부천시 원미구 길주로 210',
  addressDetail: '2층 202호',
};

export const MOCK_SHOPPING_SETTINGS_DATA: ShoppingSetting[] = [
  {
    id: 'ss_001',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '쿠팡 메인 설정',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 30,
    shippingAddress: SAMPLE_SHIPPING_ADDRESS,
    returnAddress: SAMPLE_RETURN_ADDRESS,
    ownerId: 'usr_2f20748f',
    createdAt: '2025-05-01',
    updatedAt: '2025-05-01',
  },
  {
    id: 'ss_002',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '쿠팡 프로모션용',
    isActive: true,
    productCondition: 'USED',
    salesPeriod: 15,
    shippingAddress: SAMPLE_SHIPPING_ADDRESS,
    returnAddress: SAMPLE_RETURN_ADDRESS,
    ownerId: 'usr_2f20748f',
    createdAt: '2025-05-10',
    updatedAt: '2025-05-12',
  },
  {
    id: 'ss_003',
    mallAccountId: 'sa_002',
    mallCode: 'NSST',
    mallId: 'naver_store_002',
    nickname: '네이버 기본 설정',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 60,
    shippingAddress: null,
    returnAddress: null,
    ownerId: 'usr_2f20748f',
    createdAt: '2025-05-15',
    updatedAt: '2025-05-15',
  },
  {
    id: 'ss_004',
    mallAccountId: 'sa_004',
    mallCode: 'GMK',
    mallId: 'gmarket_seller_004',
    nickname: '지마켓 설정',
    isActive: false,
    productCondition: 'NEW',
    salesPeriod: 90,
    shippingAddress: null,
    returnAddress: null,
    ownerId: 'usr_2f20748f',
    createdAt: '2025-05-20',
    updatedAt: '2025-05-22',
  },
];
```

- [ ] **Step 3: 타입체크로 검증**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (기존 `ShoppingSetting` 사용처 중 신규 필드 누락으로 인한 타입 에러가 없어야 한다)

- [ ] **Step 4: 기존 관련 테스트가 깨지지 않는지 확인**

Run: `npx vitest run src/mocks/utils/getShoppingSettings.test.ts src/mocks/utils/updateShoppingSettingsStatus.test.ts src/mocks/utils/deleteShoppingSettings.test.ts src/mocks/utils/getAvailableMallAccounts.test.ts`
Expected: 4개 파일 모두 PASS (이 테스트들은 자체 `vi.mock`으로 데이터를 대체하므로 Step 2의 데이터 변경과 무관하게 통과해야 한다)

- [ ] **Step 5: Commit**

```bash
git add src/features/shoppingSetting/types/shoppingSetting.types.ts src/mocks/data/MockShoppingSettingsData.ts
git commit -m "feat: ShoppingSetting에 상품상태/판매기간/출고지/반품지 필드 추가"
```

---

### Task 2: 출고지/반품지 주소록 Mock 데이터 + API

**Files:**
- Create: `src/mocks/data/MockMallAddressBookData.ts`
- Create: `src/mocks/utils/getAddressBook.ts`
- Create: `src/mocks/utils/getAddressBook.test.ts`
- Modify: `src/mocks/handlers/shoppingSettings.ts`
- Create: `src/features/shoppingSetting/api/getAddressBook.ts`
- Create: `src/features/shoppingSetting/api/useGetAddressBook.ts`

**Interfaces:**
- Consumes: `MallAddress`(Task 1), `baseUrl`(`src/mocks/config.ts`), `ShoppingMalls`(`@/types/common.type`), `SHOPPING_MALLS`(`@/shared/constant/shoppingMall.constant`)
- Produces: `getMockAddressBook(mallCode: ShoppingMalls): MallAddress[]`, MSW `POST /api/shopping/settings/addresses`, 클라이언트 `getAddressBook(mallCode, mallId): Promise<MallAddress[]>`, `useGetAddressBook(mallCode, mallId, enabled): UseQueryResult<MallAddress[]>` — Task 4(AddressSelectModal)가 `useGetAddressBook`을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/mocks/utils/getAddressBook.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getMockAddressBook } from './getAddressBook';

describe('getMockAddressBook', () => {
  it('COUP 몰코드로 조회하면 COUP 접두어 코드의 주소만 반환한다', () => {
    const result = getMockAddressBook('COUP');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((address) => expect(address.code.startsWith('COUP-')).toBe(true));
  });

  it('모든 항목에 zipCode/address/addressDetail/name/code가 존재한다', () => {
    const result = getMockAddressBook('NSST');
    result.forEach((address) => {
      expect(address.code).toBeTruthy();
      expect(address.name).toBeTruthy();
      expect(address.zipCode).toBeTruthy();
      expect(address.address).toBeTruthy();
      expect(address.addressDetail).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/mocks/utils/getAddressBook.test.ts`
Expected: FAIL — `Cannot find module './getAddressBook'`

- [ ] **Step 3: Mock 주소록 데이터 작성**

Create `src/mocks/data/MockMallAddressBookData.ts`:

```ts
import { ShoppingMalls } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';

const BASE_ADDRESSES: Omit<MallAddress, 'code'>[] = [
  {
    name: '본사 물류센터',
    zipCode: '08589',
    address: '서울특별시 금천구 가산디지털1로 168',
    addressDetail: '3층 301호',
  },
  {
    name: '경기 물류센터',
    zipCode: '14548',
    address: '경기도 부천시 원미구 길주로 210',
    addressDetail: '2층 202호',
  },
];

export const MOCK_MALL_ADDRESS_BOOK: Record<ShoppingMalls, MallAddress[]> = SHOPPING_MALLS.reduce(
  (acc, mall) => {
    const mallCode = mall.code as ShoppingMalls;
    acc[mallCode] = BASE_ADDRESSES.map((base, index) => ({
      ...base,
      code: `${mallCode}-WH-${String(index + 1).padStart(2, '0')}`,
    }));
    return acc;
  },
  {} as Record<ShoppingMalls, MallAddress[]>,
);
```

- [ ] **Step 4: 최소 구현**

Create `src/mocks/utils/getAddressBook.ts`:

```ts
import { MOCK_MALL_ADDRESS_BOOK } from '../data/MockMallAddressBookData';
import { MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';

export const getMockAddressBook = (mallCode: ShoppingMalls): MallAddress[] => {
  return MOCK_MALL_ADDRESS_BOOK[mallCode] ?? [];
};
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/mocks/utils/getAddressBook.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: MSW 핸들러 추가**

`src/mocks/handlers/shoppingSettings.ts`에서 import 목록에 아래 두 줄 추가:

```ts
import { ShoppingMalls } from '@/types/common.type';
import { getMockAddressBook } from '../utils/getAddressBook';
```

`shoppingSettingHandlers` 배열의 마지막 항목(`available-accounts` 핸들러) 뒤에 추가:

```ts
  http.post(`${baseUrl}/api/shopping/settings/addresses`, async ({ request }) => {
    const { mallCode } = (await request.json()) as { mallCode: ShoppingMalls; mallId: string };
    return HttpResponse.json(getMockAddressBook(mallCode));
  }),
```

- [ ] **Step 7: 클라이언트 API 함수 작성**

Create `src/features/shoppingSetting/api/getAddressBook.ts`:

```ts
import { MallAddress } from '../types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';

export const getAddressBook = async (mallCode: ShoppingMalls, mallId: string): Promise<MallAddress[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mallCode, mallId }),
  });
  if (!response.ok) throw new Error('주소록 조회 실패');
  return response.json();
};
```

Create `src/features/shoppingSetting/api/useGetAddressBook.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { ShoppingMalls } from '@/types/common.type';
import { getAddressBook } from './getAddressBook';

export const ADDRESS_BOOK_QUERY_KEY = 'shoppingSettingAddressBook';

export const useGetAddressBook = (mallCode: ShoppingMalls, mallId: string, enabled: boolean) => {
  return useQuery({
    queryKey: [ADDRESS_BOOK_QUERY_KEY, mallCode, mallId],
    queryFn: () => getAddressBook(mallCode, mallId),
    enabled: enabled && !!mallCode && !!mallId,
  });
};
```

- [ ] **Step 8: lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/mocks/data/MockMallAddressBookData.ts src/mocks/utils/getAddressBook.ts src/mocks/utils/getAddressBook.test.ts src/mocks/handlers/shoppingSettings.ts src/features/shoppingSetting/api/getAddressBook.ts src/features/shoppingSetting/api/useGetAddressBook.ts
git commit -m "feat: 몰별 출고지/반품지 주소록 목업 API 추가"
```

---

### Task 3: 설정 단건 조회 / 생성 / 수정 Mock API

**Files:**
- Create: `src/mocks/utils/getShoppingSetting.ts`
- Create: `src/mocks/utils/getShoppingSetting.test.ts`
- Create: `src/mocks/utils/createShoppingSetting.ts`
- Create: `src/mocks/utils/createShoppingSetting.test.ts`
- Create: `src/mocks/utils/updateShoppingSetting.ts`
- Create: `src/mocks/utils/updateShoppingSetting.test.ts`
- Modify: `src/mocks/handlers/shoppingSettings.ts`
- Create: `src/features/shoppingSetting/api/getShoppingSetting.ts`
- Create: `src/features/shoppingSetting/api/useGetShoppingSetting.ts`
- Create: `src/features/shoppingSetting/api/createShoppingSetting.ts`
- Create: `src/features/shoppingSetting/api/useCreateShoppingSetting.ts`
- Create: `src/features/shoppingSetting/api/updateShoppingSetting.ts`
- Create: `src/features/shoppingSetting/api/useUpdateShoppingSetting.ts`

**Interfaces:**
- Consumes: `ShoppingSetting`, `CreateShoppingSettingBody`, `UpdateShoppingSettingBody`(Task 1), `SHOPPING_SETTING_LIST_QUERY_KEY`(기존 `useGetShoppingSettings.ts`에서 export)
- Produces: `getMockShoppingSetting(id)`, `createMockShoppingSetting(body, ownerId)`, `updateMockShoppingSetting(id, body)`, MSW `GET/POST /api/shopping/settings`, `GET/PATCH /api/shopping/settings/:id`, 클라이언트 `getShoppingSetting`, `createShoppingSetting`, `updateShoppingSetting`와 각 훅 `useGetShoppingSetting(id)`, `useCreateShoppingSetting()`, `useUpdateShoppingSetting(id)`(`SHOPPING_SETTING_QUERY_KEY` export) — Task 7(생성 화면)과 Task 8(수정 화면)이 이 훅들을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 (3개 파일)**

Create `src/mocks/utils/getShoppingSetting.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => ({
  SETTINGS: [
    {
      id: 'ss_001',
      mallAccountId: 'sa_001',
      mallCode: 'COUP',
      mallId: 'coupang_seller_001',
      nickname: '쿠팡 메인',
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2025-05-01',
      updatedAt: '2025-05-01',
    },
  ] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { getMockShoppingSetting } from './getShoppingSetting';

describe('getMockShoppingSetting', () => {
  it('id가 일치하는 설정을 반환한다', () => {
    expect(getMockShoppingSetting('ss_001')?.nickname).toBe('쿠팡 메인');
  });

  it('일치하는 id가 없으면 undefined를 반환한다', () => {
    expect(getMockShoppingSetting('ss_999')).toBeUndefined();
  });
});
```

Create `src/mocks/utils/createShoppingSetting.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => ({
  SETTINGS: [] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { createMockShoppingSetting } from './createShoppingSetting';
import type { CreateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';

const body: CreateShoppingSettingBody = {
  mallAccountId: 'sa_001',
  mallCode: 'COUP',
  mallId: 'coupang_seller_001',
  nickname: '신규 설정',
  isActive: true,
  productCondition: 'NEW',
  salesPeriod: 7,
  shippingAddress: null,
  returnAddress: null,
};

describe('createMockShoppingSetting', () => {
  it('새 설정을 생성해 배열에 추가한다', () => {
    const created = createMockShoppingSetting(body, 'usr_001');
    expect(created.nickname).toBe('신규 설정');
    expect(created.ownerId).toBe('usr_001');
    expect(SETTINGS).toHaveLength(1);
  });

  it('id, createdAt, updatedAt을 자동 생성한다', () => {
    const created = createMockShoppingSetting(body, 'usr_001');
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
  });
});
```

Create `src/mocks/utils/updateShoppingSetting.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => ({
  SETTINGS: [
    {
      id: 'ss_001',
      mallAccountId: 'sa_001',
      mallCode: 'COUP',
      mallId: 'coupang_seller_001',
      nickname: '쿠팡 메인',
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2025-05-01',
      updatedAt: '2025-05-01',
    },
  ] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { updateMockShoppingSetting } from './updateShoppingSetting';

describe('updateMockShoppingSetting', () => {
  it('지정한 id의 필드를 갱신한다', () => {
    const updated = updateMockShoppingSetting('ss_001', { nickname: '변경된 별칭', salesPeriod: 90 });
    expect(updated?.nickname).toBe('변경된 별칭');
    expect(updated?.salesPeriod).toBe(90);
  });

  it('updatedAt을 오늘 날짜로 갱신한다', () => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = updateMockShoppingSetting('ss_001', { nickname: 'x' });
    expect(updated?.updatedAt).toBe(today);
  });

  it('존재하지 않는 id면 null을 반환한다', () => {
    expect(updateMockShoppingSetting('ss_999', { nickname: 'x' })).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/mocks/utils/getShoppingSetting.test.ts src/mocks/utils/createShoppingSetting.test.ts src/mocks/utils/updateShoppingSetting.test.ts`
Expected: FAIL — 각각 `Cannot find module './getShoppingSetting'` 등 3건

- [ ] **Step 3: 최소 구현**

Create `src/mocks/utils/getShoppingSetting.ts`:

```ts
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const getMockShoppingSetting = (id: string): ShoppingSetting | undefined => {
  return MOCK_SHOPPING_SETTINGS_DATA.find((setting) => setting.id === id);
};
```

Create `src/mocks/utils/createShoppingSetting.ts`:

```ts
import dayjs from 'dayjs';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingSetting, CreateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const createMockShoppingSetting = (body: CreateShoppingSettingBody, ownerId: string): ShoppingSetting => {
  const now = dayjs().format('YYYY-MM-DD');
  const newSetting: ShoppingSetting = {
    id: `ss_${Date.now()}`,
    ownerId,
    ...body,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_SHOPPING_SETTINGS_DATA.push(newSetting);
  return newSetting;
};
```

Create `src/mocks/utils/updateShoppingSetting.ts`:

```ts
import dayjs from 'dayjs';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingSetting, UpdateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const updateMockShoppingSetting = (id: string, body: UpdateShoppingSettingBody): ShoppingSetting | null => {
  const index = MOCK_SHOPPING_SETTINGS_DATA.findIndex((setting) => setting.id === id);
  if (index === -1) return null;
  MOCK_SHOPPING_SETTINGS_DATA[index] = {
    ...MOCK_SHOPPING_SETTINGS_DATA[index],
    ...body,
    updatedAt: dayjs().format('YYYY-MM-DD'),
  };
  return MOCK_SHOPPING_SETTINGS_DATA[index];
};
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/mocks/utils/getShoppingSetting.test.ts src/mocks/utils/createShoppingSetting.test.ts src/mocks/utils/updateShoppingSetting.test.ts`
Expected: PASS (2 + 2 + 3 = 7 tests)

- [ ] **Step 5: MSW 핸들러 추가**

`src/mocks/handlers/shoppingSettings.ts`의 import 목록에 추가:

```ts
import { CreateShoppingSettingBody, UpdateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { getMockShoppingSetting } from '../utils/getShoppingSetting';
import { createMockShoppingSetting } from '../utils/createShoppingSetting';
import { updateMockShoppingSetting } from '../utils/updateShoppingSetting';
```

`shoppingSettingHandlers` 배열 맨 끝(Task 2에서 추가한 `addresses` 핸들러 뒤)에 추가:

```ts
  http.post(`${baseUrl}/api/shopping/settings`, async ({ request }) => {
    const { ownerId, ...body } = (await request.json()) as CreateShoppingSettingBody & { ownerId: string };
    return HttpResponse.json(createMockShoppingSetting(body, ownerId), { status: 201 });
  }),

  // status/addresses 등 고정경로를 모두 등록한 뒤 동적경로(/:id)를 등록 - :id가 고정 세그먼트와 매칭되는 것을 방지
  http.get(`${baseUrl}/api/shopping/settings/:id`, ({ params }) => {
    const setting = getMockShoppingSetting(params.id as string);
    if (!setting) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(setting);
  }),

  http.patch(`${baseUrl}/api/shopping/settings/:id`, async ({ request, params }) => {
    const body = (await request.json()) as UpdateShoppingSettingBody;
    const updated = updateMockShoppingSetting(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),
```

- [ ] **Step 6: 클라이언트 API 함수 + 훅 작성**

Create `src/features/shoppingSetting/api/getShoppingSetting.ts`:

```ts
import { ShoppingSetting } from '../types/shoppingSetting.types';

export const getShoppingSetting = async (id: string): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/${id}`);
  if (!response.ok) throw new Error('쇼핑몰 정보설정 조회 실패');
  return response.json();
};
```

Create `src/features/shoppingSetting/api/useGetShoppingSetting.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { getShoppingSetting } from './getShoppingSetting';

export const SHOPPING_SETTING_QUERY_KEY = 'shoppingSetting';

export const useGetShoppingSetting = (id: string) => {
  return useQuery({
    queryKey: [SHOPPING_SETTING_QUERY_KEY, id],
    queryFn: () => getShoppingSetting(id),
    enabled: !!id,
  });
};
```

Create `src/features/shoppingSetting/api/createShoppingSetting.ts`:

```ts
import { ShoppingSetting, CreateShoppingSettingBody } from '../types/shoppingSetting.types';

export const createShoppingSetting = async (
  body: CreateShoppingSettingBody,
  ownerId: string,
): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ownerId }),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 등록 실패');
  return response.json();
};
```

Create `src/features/shoppingSetting/api/useCreateShoppingSetting.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { createShoppingSetting } from './createShoppingSetting';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';
import { CreateShoppingSettingBody } from '../types/shoppingSetting.types';

export const useCreateShoppingSetting = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: CreateShoppingSettingBody) => createShoppingSetting(body, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
```

Create `src/features/shoppingSetting/api/updateShoppingSetting.ts`:

```ts
import { ShoppingSetting, UpdateShoppingSettingBody } from '../types/shoppingSetting.types';

export const updateShoppingSetting = async (
  id: string,
  body: UpdateShoppingSettingBody,
): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 수정 실패');
  return response.json();
};
```

Create `src/features/shoppingSetting/api/useUpdateShoppingSetting.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateShoppingSetting } from './updateShoppingSetting';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';
import { SHOPPING_SETTING_QUERY_KEY } from './useGetShoppingSetting';
import { UpdateShoppingSettingBody } from '../types/shoppingSetting.types';

export const useUpdateShoppingSetting = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateShoppingSettingBody) => updateShoppingSetting(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_QUERY_KEY, id] });
    },
  });
};
```

- [ ] **Step 7: lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 8: Commit**

```bash
git add src/mocks/utils/getShoppingSetting.ts src/mocks/utils/getShoppingSetting.test.ts src/mocks/utils/createShoppingSetting.ts src/mocks/utils/createShoppingSetting.test.ts src/mocks/utils/updateShoppingSetting.ts src/mocks/utils/updateShoppingSetting.test.ts src/mocks/handlers/shoppingSettings.ts src/features/shoppingSetting/api/getShoppingSetting.ts src/features/shoppingSetting/api/useGetShoppingSetting.ts src/features/shoppingSetting/api/createShoppingSetting.ts src/features/shoppingSetting/api/useCreateShoppingSetting.ts src/features/shoppingSetting/api/updateShoppingSetting.ts src/features/shoppingSetting/api/useUpdateShoppingSetting.ts
git commit -m "feat: 쇼핑몰 정보설정 단건 조회/생성/수정 API 추가"
```

---

### Task 4: AddressSelectModal (출고지/반품지 공용 선택 모달)

**Files:**
- Create: `src/features/shoppingSetting/ui/components/address/AddressSelectModal.tsx`

**Interfaces:**
- Consumes: `useGetAddressBook(mallCode, mallId, enabled)`(Task 2), `MallAddress`(Task 1), `useAlert()`(`@/hooks/useAlert`), UI 프리미티브(`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `Button`, `RadioGroup`, `RadioGroupItem`, `Table*`)
- Produces: `AddressSelectModal` 컴포넌트 — props `{ open, onOpenChange, title, mallCode, mallId, value, onApply }` — Task 6(`ShoppingSettingAddressSection`)이 사용한다.

UI 컴포넌트라 이 프로젝트 관례상 자동 테스트가 없다. 구현 후 lint + 수동 브라우저 확인으로 검증한다.

- [ ] **Step 1: 컴포넌트 작성**

Create `src/features/shoppingSetting/ui/components/address/AddressSelectModal.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetAddressBook } from '@/features/shoppingSetting/api/useGetAddressBook';
import { MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';
import { useAlert } from '@/hooks/useAlert';

interface AddressSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mallCode: ShoppingMalls;
  mallId: string;
  value: MallAddress | null;
  onApply: (address: MallAddress) => void;
}

export const AddressSelectModal = ({
  open,
  onOpenChange,
  title,
  mallCode,
  mallId,
  value,
  onApply,
}: AddressSelectModalProps) => {
  const { data: addresses = [], isLoading } = useGetAddressBook(mallCode, mallId, open);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (open) {
      setSelectedCode(value?.code ?? null);
    }
  }, [open, value]);

  const handleApply = () => {
    const selected = addresses.find((address) => address.code === selectedCode);
    if (!selected) {
      showAlert({ message: '주소를 선택해주세요.', type: 'info' });
      return;
    }
    onApply(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <RadioGroup value={selectedCode ?? ''} onValueChange={setSelectedCode}>
            <Table>
              <TableHeader>
                <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
                  <TableHead className="w-12 text-center">선택</TableHead>
                  <TableHead className="text-center font-bold uppercase tracking-widest">출고지명</TableHead>
                  <TableHead className="text-center font-bold uppercase tracking-widest">우편번호</TableHead>
                  <TableHead className="text-left font-bold uppercase tracking-widest">주소</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addresses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                      등록된 주소가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  addresses.map((address) => (
                    <TableRow
                      key={address.code}
                      className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <TableCell className="text-center">
                        <RadioGroupItem value={address.code} />
                      </TableCell>
                      <TableCell className="text-center">{address.name}</TableCell>
                      <TableCell className="text-center">{address.zipCode}</TableCell>
                      <TableCell className="text-left">
                        {address.address} {address.addressDetail}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </RadioGroup>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" onClick={handleApply}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: lint 확인**

Run: `npm run lint`
Expected: 에러 없음 (Task 6에서 실제로 렌더링되기 전까지는 미사용 파일이라 타입 에러만 없으면 된다)

- [ ] **Step 3: Commit**

```bash
git add src/features/shoppingSetting/ui/components/address/AddressSelectModal.tsx
git commit -m "feat: 출고지/반품지 공용 선택 모달 컴포넌트 추가"
```

---

### Task 5: ShoppingSettingBasicInfoSection (공통 필드 섹션)

**Files:**
- Modify: `src/features/shoppingSetting/constant/shoppingSetting.constants.ts`
- Create: `src/features/shoppingSetting/ui/components/form/ShoppingSettingBasicInfoSection.tsx`

**Interfaces:**
- Consumes: `ShoppingSetting`(Task 1), `useFormContext<ShoppingSetting>()`(RHF, Task 7/8이 `FormProvider`로 제공)
- Produces: `PRODUCT_CONDITION_OPTIONS`, `SALES_PERIOD_OPTIONS`(`FilterOption[]`), `ShoppingSettingBasicInfoSection` 컴포넌트 — Task 6에서 `ShoppingSettingForm`에 조합된다.

UI 컴포넌트라 자동 테스트 없음. lint + Task 7 완료 후 브라우저 확인으로 최종 검증한다.

- [ ] **Step 1: 옵션 상수 추가**

`src/features/shoppingSetting/constant/shoppingSetting.constants.ts` 끝에 추가:

```ts
export const PRODUCT_CONDITION_OPTIONS: FilterOption[] = [
  { id: 'NEW', name: '신상품' },
  { id: 'USED', name: '중고상품' },
];

export const SALES_PERIOD_OPTIONS: FilterOption[] = [
  { id: '7', name: '7일' },
  { id: '15', name: '15일' },
  { id: '30', name: '30일' },
  { id: '60', name: '60일' },
  { id: '90', name: '90일' },
];
```

- [ ] **Step 2: 섹션 컴포넌트 작성**

Create `src/features/shoppingSetting/ui/components/form/ShoppingSettingBasicInfoSection.tsx`:

```tsx
'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import {
  PRODUCT_CONDITION_OPTIONS,
  SALES_PERIOD_OPTIONS,
} from '@/features/shoppingSetting/constant/shoppingSetting.constants';

export const ShoppingSettingBasicInfoSection = () => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ShoppingSetting>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">공통 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label htmlFor="nickname">별칭 *</Label>
          <Input
            id="nickname"
            placeholder="별칭을 입력하세요."
            {...register('nickname', { required: '별칭을 입력해 주세요.' })}
          />
          {errors.nickname && <p className="text-red-500 text-sm">{errors.nickname.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>상품상태 *</Label>
          <Controller
            name="productCondition"
            control={control}
            rules={{ required: '상품상태를 선택해 주세요.' }}
            render={({ field, fieldState }) => (
              <>
                <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-6">
                  {PRODUCT_CONDITION_OPTIONS.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <RadioGroupItem value={option.id} id={`productCondition-${option.id}`} />
                      <Label htmlFor={`productCondition-${option.id}`}>{option.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>판매기간 *</Label>
          <Controller
            name="salesPeriod"
            control={control}
            rules={{ required: '판매기간을 선택해 주세요.' }}
            render={({ field, fieldState }) => (
              <>
                <RadioGroup
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(val) => field.onChange(Number(val))}
                  className="flex flex-wrap gap-6"
                >
                  {SALES_PERIOD_OPTIONS.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <RadioGroupItem value={option.id} id={`salesPeriod-${option.id}`} />
                      <Label htmlFor={`salesPeriod-${option.id}`}>{option.name}</Label>
                    </div>
                  ))}
                </RadioGroup>
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 3: lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/features/shoppingSetting/constant/shoppingSetting.constants.ts src/features/shoppingSetting/ui/components/form/ShoppingSettingBasicInfoSection.tsx
git commit -m "feat: 정보설정 공통 필드(별칭/상품상태/판매기간) 섹션 추가"
```

---

### Task 6: ShoppingSettingAddressSection + ShoppingSettingMallFieldSection

**Files:**
- Create: `src/features/shoppingSetting/ui/components/form/ShoppingSettingAddressSection.tsx`
- Create: `src/features/shoppingSetting/ui/components/form/ShoppingSettingMallFieldSection.tsx`

**Interfaces:**
- Consumes: `AddressSelectModal`(Task 4), `ShoppingSetting`, `MallAddress`(Task 1)
- Produces: `ShoppingSettingAddressSection`, `ShoppingSettingMallFieldSection` 컴포넌트 — Task 7에서 `ShoppingSettingForm`에 조합된다.

- [ ] **Step 1: 출고지/반품지 섹션 작성**

Create `src/features/shoppingSetting/ui/components/form/ShoppingSettingAddressSection.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AddressSelectModal } from '../address/AddressSelectModal';
import { ShoppingSetting, MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';

interface AddressPickerFieldProps {
  name: 'shippingAddress' | 'returnAddress';
  label: string;
  mallCode: ShoppingSetting['mallCode'];
  mallId: string;
}

const formatAddress = (address: MallAddress) =>
  `${address.name} (${address.zipCode}) ${address.address} ${address.addressDetail}`;

const AddressPickerField = ({ name, label, mallCode, mallId }: AddressPickerFieldProps) => {
  const { control } = useFormContext<ShoppingSetting>();
  const [open, setOpen] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: `${label}를 선택해 주세요.` }}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label>{label} *</Label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(true)}>
              {label} 선택
            </Button>
            <span className="text-sm text-muted-foreground">
              {field.value ? formatAddress(field.value) : `선택된 ${label}가 없습니다.`}
            </span>
          </div>
          {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
          <AddressSelectModal
            open={open}
            onOpenChange={setOpen}
            title={`${label} 선택`}
            mallCode={mallCode}
            mallId={mallId}
            value={field.value}
            onApply={field.onChange}
          />
        </div>
      )}
    />
  );
};

export const ShoppingSettingAddressSection = () => {
  const { watch } = useFormContext<ShoppingSetting>();
  const mallCode = watch('mallCode');
  const mallId = watch('mallId');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">출고지 / 반품지</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <AddressPickerField name="shippingAddress" label="출고지" mallCode={mallCode} mallId={mallId} />
        <AddressPickerField name="returnAddress" label="반품지" mallCode={mallCode} mallId={mallId} />
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: 쇼핑몰별 필드 빈 섹션 작성**

Create `src/features/shoppingSetting/ui/components/form/ShoppingSettingMallFieldSection.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ShoppingSettingMallFieldSection = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">쇼핑몰별 필드</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">쇼핑몰별 필드는 준비 중입니다.</p>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 3: lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/features/shoppingSetting/ui/components/form/ShoppingSettingAddressSection.tsx src/features/shoppingSetting/ui/components/form/ShoppingSettingMallFieldSection.tsx
git commit -m "feat: 출고지/반품지 섹션과 쇼핑몰별 필드 빈 섹션 추가"
```

---

### Task 7: ShoppingSettingForm + ShoppingSettingCreateLayout + 생성 라우트

**Files:**
- Create: `src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx`
- Create: `src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx`
- Create: `src/app/(authenticated)/shopping/settings/create/page.tsx`

**Interfaces:**
- Consumes: `ShoppingSettingBasicInfoSection`(Task 5), `ShoppingSettingAddressSection`/`ShoppingSettingMallFieldSection`(Task 6), `useGetAvailableMallAccounts`(기존), `useCreateShoppingSetting`(Task 3), `useAlert`
- Produces: `ShoppingSettingForm({ submitLabel, isSubmitting })`, `ShoppingSettingCreateLayout`, 라우트 `/shopping/settings/create` — Task 8이 `ShoppingSettingForm`을 재사용하고, Task 9가 이 라우트로 이동한다.

- [ ] **Step 1: 섹션 조합 컴포넌트 작성**

Create `src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingSettingBasicInfoSection } from './form/ShoppingSettingBasicInfoSection';
import { ShoppingSettingAddressSection } from './form/ShoppingSettingAddressSection';
import { ShoppingSettingMallFieldSection } from './form/ShoppingSettingMallFieldSection';

interface ShoppingSettingFormProps {
  submitLabel: string;
  isSubmitting?: boolean;
}

export const ShoppingSettingForm = ({ submitLabel, isSubmitting }: ShoppingSettingFormProps) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <ShoppingSettingBasicInfoSection />
      <ShoppingSettingAddressSection />
      <ShoppingSettingMallFieldSection />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/shopping/settings')}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 생성 Layout 작성**

Create `src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { useAlert } from '@/hooks/useAlert';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { useCreateShoppingSetting } from '@/features/shoppingSetting/api/useCreateShoppingSetting';
import { ShoppingSetting, CreateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { ShoppingSettingForm } from '../components/ShoppingSettingForm';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const ShoppingSettingCreateLayout = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mallCode = searchParams.get('mallCode') as ShoppingMalls | null;
  const mallId = searchParams.get('mallId');
  const { showAlert } = useAlert();

  const { data: accounts, isLoading: isAccountsLoading } = useGetAvailableMallAccounts();
  const { mutate: createSetting, isPending } = useCreateShoppingSetting();

  const formData = useForm<ShoppingSetting>();
  const matchedAccount = accounts?.find((account) => account.mallCode === mallCode && account.mallId === mallId);

  useEffect(() => {
    if (matchedAccount) {
      formData.reset({
        mallAccountId: matchedAccount.id,
        mallCode: matchedAccount.mallCode,
        mallId: matchedAccount.mallId,
        isActive: true,
      });
    }
  }, [matchedAccount, formData]);

  useEffect(() => {
    if (!isAccountsLoading && accounts && !matchedAccount) {
      showAlert({
        message: '잘못된 접근입니다.',
        type: 'error',
        onConfirm: () => router.push('/shopping/settings'),
      });
    }
  }, [isAccountsLoading, accounts, matchedAccount, router, showAlert]);

  const onSubmit = (data: ShoppingSetting) => {
    if (!matchedAccount) return;
    const body: CreateShoppingSettingBody = {
      mallAccountId: matchedAccount.id,
      mallCode: matchedAccount.mallCode,
      mallId: matchedAccount.mallId,
      nickname: data.nickname,
      isActive: true,
      productCondition: data.productCondition,
      salesPeriod: data.salesPeriod,
      shippingAddress: data.shippingAddress,
      returnAddress: data.returnAddress,
    };
    createSetting(body, {
      onSuccess: () => {
        showAlert({
          message: '설정이 등록되었습니다.',
          type: 'success',
          onConfirm: () => router.push('/shopping/settings'),
        });
      },
    });
  };

  if (isAccountsLoading || !matchedAccount) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 정보설정 등록</h1>
        <p className="text-muted-foreground">
          {getMallName(matchedAccount.mallCode)} · {matchedAccount.mallId}
        </p>
      </div>
      <FormProvider {...formData}>
        <form onSubmit={formData.handleSubmit(onSubmit)}>
          <ShoppingSettingForm submitLabel="등록" isSubmitting={isPending} />
        </form>
      </FormProvider>
    </div>
  );
};
```

- [ ] **Step 3: 생성 라우트 작성**

Create `src/app/(authenticated)/shopping/settings/create/page.tsx`:

```tsx
import { Suspense } from 'react';
import { ShoppingSettingCreateLayout } from '@/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout';

export default function ShoppingSettingCreatePage() {
  return (
    // useSearchParams를 쓰는 클라이언트 컴포넌트는 Next.js 빌드 요구사항상 Suspense로 감싸야 한다
    <Suspense
      fallback={<div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>}
    >
      <ShoppingSettingCreateLayout />
    </Suspense>
  );
}
```

- [ ] **Step 4: lint + build 확인**

Run: `npm run lint`
Expected: 에러 없음

Run: `npm run build`
Expected: 빌드 성공, `useSearchParams` 관련 Suspense 경고 없음

- [ ] **Step 5: 수동 브라우저 확인**

Run: `npm run dev`
- `/shopping/settings` 접속 → "신규추가" 모달 오픈 → 계정 행의 "등록" 클릭(Task 9 완료 전이면 이 스텝은 URL 직접 접근으로 대체: `/shopping/settings/create?mallCode=COUP&mallId=coupang_seller_001`)
- 상단에 "쿠팡 · coupang_seller_001" 컨텍스트 표시 확인
- 필수값 미입력 상태로 "등록" 클릭 → 별칭/상품상태/판매기간/출고지/반품지 에러 메시지 노출 확인
- 출고지 선택 버튼 클릭 → 모달에서 라디오 선택 → 적용 → 화면에 선택값 표시 확인
- 모든 필드 입력 후 등록 → 성공 alert → `/shopping/settings` 리스트에 새 행 반영 확인

Expected: 위 시나리오 모두 정상 동작

- [ ] **Step 6: Commit**

```bash
git add src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx "src/app/(authenticated)/shopping/settings/create/page.tsx"
git commit -m "feat: 쇼핑몰 정보설정 생성 화면 추가"
```

---

### Task 8: ShoppingSettingModifyLayout + 수정 라우트

**Files:**
- Create: `src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx`
- Create: `src/app/(authenticated)/shopping/settings/[id]/page.tsx`

**Interfaces:**
- Consumes: `ShoppingSettingForm`(Task 7), `useGetShoppingSetting`, `useUpdateShoppingSetting`(Task 3)
- Produces: `ShoppingSettingModifyLayout({ id })`, 라우트 `/shopping/settings/[id]` — Task 9가 이 라우트로 이동한다.

- [ ] **Step 1: 수정 Layout 작성**

Create `src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { useAlert } from '@/hooks/useAlert';
import { useGetShoppingSetting } from '@/features/shoppingSetting/api/useGetShoppingSetting';
import { useUpdateShoppingSetting } from '@/features/shoppingSetting/api/useUpdateShoppingSetting';
import { ShoppingSetting, UpdateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { ShoppingSettingForm } from '../components/ShoppingSettingForm';

interface Props {
  id: string;
}

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const ShoppingSettingModifyLayout = ({ id }: Props) => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { data: setting, isLoading } = useGetShoppingSetting(id);
  const { mutate: updateSetting, isPending } = useUpdateShoppingSetting(id);

  const formData = useForm<ShoppingSetting>();

  useEffect(() => {
    if (setting) {
      formData.reset(setting);
    }
  }, [setting, formData]);

  const onSubmit = (data: ShoppingSetting) => {
    const body: UpdateShoppingSettingBody = {
      nickname: data.nickname,
      productCondition: data.productCondition,
      salesPeriod: data.salesPeriod,
      shippingAddress: data.shippingAddress,
      returnAddress: data.returnAddress,
    };
    updateSetting(body, {
      onSuccess: () => {
        showAlert({
          message: '설정이 수정되었습니다.',
          type: 'success',
          onConfirm: () => router.push('/shopping/settings'),
        });
      },
    });
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  if (!setting) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">설정을 찾을 수 없습니다.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 정보설정 수정</h1>
        <p className="text-muted-foreground">
          {getMallName(setting.mallCode)} · {setting.mallId}
        </p>
      </div>
      <FormProvider {...formData}>
        <form onSubmit={formData.handleSubmit(onSubmit)}>
          <ShoppingSettingForm submitLabel="저장" isSubmitting={isPending} />
        </form>
      </FormProvider>
    </div>
  );
};
```

- [ ] **Step 2: 수정 라우트 작성**

Create `src/app/(authenticated)/shopping/settings/[id]/page.tsx`:

```tsx
import { ShoppingSettingModifyLayout } from '@/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShoppingSettingModifyPage({ params }: Props) {
  const { id } = await params;
  return <ShoppingSettingModifyLayout id={id} />;
}
```

- [ ] **Step 3: lint + build 확인**

Run: `npm run lint`
Expected: 에러 없음

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 4: 수동 브라우저 확인**

Run: `npm run dev`
- `/shopping/settings/ss_001` 직접 접속 (Task 1에서 갱신한 mock 데이터 id) → 기존 값(별칭/상품상태/판매기간/출고지/반품지)이 폼에 채워지는지 확인
- 값 변경 후 "저장" 클릭 → 성공 alert → 리스트에 반영 확인
- 존재하지 않는 id(`/shopping/settings/ss_999`) 접속 → "설정을 찾을 수 없습니다" 표시 확인

Expected: 위 시나리오 모두 정상 동작

- [ ] **Step 5: Commit**

```bash
git add "src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx" "src/app/(authenticated)/shopping/settings/[id]/page.tsx"
git commit -m "feat: 쇼핑몰 정보설정 수정 화면 추가"
```

---

### Task 9: 리스트 화면 진입점 연결

**Files:**
- Modify: `src/features/shoppingSetting/ui/list/components/NewSettingModal.tsx`
- Modify: `src/features/shoppingSetting/ui/list/components/ShoppingSettingTable.tsx`

**Interfaces:**
- Consumes: `/shopping/settings/create`(Task 7), `/shopping/settings/[id]`(Task 8)
- Produces: 리스트 화면의 "등록"/"수정" 버튼이 실제 라우트로 이동 — 이 Task가 마지막이며 이후 소비자 없음.

- [ ] **Step 1: NewSettingModal "등록" 버튼 연결**

`src/features/shoppingSetting/ui/list/components/NewSettingModal.tsx` 수정. `useRouter` import 추가, `handleRegister`를 계정별 이동 함수로 교체, 버튼 `onClick`을 계정 인자와 함께 호출하도록 변경:

```tsx
'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isNewSettingModalOpenAtom } from '@/features/shoppingSetting/store/search.store';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { AvailableMallAccount } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const NewSettingModal = () => {
  const [open, setOpen] = useAtom(isNewSettingModalOpenAtom);
  const { data: accounts = [], isLoading } = useGetAvailableMallAccounts();
  const router = useRouter();

  const handleRegister = (account: AvailableMallAccount) => {
    setOpen(false);
    router.push(
      `/shopping/settings/create?mallCode=${account.mallCode}&mallId=${encodeURIComponent(account.mallId)}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>쇼핑몰 정보설정 추가</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
                <TableHead className="text-center font-bold uppercase tracking-widest">쇼핑몰</TableHead>
                <TableHead className="text-center font-bold uppercase tracking-widest">아이디</TableHead>
                <TableHead className="text-center font-bold uppercase tracking-widest">설정현황</TableHead>
                <TableHead className="text-center font-bold uppercase tracking-widest">등록</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                    등록된 쇼핑몰계정이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <TableCell className="text-center">{getMallName(account.mallCode)}</TableCell>
                    <TableCell className="text-center">{account.mallId}</TableCell>
                    <TableCell className="text-center">
                      {account.settingCount > 0 ? `이미 ${account.settingCount}건 설정됨` : '미설정'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" onClick={() => handleRegister(account)}>
                        등록
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: 테이블 "수정" 버튼 연결**

`src/features/shoppingSetting/ui/list/components/ShoppingSettingTable.tsx` 수정. `useRouter` import 추가, "수정" 버튼의 `onClick`을 `notReady`에서 라우트 이동으로 교체(복사 버튼은 범위 외이므로 `notReady` 유지):

```tsx
'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { selectedSettingsAtom } from '@/features/shoppingSetting/store/search.store';
import { SHOPPING_SETTING_TABLE_HEAD } from '@/features/shoppingSetting/constant/shoppingSetting.constants';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { useAlert } from '@/hooks/useAlert';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

interface ShoppingSettingTableProps {
  settings: ShoppingSetting[];
}

export const ShoppingSettingTable = ({ settings }: ShoppingSettingTableProps) => {
  const [selectedSettings, setSelectedSettings] = useAtom(selectedSettingsAtom);
  const { showAlert } = useAlert();
  const router = useRouter();

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSettings((prev) => [...prev, id]);
    } else {
      setSelectedSettings((prev) => prev.filter((v) => v !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedSettings(checked ? settings.map((s) => s.id) : []);
  };

  const notReady = () => showAlert({ message: '준비중인 기능입니다.', type: 'info' });

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
          <TableHead className="w-12">
            <Checkbox
              checked={settings.length > 0 && selectedSettings.length === settings.length}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {SHOPPING_SETTING_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className="text-center font-bold uppercase tracking-widest">
              {item.title}
            </TableHead>
          ))}
          <TableHead className="text-center font-bold uppercase tracking-widest">수정</TableHead>
          <TableHead className="text-center font-bold uppercase tracking-widest">복사</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {settings.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={SHOPPING_SETTING_TABLE_HEAD.length + 3}
              className="h-40 text-center text-muted-foreground text-sm"
            >
              조건에 맞는 설정이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          settings.map((setting) => (
            <TableRow
              key={setting.id}
              className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
            >
              <TableCell>
                <Checkbox
                  checked={selectedSettings.includes(setting.id)}
                  onCheckedChange={(checked: boolean) => handleSelect(setting.id, checked)}
                />
              </TableCell>
              <TableCell className="text-center">{getMallName(setting.mallCode)}</TableCell>
              <TableCell className="text-center">{setting.mallId}</TableCell>
              <TableCell className="text-left">{setting.nickname || '-'}</TableCell>
              <TableCell className="text-center">
                <Badge variant={setting.isActive ? 'default' : 'secondary'}>
                  {setting.isActive ? '사용' : '미사용'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{setting.createdAt}</TableCell>
              <TableCell className="text-center">{setting.updatedAt}</TableCell>
              <TableCell className="text-center">
                <Button variant="outline" size="sm" onClick={() => router.push(`/shopping/settings/${setting.id}`)}>
                  수정
                </Button>
              </TableCell>
              <TableCell className="text-center">
                <Button variant="outline" size="sm" onClick={notReady}>
                  복사
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
```

- [ ] **Step 3: lint 확인**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 전체 회귀 확인 (수동)**

Run: `npm run dev`
- `/shopping/settings` → "신규추가" → 계정 행 "등록" 클릭 → 생성 화면으로 정상 이동(쿼리파라미터 `mallCode`/`mallId` 확인)
- 리스트 테이블의 "수정" 버튼 클릭 → 해당 행의 수정 화면으로 정상 이동
- "복사" 버튼은 여전히 "준비중인 기능입니다" alert 노출 확인(범위 외 유지)

Expected: 두 진입점 모두 정상 라우팅, 복사 버튼은 기존 동작 유지

- [ ] **Step 5: 전체 테스트 스위트 확인**

Run: `npx vitest run`
Expected: 모든 테스트 PASS (기존 테스트 + 이번 작업에서 추가한 4개 mocks/utils 테스트 파일)

- [ ] **Step 6: Commit**

```bash
git add src/features/shoppingSetting/ui/list/components/NewSettingModal.tsx src/features/shoppingSetting/ui/list/components/ShoppingSettingTable.tsx
git commit -m "feat: 정보설정 리스트의 등록/수정 버튼을 입력 화면으로 연결"
```
