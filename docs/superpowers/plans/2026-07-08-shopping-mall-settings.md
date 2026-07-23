# 쇼핑몰 정보설정 (리스트 화면) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/shopping/settings` 경로에 쇼핑몰별 설정(특수필드/배송지 등) 목록을 검색·조회·일괄 상태변경·삭제할 수 있는 리스트 화면을 신규 구축한다.

**Architecture:** 기존 `src/features/shoppingAccount` feature와 동일한 계층 패턴(types/constant/store/api/ui)을 `src/features/shoppingSetting`에 그대로 복제한다. 서버 데이터는 MSW(`src/mocks/handlers/shoppingSettings.ts` + `src/mocks/utils/`)가 가로채며, 화면은 `HeaderSection → SearchFilterSection → ActionSection → TableSection` 4단 레이아웃 + 신규추가 모달로 구성한다.

**Tech Stack:** Next.js 15 App Router, Jotai, TanStack Query, MSW, Vitest, Tailwind + shadcn/ui.

## Global Constraints

- 참조 스펙: `docs/superpowers/specs/2026-07-08-shopping-mall-settings-design.md`
- 이번 플랜 범위는 **리스트 화면까지**다. 신규추가 모달의 "등록" 버튼, 테이블의 "수정"/"복사" 버튼, "정보일괄설정"(쇼핑몰 단일성 검증 통과 시)은 모두 공통 `showAlert({ type: 'info', message: '준비중인 기능입니다.' })`로 처리하고 실제 상세 기능은 구현하지 않는다.
- Prettier: `printWidth: 120`, `singleQuote: true`, `trailingComma: 'all'`, `semi: true`.
- 이 프로젝트의 `vitest.config.ts`는 `environment: 'node'`이며 jsdom/React Testing Library가 설치되어 있지 않다. 따라서 자동화 테스트는 순수 로직(mock 유틸)에만 작성한다 (기존 `src/mocks/utils/getOrders.test.ts`가 유일한 선례). UI 컴포넌트 작업은 실패 테스트 단계 대신 `npm run lint`로 검증한다.
- 폰트 크기·색상은 변경하지 않는다.
- **커밋 스텝 관련:** 이 프로젝트 CLAUDE.md 규칙상 `git add`/`git commit` 등은 사용자가 명시적으로 요청할 때만 실행한다. 아래 각 Task의 "커밋" 스텝은 무엇을 커밋해야 하는지 안내하는 것이며, 실행자는 실제 git 명령을 사용자 승인 없이 자동 실행하지 않는다.
- 신규 API 엔드포인트는 모두 MSW 핸들러로만 구현하고 `src/app/api/.../route.ts` 파일은 생성하지 않는다 (msw-rules.md).

---

### Task 1: 타입 정의 + 상수

**Files:**
- Create: `src/features/shoppingSetting/types/shoppingSetting.types.ts`
- Create: `src/features/shoppingSetting/constant/shoppingSetting.constants.ts`

**Interfaces:**
- Produces: `ShoppingSetting`, `ShoppingSettingSearchType`, `GetShoppingSettingsResponse`, `AvailableMallAccount` 타입. `SETTING_DATE_TYPE`, `SETTING_STATUS_OPTIONS`, `SETTING_MALL_NAME_OPTIONS`, `ALL_SETTING_MALL_NAME`, `SHOPPING_SETTING_TABLE_HEAD` 상수 — 이후 모든 Task가 이 이름을 그대로 참조한다.

이 Task는 선언만 하는 작업이라 실패 테스트 사이클이 적용되지 않는다. 파일 작성 후 타입 체크로 검증한다.

- [ ] **Step 1: 타입 파일 작성**

```ts
// src/features/shoppingSetting/types/shoppingSetting.types.ts
import { ShoppingMalls } from '@/types/common.type';

export interface ShoppingSetting {
  id: string;
  mallAccountId: string; // 참조: ShoppingAccount.id
  mallCode: ShoppingMalls;
  mallId: string;
  nickname: string;
  isActive: boolean;
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
```

- [ ] **Step 2: 상수 파일 작성**

```ts
// src/features/shoppingSetting/constant/shoppingSetting.constants.ts
import { FilterOption, TableTitleValue } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

export const SETTING_DATE_TYPE: FilterOption[] = [
  { id: 'createdAt', name: '등록일' },
  { id: 'updatedAt', name: '수정일' },
];

export const SETTING_STATUS_OPTIONS: FilterOption[] = [
  { id: 'true', name: '사용중' },
  { id: 'false', name: '사용안함' },
];

export const SETTING_MALL_NAME_OPTIONS: FilterOption[] = SHOPPING_MALLS.map((mall) => ({
  id: mall.code,
  name: mall.name,
}));

export const ALL_SETTING_MALL_NAME: FilterOption = { id: 'ALL', name: '전체' };

export const SHOPPING_SETTING_TABLE_HEAD: TableTitleValue[] = [
  { id: 'mallCode', title: '쇼핑몰' },
  { id: 'mallId', title: '아이디' },
  { id: 'nickname', title: '별칭' },
  { id: 'isActive', title: '사용여부' },
  { id: 'createdAt', title: '등록일' },
  { id: 'updatedAt', title: '수정일' },
];
```

- [ ] **Step 3: 타입 체크로 검증**

Run: `npx tsc --noEmit`
Expected: 이 두 파일과 관련된 에러 없음 (다른 미완성 참조로 인한 에러는 이후 Task에서 해소됨)

- [ ] **Step 4: 커밋**

```bash
git add src/features/shoppingSetting/types/shoppingSetting.types.ts src/features/shoppingSetting/constant/shoppingSetting.constants.ts
git commit -m "feat: 쇼핑몰 정보설정 타입/상수 정의"
```

---

### Task 2: Mock 데이터 + 목록 조회 로직

**Files:**
- Create: `src/mocks/data/MockShoppingSettingsData.ts`
- Create: `src/mocks/utils/getShoppingSettings.ts`
- Test: `src/mocks/utils/getShoppingSettings.test.ts`

**Interfaces:**
- Consumes: `ShoppingSetting`, `ShoppingSettingSearchType`, `GetShoppingSettingsResponse` (Task 1)
- Produces: `MOCK_SHOPPING_SETTINGS_DATA: ShoppingSetting[]`, `getMockShoppingSettings(ownerId: string, filters: ShoppingSettingSearchType, page: number, pageSize: number): GetShoppingSettingsResponse` — Task 5(핸들러)가 이 함수를 그대로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/mocks/utils/getShoppingSettings.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { ShoppingSetting, ShoppingSettingSearchType } from '@/features/shoppingSetting/types/shoppingSetting.types';

const { SETTINGS } = vi.hoisted(() => {
  const makeSetting = (overrides: Partial<ShoppingSetting>): ShoppingSetting => ({
    id: 'ss_001',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '기본 설정',
    isActive: true,
    ownerId: 'usr_001',
    createdAt: '2025-05-01',
    updatedAt: '2025-05-01',
    ...overrides,
  });

  return {
    SETTINGS: [
      makeSetting({ id: 'ss_001', mallAccountId: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡 메인', createdAt: '2025-05-01', updatedAt: '2025-05-01' }),
      makeSetting({ id: 'ss_002', mallAccountId: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡 프로모션', createdAt: '2025-05-10', updatedAt: '2025-05-12' }),
      makeSetting({ id: 'ss_003', mallAccountId: 'sa_002', mallCode: 'NSST', mallId: 'naver_store_002', nickname: '네이버 기본', createdAt: '2025-05-15', updatedAt: '2025-05-15' }),
      makeSetting({ id: 'ss_004', mallAccountId: 'sa_006', mallCode: 'COUP', mallId: 'coupang_seller_006', nickname: '쿠팡 B', ownerId: 'usr_005', createdAt: '2025-05-25', updatedAt: '2025-05-25' }),
    ],
  };
});

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { getMockShoppingSettings } from './getShoppingSettings';

const defaultFilters: ShoppingSettingSearchType = {
  dateType: 'createdAt',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  mallCode: 'ALL',
  mallAccountId: 'ALL',
  searchValue: '',
};

describe('getMockShoppingSettings', () => {
  it('ownerId가 일치하는 설정만 반환한다', () => {
    const result = getMockShoppingSettings('usr_001', defaultFilters, 1, 10);
    expect(result.total).toBe(3);
    result.settings.forEach((s) => expect(s.ownerId).toBe('usr_001'));
  });

  it("mallCode 'COUP'만 필터링하면 2건을 반환한다", () => {
    const result = getMockShoppingSettings('usr_001', { ...defaultFilters, mallCode: 'COUP' }, 1, 10);
    expect(result.total).toBe(2);
  });

  it('mallAccountId로 필터링하면 해당 계정 설정만 반환한다', () => {
    const result = getMockShoppingSettings('usr_001', { ...defaultFilters, mallAccountId: 'sa_002' }, 1, 10);
    expect(result.total).toBe(1);
    expect(result.settings[0].id).toBe('ss_003');
  });

  it('searchValue가 별칭에 포함되면 매칭된다', () => {
    const result = getMockShoppingSettings('usr_001', { ...defaultFilters, searchValue: '프로모션' }, 1, 10);
    expect(result.total).toBe(1);
    expect(result.settings[0].id).toBe('ss_002');
  });

  it('날짜 범위 밖이면 제외된다', () => {
    const result = getMockShoppingSettings(
      'usr_001',
      { ...defaultFilters, startDate: '2025-05-11', endDate: '2025-05-31' },
      1,
      10,
    );
    expect(result.total).toBe(1);
    expect(result.settings[0].id).toBe('ss_003');
  });

  it('결과가 0개면 totalPages가 1이다', () => {
    const result = getMockShoppingSettings('usr_001', { ...defaultFilters, mallAccountId: 'sa_999' }, 1, 10);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run src/mocks/utils/getShoppingSettings.test.ts`
Expected: FAIL — `Cannot find module './getShoppingSettings'`

- [ ] **Step 3: Mock 데이터 작성**

```ts
// src/mocks/data/MockShoppingSettingsData.ts
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const MOCK_SHOPPING_SETTINGS_DATA: ShoppingSetting[] = [
  {
    id: 'ss_001',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '쿠팡 메인 설정',
    isActive: true,
    ownerId: 'usr_001',
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
    ownerId: 'usr_001',
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
    ownerId: 'usr_001',
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
    ownerId: 'usr_001',
    createdAt: '2025-05-20',
    updatedAt: '2025-05-22',
  },
  {
    id: 'ss_005',
    mallAccountId: 'sa_006',
    mallCode: 'COUP',
    mallId: 'coupang_seller_006',
    nickname: '쿠팡 B계정 설정',
    isActive: true,
    ownerId: 'usr_005',
    createdAt: '2025-05-25',
    updatedAt: '2025-05-25',
  },
];
```

- [ ] **Step 4: 목록 조회 로직 구현**

```ts
// src/mocks/utils/getShoppingSettings.ts
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import {
  GetShoppingSettingsResponse,
  ShoppingSettingSearchType,
} from '@/features/shoppingSetting/types/shoppingSetting.types';

dayjs.extend(isBetween);

export const getMockShoppingSettings = (
  ownerId: string,
  filters: ShoppingSettingSearchType,
  page: number,
  pageSize: number,
): GetShoppingSettingsResponse => {
  const { dateType, startDate, endDate, mallCode, mallAccountId, searchValue } = filters;

  const filtered = MOCK_SHOPPING_SETTINGS_DATA.filter((setting) => {
    if (setting.ownerId !== ownerId) return false;
    const dateValue = dateType === 'createdAt' ? setting.createdAt : setting.updatedAt;
    if (!dayjs(dateValue).isBetween(startDate, endDate, 'day', '[]')) return false;
    if (mallCode !== 'ALL' && setting.mallCode !== mallCode) return false;
    if (mallAccountId !== 'ALL' && setting.mallAccountId !== mallAccountId) return false;
    if (searchValue) {
      const keyword = searchValue.toLowerCase();
      const matches =
        setting.mallId.toLowerCase().includes(keyword) || setting.nickname.toLowerCase().includes(keyword);
      if (!matches) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const settings = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { settings, total, page, pageSize, totalPages };
};
```

- [ ] **Step 5: 테스트 실행하여 통과 확인**

Run: `npx vitest run src/mocks/utils/getShoppingSettings.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/mocks/data/MockShoppingSettingsData.ts src/mocks/utils/getShoppingSettings.ts src/mocks/utils/getShoppingSettings.test.ts
git commit -m "feat: 쇼핑몰 정보설정 mock 데이터 및 목록 조회 로직 추가"
```

---

### Task 3: 사용여부 일괄변경 / 삭제 로직

**Files:**
- Create: `src/mocks/utils/updateShoppingSettingsStatus.ts`
- Test: `src/mocks/utils/updateShoppingSettingsStatus.test.ts`
- Create: `src/mocks/utils/deleteShoppingSettings.ts`
- Test: `src/mocks/utils/deleteShoppingSettings.test.ts`

**Interfaces:**
- Consumes: `MOCK_SHOPPING_SETTINGS_DATA` (Task 2)
- Produces: `updateMockShoppingSettingsStatus(ids: string[], isActive: boolean): void`, `deleteMockShoppingSettings(ids: string[]): void` — Task 5(핸들러)가 그대로 호출한다.

- [ ] **Step 1: 상태변경 실패 테스트 작성**

```ts
// src/mocks/utils/updateShoppingSettingsStatus.test.ts
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
      ownerId: 'usr_001',
      createdAt: '2025-05-01',
      updatedAt: '2025-05-01',
    },
    {
      id: 'ss_002',
      mallAccountId: 'sa_002',
      mallCode: 'NSST',
      mallId: 'naver_store_002',
      nickname: '네이버',
      isActive: true,
      ownerId: 'usr_001',
      createdAt: '2025-05-15',
      updatedAt: '2025-05-15',
    },
  ] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { updateMockShoppingSettingsStatus } from './updateShoppingSettingsStatus';

describe('updateMockShoppingSettingsStatus', () => {
  it('지정한 id들의 isActive를 변경한다', () => {
    updateMockShoppingSettingsStatus(['ss_001'], false);
    expect(SETTINGS.find((s) => s.id === 'ss_001')?.isActive).toBe(false);
  });

  it('updatedAt을 오늘 날짜로 갱신한다', () => {
    const today = new Date().toISOString().slice(0, 10);
    updateMockShoppingSettingsStatus(['ss_002'], false);
    expect(SETTINGS.find((s) => s.id === 'ss_002')?.updatedAt).toBe(today);
  });

  it('존재하지 않는 id는 무시한다', () => {
    expect(() => updateMockShoppingSettingsStatus(['ss_999'], true)).not.toThrow();
  });
});
```

- [ ] **Step 2: 실행하여 실패 확인**

Run: `npx vitest run src/mocks/utils/updateShoppingSettingsStatus.test.ts`
Expected: FAIL — `Cannot find module './updateShoppingSettingsStatus'`

- [ ] **Step 3: 상태변경 로직 구현**

```ts
// src/mocks/utils/updateShoppingSettingsStatus.ts
import dayjs from 'dayjs';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';

export const updateMockShoppingSettingsStatus = (ids: string[], isActive: boolean): void => {
  const now = dayjs().format('YYYY-MM-DD');
  ids.forEach((id) => {
    const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === id);
    if (setting) {
      setting.isActive = isActive;
      setting.updatedAt = now;
    }
  });
};
```

- [ ] **Step 4: 실행하여 통과 확인**

Run: `npx vitest run src/mocks/utils/updateShoppingSettingsStatus.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 삭제 실패 테스트 작성**

```ts
// src/mocks/utils/deleteShoppingSettings.test.ts
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
      ownerId: 'usr_001',
      createdAt: '2025-05-01',
      updatedAt: '2025-05-01',
    },
    {
      id: 'ss_002',
      mallAccountId: 'sa_002',
      mallCode: 'NSST',
      mallId: 'naver_store_002',
      nickname: '네이버',
      isActive: true,
      ownerId: 'usr_001',
      createdAt: '2025-05-15',
      updatedAt: '2025-05-15',
    },
  ] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingSettingsData', () => ({
  MOCK_SHOPPING_SETTINGS_DATA: SETTINGS,
}));

import { deleteMockShoppingSettings } from './deleteShoppingSettings';

describe('deleteMockShoppingSettings', () => {
  it('지정한 id를 목록에서 제거한다', () => {
    deleteMockShoppingSettings(['ss_001']);
    expect(SETTINGS.find((s) => s.id === 'ss_001')).toBeUndefined();
    expect(SETTINGS).toHaveLength(1);
  });

  it('존재하지 않는 id는 무시한다', () => {
    expect(() => deleteMockShoppingSettings(['ss_999'])).not.toThrow();
  });
});
```

- [ ] **Step 6: 실행하여 실패 확인**

Run: `npx vitest run src/mocks/utils/deleteShoppingSettings.test.ts`
Expected: FAIL — `Cannot find module './deleteShoppingSettings'`

- [ ] **Step 7: 삭제 로직 구현**

```ts
// src/mocks/utils/deleteShoppingSettings.ts
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';

export const deleteMockShoppingSettings = (ids: string[]): void => {
  ids.forEach((id) => {
    const index = MOCK_SHOPPING_SETTINGS_DATA.findIndex((s) => s.id === id);
    if (index !== -1) MOCK_SHOPPING_SETTINGS_DATA.splice(index, 1);
  });
};
```

- [ ] **Step 8: 실행하여 통과 확인**

Run: `npx vitest run src/mocks/utils/deleteShoppingSettings.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: 커밋**

```bash
git add src/mocks/utils/updateShoppingSettingsStatus.ts src/mocks/utils/updateShoppingSettingsStatus.test.ts src/mocks/utils/deleteShoppingSettings.ts src/mocks/utils/deleteShoppingSettings.test.ts
git commit -m "feat: 쇼핑몰 정보설정 상태변경/삭제 로직 추가"
```

---

### Task 4: 등록 가능 쇼핑몰계정 조회 로직 (신규추가 모달용)

**Files:**
- Create: `src/mocks/utils/getAvailableMallAccounts.ts`
- Test: `src/mocks/utils/getAvailableMallAccounts.test.ts`

**Interfaces:**
- Consumes: `MOCK_SHOPPING_ACCOUNTS_DATA` (기존), `MOCK_SHOPPING_SETTINGS_DATA` (Task 2), `AvailableMallAccount` (Task 1)
- Produces: `getMockAvailableMallAccounts(ownerId: string): AvailableMallAccount[]` — Task 5(핸들러)와 Task 7(신규추가 모달, 쇼핑몰아이디 필터)이 함께 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/mocks/utils/getAvailableMallAccounts.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

const makeAccount = (overrides: Partial<ShoppingAccount>): ShoppingAccount => ({
  id: 'sa_001',
  ownerId: 'usr_001',
  mallCode: 'COUP',
  mallId: 'coupang_seller_001',
  password: 'pass',
  isActive: true,
  nickname: '',
  managerMd: '',
  phone: '',
  email: '',
  domain: '',
  category: '',
  apiKey: '',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  ...overrides,
});

const { ACCOUNTS, SETTINGS } = vi.hoisted(() => ({
  ACCOUNTS: [] as ShoppingAccount[],
  SETTINGS: [] as ShoppingSetting[],
}));

vi.mock('../data/MockShoppingAccountsData', () => ({ MOCK_SHOPPING_ACCOUNTS_DATA: ACCOUNTS }));
vi.mock('../data/MockShoppingSettingsData', () => ({ MOCK_SHOPPING_SETTINGS_DATA: SETTINGS }));

ACCOUNTS.push(
  makeAccount({ id: 'sa_001', ownerId: 'usr_001', mallCode: 'COUP', mallId: 'coupang_seller_001' }),
  makeAccount({ id: 'sa_002', ownerId: 'usr_001', mallCode: 'NSST', mallId: 'naver_store_002' }),
  makeAccount({ id: 'sa_006', ownerId: 'usr_005', mallCode: 'COUP', mallId: 'coupang_seller_006' }),
);
SETTINGS.push(
  { id: 'ss_001', mallAccountId: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡1', isActive: true, ownerId: 'usr_001', createdAt: '2025-05-01', updatedAt: '2025-05-01' },
  { id: 'ss_002', mallAccountId: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001', nickname: '쿠팡2', isActive: true, ownerId: 'usr_001', createdAt: '2025-05-02', updatedAt: '2025-05-02' },
);

import { getMockAvailableMallAccounts } from './getAvailableMallAccounts';

describe('getMockAvailableMallAccounts', () => {
  it('ownerId가 일치하는 계정만 반환한다', () => {
    const result = getMockAvailableMallAccounts('usr_001');
    expect(result).toHaveLength(2);
  });

  it('설정 건수를 정확히 집계한다', () => {
    const result = getMockAvailableMallAccounts('usr_001');
    expect(result.find((a) => a.id === 'sa_001')?.settingCount).toBe(2);
    expect(result.find((a) => a.id === 'sa_002')?.settingCount).toBe(0);
  });

  it('다른 owner의 계정은 제외한다', () => {
    const result = getMockAvailableMallAccounts('usr_001');
    expect(result.find((a) => a.id === 'sa_006')).toBeUndefined();
  });
});
```

- [ ] **Step 2: 실행하여 실패 확인**

Run: `npx vitest run src/mocks/utils/getAvailableMallAccounts.test.ts`
Expected: FAIL — `Cannot find module './getAvailableMallAccounts'`

- [ ] **Step 3: 로직 구현**

```ts
// src/mocks/utils/getAvailableMallAccounts.ts
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { AvailableMallAccount } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const getMockAvailableMallAccounts = (ownerId: string): AvailableMallAccount[] => {
  return MOCK_SHOPPING_ACCOUNTS_DATA.filter((account) => account.ownerId === ownerId).map((account) => ({
    id: account.id,
    mallCode: account.mallCode,
    mallId: account.mallId,
    settingCount: MOCK_SHOPPING_SETTINGS_DATA.filter((s) => s.mallAccountId === account.id).length,
  }));
};
```

- [ ] **Step 4: 실행하여 통과 확인**

Run: `npx vitest run src/mocks/utils/getAvailableMallAccounts.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/mocks/utils/getAvailableMallAccounts.ts src/mocks/utils/getAvailableMallAccounts.test.ts
git commit -m "feat: 등록 가능 쇼핑몰계정 조회 로직 추가"
```

---

### Task 5: MSW 핸들러 등록

**Files:**
- Create: `src/mocks/handlers/shoppingSettings.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**
- Consumes: `getMockShoppingSettings`, `updateMockShoppingSettingsStatus`, `deleteMockShoppingSettings` (Task 2, 3), `getMockAvailableMallAccounts` (Task 4)
- Produces: `POST /api/shopping/settings/list`, `PATCH /api/shopping/settings/status`, `POST /api/shopping/settings/delete`, `POST /api/shopping/settings/available-accounts` 엔드포인트 — Task 7(API 함수)이 그대로 호출한다.

이 Task는 MSW 배선 작업으로, 기존 `shoppingAccounts.ts` 핸들러도 자동화 테스트가 없다 (선례 없음). 구현 후 타입 체크로 검증한다.

- [ ] **Step 1: 핸들러 파일 작성**

```ts
// src/mocks/handlers/shoppingSettings.ts
import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { ShoppingSettingSearchType } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { getMockShoppingSettings } from '../utils/getShoppingSettings';
import { updateMockShoppingSettingsStatus } from '../utils/updateShoppingSettingsStatus';
import { deleteMockShoppingSettings } from '../utils/deleteShoppingSettings';
import { getMockAvailableMallAccounts } from '../utils/getAvailableMallAccounts';

export const shoppingSettingHandlers = [
  http.post(`${baseUrl}/api/shopping/settings/list`, async ({ request }) => {
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: ShoppingSettingSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockShoppingSettings(ownerId, filters, page, pageSize));
  }),

  http.patch(`${baseUrl}/api/shopping/settings/status`, async ({ request }) => {
    const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
    updateMockShoppingSettingsStatus(ids, isActive);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${baseUrl}/api/shopping/settings/delete`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockShoppingSettings(ids);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${baseUrl}/api/shopping/settings/available-accounts`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    return HttpResponse.json(getMockAvailableMallAccounts(ownerId));
  }),
];
```

- [ ] **Step 2: 인덱스에 등록**

`src/mocks/handlers.ts` 전체를 다음으로 교체:

```ts
import { authHandlers } from './handlers/auth';
import { homeHandlers } from './handlers/home';
import { productHandlers } from './handlers/products';
import { orderHandlers } from './handlers/orders';
import { mallAccountHandlers } from './handlers/mallAccounts';
import { collectionHandlers } from './handlers/collection';
import { shoppingAccountHandlers } from './handlers/shoppingAccounts';
import { shoppingSettingHandlers } from './handlers/shoppingSettings';

export const handlers = [
  ...authHandlers,
  ...homeHandlers,
  ...productHandlers,
  ...orderHandlers,
  ...mallAccountHandlers,
  ...collectionHandlers,
  ...shoppingAccountHandlers,
  ...shoppingSettingHandlers,
];
```

- [ ] **Step 3: 타입 체크로 검증**

Run: `npx tsc --noEmit`
Expected: `src/mocks/handlers/shoppingSettings.ts`, `src/mocks/handlers.ts` 관련 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/mocks/handlers/shoppingSettings.ts src/mocks/handlers.ts
git commit -m "feat: 쇼핑몰 정보설정 MSW 핸들러 등록"
```

---

### Task 6: Jotai Store

**Files:**
- Create: `src/features/shoppingSetting/store/search.store.ts`

**Interfaces:**
- Consumes: `ShoppingSettingSearchType` (Task 1)
- Produces: `currentPageAtom`, `selectedSettingsAtom`, `settingDateTypeAtom`, `settingStartDateAtom`, `settingEndDateAtom`, `settingMallCodeAtom`, `settingMallAccountIdAtom`, `settingSearchValueAtom`, `getSettingSearchFilterAtom`, `committedFiltersAtom`, `setSettingMallCodeAtom`, `isNewSettingModalOpenAtom` — Task 7, 8, 9, 10, 11이 이 이름들을 그대로 import한다.

- [ ] **Step 1: Store 작성**

```ts
// src/features/shoppingSetting/store/search.store.ts
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { ShoppingSettingSearchType } from '../types/shoppingSetting.types';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const currentPageAtom = atom<number>(1);
export const selectedSettingsAtom = atom<string[]>([]);

export const settingDateTypeAtom = atom<'createdAt' | 'updatedAt'>(DEFAULT_DATE_TYPE);
export const settingStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const settingEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const settingMallCodeAtom = atom<string>('ALL');
export const settingMallAccountIdAtom = atom<string>('ALL');
export const settingSearchValueAtom = atom<string>('');

export const getSettingSearchFilterAtom = atom<ShoppingSettingSearchType>((get) => ({
  dateType: get(settingDateTypeAtom),
  startDate: get(settingStartDateAtom),
  endDate: get(settingEndDateAtom),
  mallCode: get(settingMallCodeAtom) as ShoppingSettingSearchType['mallCode'],
  mallAccountId: get(settingMallAccountIdAtom),
  searchValue: get(settingSearchValueAtom),
}));

export const committedFiltersAtom = atom<ShoppingSettingSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mallCode: 'ALL',
  mallAccountId: 'ALL',
  searchValue: '',
});

// 계정등록쇼핑몰 변경 시 쇼핑몰아이디 선택값을 함께 초기화하기 위한 쓰기 전용 atom
export const setSettingMallCodeAtom = atom(null, (_, set, mallCode: string) => {
  set(settingMallCodeAtom, mallCode);
  set(settingMallAccountIdAtom, 'ALL');
});

// 신규추가 모달 오픈 상태
export const isNewSettingModalOpenAtom = atom<boolean>(false);
```

- [ ] **Step 2: 타입 체크로 검증**

Run: `npx tsc --noEmit`
Expected: 이 파일 관련 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/features/shoppingSetting/store/search.store.ts
git commit -m "feat: 쇼핑몰 정보설정 store 추가"
```

---

### Task 7: API 함수 + React Query 훅

**Files:**
- Create: `src/features/shoppingSetting/api/getShoppingSettings.ts`
- Create: `src/features/shoppingSetting/api/useGetShoppingSettings.ts`
- Create: `src/features/shoppingSetting/api/updateShoppingSettingsStatus.ts`
- Create: `src/features/shoppingSetting/api/useUpdateShoppingSettingsStatus.ts`
- Create: `src/features/shoppingSetting/api/deleteShoppingSettings.ts`
- Create: `src/features/shoppingSetting/api/useDeleteShoppingSettings.ts`
- Create: `src/features/shoppingSetting/api/getAvailableMallAccounts.ts`
- Create: `src/features/shoppingSetting/api/useGetAvailableMallAccounts.ts`

**Interfaces:**
- Consumes: `committedFiltersAtom`, `currentPageAtom` (Task 6), `workspaceOwnerIdAtom` (기존 `@/features/auth/store/auth.store`), `GetShoppingSettingsResponse`, `ShoppingSettingSearchType`, `AvailableMallAccount` (Task 1), `/api/shopping/settings/*` 엔드포인트 (Task 5)
- Produces: `useGetShoppingSettings()`, `useUpdateShoppingSettingsStatus()`, `useDeleteShoppingSettings()`, `useGetAvailableMallAccounts()` 훅과 `SHOPPING_SETTING_LIST_QUERY_KEY` — Task 8, 9, 10, 11이 그대로 사용한다.

이 Task는 fetch 래퍼 + react-query 훅으로, 기존 `shoppingAccount/api/*`도 자동화 테스트가 없다. 구현 후 타입 체크로 검증한다.

- [ ] **Step 1: 목록 조회 API + 훅**

```ts
// src/features/shoppingSetting/api/getShoppingSettings.ts
import { GetShoppingSettingsResponse, ShoppingSettingSearchType } from '../types/shoppingSetting.types';

export const getShoppingSettings = async (
  ownerId: string,
  filters: ShoppingSettingSearchType,
  page: number,
  pageSize = 10,
): Promise<GetShoppingSettingsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, filters, page, pageSize }),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 목록 조회 실패');
  return response.json();
};
```

```ts
// src/features/shoppingSetting/api/useGetShoppingSettings.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingSettings } from './getShoppingSettings';

export const SHOPPING_SETTING_LIST_QUERY_KEY = 'shoppingSettingList';

export const useGetShoppingSettings = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getShoppingSettings(workspaceOwnerId, filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
```

- [ ] **Step 2: 상태변경 API + 훅**

```ts
// src/features/shoppingSetting/api/updateShoppingSettingsStatus.ts
export const updateShoppingSettingsStatus = async (ids: string[], isActive: boolean): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, isActive }),
  });
  if (!response.ok) throw new Error('사용여부 변경 실패');
};
```

```ts
// src/features/shoppingSetting/api/useUpdateShoppingSettingsStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateShoppingSettingsStatus } from './updateShoppingSettingsStatus';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';

export const useUpdateShoppingSettingsStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
      updateShoppingSettingsStatus(ids, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
```

- [ ] **Step 3: 삭제 API + 훅**

```ts
// src/features/shoppingSetting/api/deleteShoppingSettings.ts
export const deleteShoppingSettings = async (ids: string[]): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 삭제 실패');
};
```

```ts
// src/features/shoppingSetting/api/useDeleteShoppingSettings.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteShoppingSettings } from './deleteShoppingSettings';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';

export const useDeleteShoppingSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingSettings(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
```

- [ ] **Step 4: 등록 가능 계정 조회 API + 훅**

```ts
// src/features/shoppingSetting/api/getAvailableMallAccounts.ts
import { AvailableMallAccount } from '../types/shoppingSetting.types';

export const getAvailableMallAccounts = async (ownerId: string): Promise<AvailableMallAccount[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/available-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!response.ok) throw new Error('등록 가능한 쇼핑몰계정 조회 실패');
  return response.json();
};
```

```ts
// src/features/shoppingSetting/api/useGetAvailableMallAccounts.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getAvailableMallAccounts } from './getAvailableMallAccounts';

export const AVAILABLE_MALL_ACCOUNTS_QUERY_KEY = 'availableMallAccounts';

export const useGetAvailableMallAccounts = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [AVAILABLE_MALL_ACCOUNTS_QUERY_KEY, workspaceOwnerId],
    queryFn: () => getAvailableMallAccounts(workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });
};
```

- [ ] **Step 5: 타입 체크로 검증**

Run: `npx tsc --noEmit`
Expected: 위 8개 파일 관련 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/features/shoppingSetting/api
git commit -m "feat: 쇼핑몰 정보설정 API 함수 및 react-query 훅 추가"
```

---

### Task 8: 검색필터 UI 컴포넌트

**Files:**
- Create: `src/features/shoppingSetting/ui/list/components/SettingDateFilter.tsx`
- Create: `src/features/shoppingSetting/ui/list/components/SettingMallFilter.tsx`
- Create: `src/features/shoppingSetting/ui/list/components/SettingMallAccountFilter.tsx`
- Create: `src/features/shoppingSetting/ui/list/components/SettingSearchInput.tsx`
- Create: `src/features/shoppingSetting/ui/list/ShoppingSettingSearchFilterSection.tsx`

**Interfaces:**
- Consumes: `settingDateTypeAtom`, `settingStartDateAtom`, `settingEndDateAtom`, `settingMallCodeAtom`, `setSettingMallCodeAtom`, `settingMallAccountIdAtom`, `getSettingSearchFilterAtom`, `committedFiltersAtom`, `currentPageAtom` (Task 6), `SETTING_DATE_TYPE`, `SETTING_MALL_NAME_OPTIONS`, `ALL_SETTING_MALL_NAME` (Task 1), `useGetAvailableMallAccounts` (Task 7), 기존 `FilterSelect`/`RangeDatePicker`/`DatePickerRangeButton` 컴포넌트
- Produces: `ShoppingSettingSearchFilterSection` — Task 12(레이아웃)가 사용한다.

이 Task는 UI 컴포넌트로 자동화 테스트 대신 lint로 검증한다 (Global Constraints 참고).

- [ ] **Step 1: 일자 필터 작성**

```tsx
// src/features/shoppingSetting/ui/list/components/SettingDateFilter.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import dayjs from 'dayjs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { RangeTypeProps } from '@/types/common.type';
import {
  settingDateTypeAtom,
  settingStartDateAtom,
  settingEndDateAtom,
} from '@/features/shoppingSetting/store/search.store';
import { SETTING_DATE_TYPE } from '@/features/shoppingSetting/constant/shoppingSetting.constants';

export const SettingDateFilter = () => {
  const [dateType, setDateType] = useAtom(settingDateTypeAtom);
  const setStartDate = useSetAtom(settingStartDateAtom);
  const setEndDate = useSetAtom(settingEndDateAtom);

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
      <Label className="w-20 shrink-0 text-right">검색 일자</Label>
      <Select value={dateType} onValueChange={(v) => setDateType(v as 'createdAt' | 'updatedAt')}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SETTING_DATE_TYPE.map((item) => (
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

- [ ] **Step 2: 계정등록쇼핑몰 필터 작성**

```tsx
// src/features/shoppingSetting/ui/list/components/SettingMallFilter.tsx
'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { settingMallCodeAtom, setSettingMallCodeAtom } from '@/features/shoppingSetting/store/search.store';
import {
  SETTING_MALL_NAME_OPTIONS,
  ALL_SETTING_MALL_NAME,
} from '@/features/shoppingSetting/constant/shoppingSetting.constants';
import { FilterSelect } from '@/components/common/FilterSelect';

export const SettingMallFilter = () => {
  const mallCode = useAtomValue(settingMallCodeAtom);
  const setMallCode = useSetAtom(setSettingMallCodeAtom);

  return (
    <FilterSelect
      label="쇼핑몰"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={mallCode}
      onValueChange={setMallCode}
      options={SETTING_MALL_NAME_OPTIONS}
      allOption={ALL_SETTING_MALL_NAME}
      triggerClassName="w-36"
    />
  );
};
```

- [ ] **Step 3: 쇼핑몰아이디 필터 작성 (계정등록쇼핑몰에 종속)**

```tsx
// src/features/shoppingSetting/ui/list/components/SettingMallAccountFilter.tsx
'use client';

import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { FilterSelect } from '@/components/common/FilterSelect';
import { settingMallAccountIdAtom, settingMallCodeAtom } from '@/features/shoppingSetting/store/search.store';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { FilterOption } from '@/types/common.type';

const ALL_MALL_ACCOUNT: FilterOption = { id: 'ALL', name: '전체' };

export const SettingMallAccountFilter = () => {
  const mallCode = useAtomValue(settingMallCodeAtom);
  const [mallAccountId, setMallAccountId] = useAtom(settingMallAccountIdAtom);
  const { data: accounts = [] } = useGetAvailableMallAccounts();

  const options = useMemo(
    () =>
      accounts
        .filter((account) => mallCode === 'ALL' || account.mallCode === mallCode)
        .map((account) => ({ id: account.id, name: account.mallId })),
    [accounts, mallCode],
  );

  return (
    <FilterSelect
      label="쇼핑몰아이디"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={mallAccountId}
      onValueChange={setMallAccountId}
      options={options}
      allOption={ALL_MALL_ACCOUNT}
      triggerClassName="w-44"
    />
  );
};
```

- [ ] **Step 4: 검색어 입력 작성**

```tsx
// src/features/shoppingSetting/ui/list/components/SettingSearchInput.tsx
'use client';

import { ChangeEventHandler, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import {
  getSettingSearchFilterAtom,
  committedFiltersAtom,
  currentPageAtom,
} from '@/features/shoppingSetting/store/search.store';

export const SettingSearchInput = () => {
  const draftFilters = useAtomValue(getSettingSearchFilterAtom);
  const setCommittedFilters = useSetAtom(committedFiltersAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const [inputValue, setInputValue] = useState('');

  const handleSearchInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setInputValue(e.target.value);
  };

  const handleSearch = () => {
    setCommittedFilters({ ...draftFilters, searchValue: inputValue });
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <div className="flex-1 max-w-md">
        <Input
          placeholder="쇼핑몰ID, 별칭으로 검색..."
          value={inputValue}
          onChange={handleSearchInput}
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button onClick={handleSearch}>
        <Search className="h-4 w-4 mr-2" />
        검색
      </Button>
    </div>
  );
};
```

- [ ] **Step 5: 섹션 조립**

```tsx
// src/features/shoppingSetting/ui/list/ShoppingSettingSearchFilterSection.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingDateFilter } from './components/SettingDateFilter';
import { SettingMallFilter } from './components/SettingMallFilter';
import { SettingMallAccountFilter } from './components/SettingMallAccountFilter';
import { SettingSearchInput } from './components/SettingSearchInput';

export const ShoppingSettingSearchFilterSection = () => {
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
            <SettingDateFilter />
          </div>
          <div className="px-6 py-1 flex items-center gap-8">
            <SettingMallFilter />
            <SettingMallAccountFilter />
          </div>
          <div className="px-6 py-1">
            <SettingSearchInput />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 6: lint로 검증**

Run: `npm run lint`
Expected: 이 5개 파일 관련 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add src/features/shoppingSetting/ui/list/components/SettingDateFilter.tsx src/features/shoppingSetting/ui/list/components/SettingMallFilter.tsx src/features/shoppingSetting/ui/list/components/SettingMallAccountFilter.tsx src/features/shoppingSetting/ui/list/components/SettingSearchInput.tsx src/features/shoppingSetting/ui/list/ShoppingSettingSearchFilterSection.tsx
git commit -m "feat: 쇼핑몰 정보설정 검색필터 UI 추가"
```

---

### Task 9: 액션 섹션

**Files:**
- Create: `src/features/shoppingSetting/ui/list/ShoppingSettingActionSection.tsx`

**Interfaces:**
- Consumes: `selectedSettingsAtom`, `isNewSettingModalOpenAtom` (Task 6), `useGetShoppingSettings`, `useUpdateShoppingSettingsStatus`, `useDeleteShoppingSettings` (Task 7), `SETTING_STATUS_OPTIONS` (Task 1), `useAlert` (기존 `@/hooks/useAlert`)
- Produces: `ShoppingSettingActionSection` — Task 12가 사용한다.

- [ ] **Step 1: 작성**

```tsx
// src/features/shoppingSetting/ui/list/ShoppingSettingActionSection.tsx
'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  selectedSettingsAtom,
  isNewSettingModalOpenAtom,
} from '@/features/shoppingSetting/store/search.store';
import { useGetShoppingSettings } from '@/features/shoppingSetting/api/useGetShoppingSettings';
import { useUpdateShoppingSettingsStatus } from '@/features/shoppingSetting/api/useUpdateShoppingSettingsStatus';
import { useDeleteShoppingSettings } from '@/features/shoppingSetting/api/useDeleteShoppingSettings';
import { SETTING_STATUS_OPTIONS } from '@/features/shoppingSetting/constant/shoppingSetting.constants';
import { useAlert } from '@/hooks/useAlert';

export const ShoppingSettingActionSection = () => {
  const [selectedSettings, setSelectedSettings] = useAtom(selectedSettingsAtom);
  const setModalOpen = useSetAtom(isNewSettingModalOpenAtom);
  const { data } = useGetShoppingSettings();
  const { mutate: deleteSettings, isPending: isDeleting } = useDeleteShoppingSettings();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateShoppingSettingsStatus();
  const { showAlert } = useAlert();
  const [statusValue, setStatusValue] = useState<string>('true');

  const settings = data?.settings ?? [];

  const handleDelete = () => {
    if (selectedSettings.length === 0) {
      showAlert({ message: '삭제할 항목을 선택해주세요.', type: 'warning' });
      return;
    }
    const snapshotIds = [...selectedSettings];
    const count = snapshotIds.length;
    showAlert({
      title: '설정 삭제',
      message: `선택한 ${count}개의 설정을 삭제하시겠습니까?`,
      showCancel: true,
      onConfirm: () => {
        deleteSettings(snapshotIds, {
          onSuccess: () => {
            setSelectedSettings([]);
            showAlert({ message: `${count}개의 설정이 삭제되었습니다.`, type: 'success' });
          },
        });
      },
    });
  };

  const handleChangeStatus = () => {
    if (selectedSettings.length === 0) {
      showAlert({ message: '변경할 항목을 선택해주세요.', type: 'warning' });
      return;
    }
    const snapshotIds = [...selectedSettings];
    updateStatus(
      { ids: snapshotIds, isActive: statusValue === 'true' },
      {
        onSuccess: () => {
          setSelectedSettings([]);
          showAlert({ message: '사용여부가 변경되었습니다.', type: 'success' });
        },
      },
    );
  };

  const handleBulkSetting = () => {
    if (selectedSettings.length === 0) {
      showAlert({ message: '설정할 항목을 선택해주세요.', type: 'warning' });
      return;
    }
    const selectedMallCodes = new Set(
      settings.filter((s) => selectedSettings.includes(s.id)).map((s) => s.mallCode),
    );
    if (selectedMallCodes.size > 1) {
      showAlert({ message: '동일한 쇼핑몰만 선택해 주세요.', type: 'warning' });
      return;
    }
    showAlert({ message: '준비중인 기능입니다.', type: 'info' });
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-muted-foreground min-w-16">
        선택 <span className="font-medium text-foreground">{selectedSettings.length}</span>개
      </span>
      <Button size="sm" onClick={() => setModalOpen(true)}>
        신규추가
      </Button>
      <Button variant="outline" size="sm" onClick={handleBulkSetting}>
        정보일괄설정
      </Button>
      <Select value={statusValue} onValueChange={setStatusValue}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SETTING_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={handleChangeStatus} disabled={isUpdating}>
        사용여부변경
      </Button>
      <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
        <Trash2 className="h-4 w-4 mr-2" />
        삭제
      </Button>
    </div>
  );
};
```

- [ ] **Step 2: lint로 검증**

Run: `npm run lint`
Expected: 이 파일 관련 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/features/shoppingSetting/ui/list/ShoppingSettingActionSection.tsx
git commit -m "feat: 쇼핑몰 정보설정 액션 섹션 추가"
```

---

### Task 10: 테이블 섹션

**Files:**
- Create: `src/features/shoppingSetting/ui/list/components/ShoppingSettingTable.tsx`
- Create: `src/features/shoppingSetting/ui/list/ShoppingSettingTableSection.tsx`

**Interfaces:**
- Consumes: `selectedSettingsAtom`, `currentPageAtom` (Task 6), `SHOPPING_SETTING_TABLE_HEAD` (Task 1), `useGetShoppingSettings` (Task 7), `useAlert`, 기존 `TablePagination`
- Produces: `ShoppingSettingTable`, `ShoppingSettingTableSection` — Task 12가 사용한다.

- [ ] **Step 1: 테이블 컴포넌트 작성**

```tsx
// src/features/shoppingSetting/ui/list/components/ShoppingSettingTable.tsx
'use client';

import { useAtom } from 'jotai';
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
                <Button variant="outline" size="sm" onClick={notReady}>
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

- [ ] **Step 2: 테이블 섹션 작성**

```tsx
// src/features/shoppingSetting/ui/list/ShoppingSettingTableSection.tsx
'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { currentPageAtom, selectedSettingsAtom } from '@/features/shoppingSetting/store/search.store';
import { useGetShoppingSettings } from '@/features/shoppingSetting/api/useGetShoppingSettings';
import { ShoppingSettingTable } from './components/ShoppingSettingTable';

export const ShoppingSettingTableSection = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const { data, isLoading } = useGetShoppingSettings();
  const setSelectedSettings = useSetAtom(selectedSettingsAtom);

  useEffect(() => {
    setSelectedSettings([]);
  }, [data, setSelectedSettings]);

  const settings = data?.settings ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-[3px] rounded-full bg-primary" />
            <CardTitle className="text-sm">설정 목록</CardTitle>
          </div>
          <CardDescription>총 {isLoading ? '-' : total}개의 설정</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <ShoppingSettingTable settings={settings} />
        )}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onChangePage={(page) => setCurrentPage(page)}
        />
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 3: lint로 검증**

Run: `npm run lint`
Expected: 이 2개 파일 관련 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/features/shoppingSetting/ui/list/components/ShoppingSettingTable.tsx src/features/shoppingSetting/ui/list/ShoppingSettingTableSection.tsx
git commit -m "feat: 쇼핑몰 정보설정 테이블 섹션 추가"
```

---

### Task 11: 신규추가 모달

**Files:**
- Create: `src/features/shoppingSetting/ui/list/components/NewSettingModal.tsx`

**Interfaces:**
- Consumes: `isNewSettingModalOpenAtom` (Task 6), `useGetAvailableMallAccounts` (Task 7), `useAlert`, 기존 `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` (`@/components/ui/dialog`)
- Produces: `NewSettingModal` — Task 12가 레이아웃에 조립한다.

- [ ] **Step 1: 작성**

```tsx
// src/features/shoppingSetting/ui/list/components/NewSettingModal.tsx
'use client';

import { useAtom } from 'jotai';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isNewSettingModalOpenAtom } from '@/features/shoppingSetting/store/search.store';
import { useGetAvailableMallAccounts } from '@/features/shoppingSetting/api/useGetAvailableMallAccounts';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { useAlert } from '@/hooks/useAlert';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

export const NewSettingModal = () => {
  const [open, setOpen] = useAtom(isNewSettingModalOpenAtom);
  const { data: accounts = [], isLoading } = useGetAvailableMallAccounts();
  const { showAlert } = useAlert();

  const handleRegister = () => {
    showAlert({ message: '준비중인 기능입니다.', type: 'info' });
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
              <TableRow>
                <TableHead className="text-center">쇼핑몰</TableHead>
                <TableHead className="text-center">아이디</TableHead>
                <TableHead className="text-center">설정현황</TableHead>
                <TableHead className="text-center">등록</TableHead>
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
                  <TableRow key={account.id}>
                    <TableCell className="text-center">{getMallName(account.mallCode)}</TableCell>
                    <TableCell className="text-center">{account.mallId}</TableCell>
                    <TableCell className="text-center">
                      {account.settingCount > 0 ? `이미 ${account.settingCount}건 설정됨` : '미설정'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" onClick={handleRegister}>
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

- [ ] **Step 2: lint로 검증**

Run: `npm run lint`
Expected: 이 파일 관련 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/features/shoppingSetting/ui/list/components/NewSettingModal.tsx
git commit -m "feat: 쇼핑몰 정보설정 신규추가 모달 추가"
```

---

### Task 12: 레이아웃 조립 + 라우트 + 사이드바 메뉴

**Files:**
- Create: `src/features/shoppingSetting/ui/list/ShoppingSettingListHeaderSection.tsx`
- Create: `src/features/shoppingSetting/ui/list/ShoppingSettingListLayout.tsx`
- Create: `src/app/(authenticated)/shopping/settings/page.tsx`
- Modify: `src/constant/sidebarMenu.constant.ts`

**Interfaces:**
- Consumes: `ShoppingSettingSearchFilterSection` (Task 8), `ShoppingSettingActionSection` (Task 9), `ShoppingSettingTableSection` (Task 10), `NewSettingModal` (Task 11)
- Produces: `/shopping/settings` 라우트, `쇼핑몰관리 > 쇼핑몰 정보설정` 메뉴 — 최종 사용자 대면 결과물.

- [ ] **Step 1: 헤더 섹션 작성**

```tsx
// src/features/shoppingSetting/ui/list/ShoppingSettingListHeaderSection.tsx
export const ShoppingSettingListHeaderSection = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">쇼핑몰 정보설정</h1>
      <p className="text-muted-foreground">쇼핑몰별 특수 필드값과 배송지 등 설정 정보를 관리하세요.</p>
    </div>
  );
};
```

- [ ] **Step 2: 레이아웃 조립**

```tsx
// src/features/shoppingSetting/ui/list/ShoppingSettingListLayout.tsx
'use client';

import { ShoppingSettingListHeaderSection } from './ShoppingSettingListHeaderSection';
import { ShoppingSettingSearchFilterSection } from './ShoppingSettingSearchFilterSection';
import { ShoppingSettingActionSection } from './ShoppingSettingActionSection';
import { ShoppingSettingTableSection } from './ShoppingSettingTableSection';
import { NewSettingModal } from './components/NewSettingModal';

export const ShoppingSettingListLayout = () => {
  return (
    <>
      <ShoppingSettingListHeaderSection />
      <ShoppingSettingSearchFilterSection />
      <ShoppingSettingActionSection />
      <ShoppingSettingTableSection />
      <NewSettingModal />
    </>
  );
};
```

- [ ] **Step 3: 라우트 페이지 작성**

```tsx
// src/app/(authenticated)/shopping/settings/page.tsx
import { ShoppingSettingListLayout } from '@/features/shoppingSetting/ui/list/ShoppingSettingListLayout';

export default function ShoppingSettingsPage() {
  return <ShoppingSettingListLayout />;
}
```

- [ ] **Step 4: 사이드바 메뉴 추가**

`src/constant/sidebarMenu.constant.ts`의 `쇼핑몰관리` 그룹 `items` 배열에 아래 항목 추가:

```ts
      {
        title: '쇼핑몰 정보설정',
        url: '/shopping/settings',
      },
```

적용 후 해당 그룹 전체는 다음과 같다:

```ts
  {
    title: '쇼핑몰관리',
    url: '/shopping',
    icon: StoreIcon,
    items: [
      {
        title: '쇼핑몰 계정관리',
        url: '/shopping/accounts',
      },
      {
        title: '쇼핑몰 정보설정',
        url: '/shopping/settings',
      },
    ],
  },
```

- [ ] **Step 5: 개발 서버로 수동 확인**

Run: `npm run dev`
Expected: `/shopping/settings` 접속 시 검색필터/액션버튼/테이블이 정상 렌더링되고, 사이드바에 `쇼핑몰 정보설정` 메뉴가 보인다. 신규추가 모달 오픈 → 등록 버튼 클릭 시 "준비중인 기능입니다." alert 노출. 테이블의 수정/복사 버튼도 동일 alert 노출. 사용여부변경/삭제는 실제로 동작.

- [ ] **Step 6: 전체 lint + 타입체크로 최종 검증**

Run: `npm run lint && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add src/features/shoppingSetting/ui/list/ShoppingSettingListHeaderSection.tsx src/features/shoppingSetting/ui/list/ShoppingSettingListLayout.tsx "src/app/(authenticated)/shopping/settings/page.tsx" src/constant/sidebarMenu.constant.ts
git commit -m "feat: 쇼핑몰 정보설정 화면 라우트 및 메뉴 연결"
```

---

## 다음 작업 (이 플랜 범위 밖)

- 신규추가 등록 후 이동할 정보 입력 페이지 (특수필드/배송지 설계 필요)
- 수정 모달 (설정값 편집)
- 복사 로직 (설정값 복제하여 새 행 생성)
- 정보일괄설정 모달 (특수필드/배송지 일괄 설정)
