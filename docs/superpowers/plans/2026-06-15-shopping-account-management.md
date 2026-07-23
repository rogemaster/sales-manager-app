# 쇼핑몰 계정관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 쿠팡·네이버 등 외부 쇼핑 플랫폼 연동 계정을 CRUD로 관리하는 목록·등록·수정 화면을 구현한다.

**Architecture:** 기존 사용자관리 패턴을 그대로 따른다. MSW가 모든 API 요청을 가로채며 `src/app/api/` route 파일은 생성하지 않는다. 목록은 Jotai atoms(draft + committedFilters) + TanStack Query, 등록/수정은 React Hook Form + Zod로 처리한다.

**Tech Stack:** Next.js 15 App Router, Jotai, TanStack Query, React Hook Form, Zod, MSW, Tailwind CSS, shadcn/ui

---

## 파일 구조

### 신규 생성
```
src/features/shoppingAccount/
  types/shoppingAccount.types.ts
  constant/shoppingAccount.constants.ts
  store/search.store.ts
  api/getShoppingAccounts.ts
  api/useGetShoppingAccounts.ts
  api/getShoppingAccount.ts
  api/createShoppingAccount.ts
  api/useCreateShoppingAccount.ts
  api/updateShoppingAccount.ts
  api/useUpdateShoppingAccount.ts
  api/deleteShoppingAccounts.ts
  api/useDeleteShoppingAccounts.ts
  api/updateShoppingAccountsStatus.ts
  api/useUpdateShoppingAccountsStatus.ts
  ui/list/components/AccountDateFilter.tsx
  ui/list/components/AccountMallFilter.tsx
  ui/list/components/AccountStatusFilter.tsx
  ui/list/components/AccountSearchInput.tsx
  ui/list/components/ShoppingAccountTable.tsx
  ui/list/ShoppingAccountSearchFilterSection.tsx
  ui/list/ShoppingAccountActionSection.tsx
  ui/list/ShoppingAccountTableSection.tsx
  ui/list/ShoppingAccountListHeaderSection.tsx
  ui/list/ShoppingAccountListLayout.tsx
  ui/components/ShoppingAccountForm.tsx
  ui/create/ShoppingAccountCreateLayout.tsx
  ui/[id]/ShoppingAccountModifyLayout.tsx

src/mocks/data/MockShoppingAccountsData.ts
src/mocks/utils/getShoppingAccounts.ts
src/mocks/utils/getShoppingAccount.ts
src/mocks/utils/createShoppingAccount.ts
src/mocks/utils/updateShoppingAccount.ts
src/mocks/utils/deleteShoppingAccounts.ts
src/mocks/utils/updateShoppingAccountsStatus.ts

src/app/(authenticated)/shopping/accounts/page.tsx
src/app/(authenticated)/shopping/accounts/create/page.tsx
src/app/(authenticated)/shopping/accounts/[id]/page.tsx
```

### 수정
```
src/mocks/handlers.ts                    — 쇼핑몰 계정 핸들러 추가
src/constant/sidebarMenu.constant.ts     — 쇼핑몰 계정관리 메뉴 추가(disabled 제거)
```

---

## Task 1: Types + Constants

**Files:**
- Create: `src/features/shoppingAccount/types/shoppingAccount.types.ts`
- Create: `src/features/shoppingAccount/constant/shoppingAccount.constants.ts`

- [ ] **Step 1: 타입 파일 생성**

```typescript
// src/features/shoppingAccount/types/shoppingAccount.types.ts

export interface ShoppingAccount {
  id: string;
  mallName: string;
  mallId: string;
  password: string;
  isActive: boolean;
  nickname: string;
  managerMd: string;
  phone: string;
  email: string;
  domain: string;
  category: string;
  apiKey: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingAccountSearchType {
  dateType: 'createdAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  isActive: 'true' | 'false' | 'ALL';
  mallName: string;
  searchValue: string;
}

export interface GetShoppingAccountsResponse {
  accounts: ShoppingAccount[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type CreateShoppingAccountBody = Omit<ShoppingAccount, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdateShoppingAccountBody = Partial<CreateShoppingAccountBody>;
```

- [ ] **Step 2: 상수 파일 생성**

```typescript
// src/features/shoppingAccount/constant/shoppingAccount.constants.ts
import { FilterOption, TableTitleValue } from '@/types/common.type';

export const ACCOUNT_DATE_TYPE: FilterOption[] = [
  { id: 'createdAt', name: '등록일' },
  { id: 'updatedAt', name: '수정일' },
];

export const ACCOUNT_STATUS_OPTIONS: FilterOption[] = [
  { id: 'true', name: '사용' },
  { id: 'false', name: '미사용' },
];

export const ALL_ACCOUNT_STATUS: FilterOption = { id: 'ALL', name: '전체' };

export const MALL_NAME_OPTIONS: FilterOption[] = [
  { id: '쿠팡', name: '쿠팡' },
  { id: '네이버', name: '네이버' },
  { id: '11번가', name: '11번가' },
  { id: 'G마켓', name: 'G마켓' },
  { id: '옥션', name: '옥션' },
  { id: '위메프', name: '위메프' },
  { id: '티몬', name: '티몬' },
];

export const ALL_MALL_NAME: FilterOption = { id: 'ALL', name: '전체' };

export const SHOPPING_ACCOUNT_TABLE_HEAD: TableTitleValue[] = [
  { id: 'mallName', title: '쇼핑몰명' },
  { id: 'nickname', title: '별명' },
  { id: 'isActive', title: '사용여부' },
  { id: 'createdAt', title: '등록일' },
  { id: 'updatedAt', title: '수정일' },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/features/shoppingAccount/types/shoppingAccount.types.ts \
        src/features/shoppingAccount/constant/shoppingAccount.constants.ts
git commit -m "feat: 쇼핑몰 계정관리 타입 및 상수 추가"
```

---

## Task 2: Mock 데이터

**Files:**
- Create: `src/mocks/data/MockShoppingAccountsData.ts`

- [ ] **Step 1: Mock 데이터 파일 생성**

```typescript
// src/mocks/data/MockShoppingAccountsData.ts
import { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';

const SUPER_A_ID = 'usr_001';
const SUPER_B_ID = 'usr_005';

export const MOCK_SHOPPING_ACCOUNTS_DATA: ShoppingAccount[] = [
  {
    id: 'sa_001',
    ownerId: SUPER_A_ID,
    mallName: '쿠팡',
    mallId: 'coupang_seller_001',
    password: 'pass123!',
    isActive: true,
    nickname: '쿠팡 메인',
    managerMd: '김담당',
    phone: '010-1111-2222',
    email: 'coupang@example.com',
    domain: 'https://wing.coupang.com',
    category: '의류',
    apiKey: 'cpg-api-key-001',
    createdAt: '2025-01-15',
    updatedAt: '2025-04-20',
  },
  {
    id: 'sa_002',
    ownerId: SUPER_A_ID,
    mallName: '네이버',
    mallId: 'naver_store_002',
    password: 'naver456!',
    isActive: true,
    nickname: '네이버 스마트스토어',
    managerMd: '이담당',
    phone: '010-3333-4444',
    email: 'naver@example.com',
    domain: 'https://smartstore.naver.com/mystore',
    category: '전자기기',
    apiKey: 'nv-api-key-002',
    createdAt: '2025-02-01',
    updatedAt: '2025-04-25',
  },
  {
    id: 'sa_003',
    ownerId: SUPER_A_ID,
    mallName: '11번가',
    mallId: '11st_seller_003',
    password: 'eleven789!',
    isActive: false,
    nickname: '11번가 부계정',
    managerMd: '박담당',
    phone: '010-5555-6666',
    email: '11st@example.com',
    domain: 'https://www.11st.co.kr/seller/003',
    category: '생활용품',
    apiKey: '11st-api-key-003',
    createdAt: '2025-03-10',
    updatedAt: '2025-05-01',
  },
  {
    id: 'sa_004',
    ownerId: SUPER_A_ID,
    mallName: 'G마켓',
    mallId: 'gmarket_seller_004',
    password: 'gmarket111!',
    isActive: true,
    nickname: 'G마켓 공식',
    managerMd: '최담당',
    phone: '010-7777-8888',
    email: 'gmarket@example.com',
    domain: 'https://www.gmarket.co.kr/seller/004',
    category: '식품',
    apiKey: 'gm-api-key-004',
    createdAt: '2025-03-20',
    updatedAt: '2025-05-10',
  },
  {
    id: 'sa_005',
    ownerId: SUPER_A_ID,
    mallName: '옥션',
    mallId: 'auction_seller_005',
    password: 'auction222!',
    isActive: false,
    nickname: '',
    managerMd: '',
    phone: '',
    email: 'auction@example.com',
    domain: '',
    category: '스포츠',
    apiKey: 'au-api-key-005',
    createdAt: '2025-04-01',
    updatedAt: '2025-05-15',
  },
  {
    id: 'sa_006',
    ownerId: SUPER_B_ID,
    mallName: '쿠팡',
    mallId: 'coupang_seller_006',
    password: 'pass789!',
    isActive: true,
    nickname: '쿠팡 B계정',
    managerMd: '정담당',
    phone: '010-9999-0000',
    email: 'coupang_b@example.com',
    domain: 'https://wing.coupang.com/b',
    category: '잡화',
    apiKey: 'cpg-api-key-006',
    createdAt: '2025-02-15',
    updatedAt: '2025-04-30',
  },
  {
    id: 'sa_007',
    ownerId: SUPER_B_ID,
    mallName: '위메프',
    mallId: 'wemakeprice_007',
    password: 'wmp333!',
    isActive: true,
    nickname: '위메프 공식',
    managerMd: '조담당',
    phone: '010-1212-3434',
    email: 'wemakeprice@example.com',
    domain: 'https://www.wemakeprice.com/seller/007',
    category: '가전',
    apiKey: 'wmp-api-key-007',
    createdAt: '2025-03-05',
    updatedAt: '2025-05-20',
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/mocks/data/MockShoppingAccountsData.ts
git commit -m "feat: 쇼핑몰 계정 목 데이터 추가"
```

---

## Task 3: MSW Utils

**Files:**
- Create: `src/mocks/utils/getShoppingAccounts.ts`
- Create: `src/mocks/utils/getShoppingAccount.ts`
- Create: `src/mocks/utils/createShoppingAccount.ts`
- Create: `src/mocks/utils/updateShoppingAccount.ts`
- Create: `src/mocks/utils/deleteShoppingAccounts.ts`
- Create: `src/mocks/utils/updateShoppingAccountsStatus.ts`

- [ ] **Step 1: 목록 조회 유틸 생성**

```typescript
// src/mocks/utils/getShoppingAccounts.ts
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { GetShoppingAccountsResponse, ShoppingAccountSearchType } from '@/features/shoppingAccount/types/shoppingAccount.types';

dayjs.extend(isBetween);

export const getMockShoppingAccounts = (
  ownerId: string,
  filters: ShoppingAccountSearchType,
  page: number,
  pageSize: number,
): GetShoppingAccountsResponse => {
  const { dateType, startDate, endDate, isActive, mallName, searchValue } = filters;

  const filtered = MOCK_SHOPPING_ACCOUNTS_DATA.filter((account) => {
    if (account.ownerId !== ownerId) return false;
    const dateValue = dateType === 'createdAt' ? account.createdAt : account.updatedAt;
    if (!dayjs(dateValue).isBetween(startDate, endDate, 'day', '[]')) return false;
    if (isActive !== 'ALL' && account.isActive !== (isActive === 'true')) return false;
    if (mallName !== 'ALL' && account.mallName !== mallName) return false;
    if (searchValue) {
      const keyword = searchValue.toLowerCase();
      const matches =
        account.mallId.toLowerCase().includes(keyword) ||
        account.nickname.toLowerCase().includes(keyword);
      if (!matches) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const accounts = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { accounts, total, page, pageSize, totalPages };
};
```

- [ ] **Step 2: 단건 조회 유틸 생성**

```typescript
// src/mocks/utils/getShoppingAccount.ts
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';

export const getMockShoppingAccount = (id: string): ShoppingAccount | undefined => {
  return MOCK_SHOPPING_ACCOUNTS_DATA.find((account) => account.id === id);
};
```

- [ ] **Step 3: 등록 유틸 생성**

```typescript
// src/mocks/utils/createShoppingAccount.ts
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { ShoppingAccount, CreateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';
import dayjs from 'dayjs';

export const createMockShoppingAccount = (body: CreateShoppingAccountBody, ownerId: string): ShoppingAccount => {
  const now = dayjs().format('YYYY-MM-DD');
  const newAccount: ShoppingAccount = {
    id: `sa_${Date.now()}`,
    ownerId,
    ...body,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_SHOPPING_ACCOUNTS_DATA.push(newAccount);
  return newAccount;
};
```

- [ ] **Step 4: 수정 유틸 생성**

```typescript
// src/mocks/utils/updateShoppingAccount.ts
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { ShoppingAccount, UpdateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';
import dayjs from 'dayjs';

export const updateMockShoppingAccount = (id: string, body: UpdateShoppingAccountBody): ShoppingAccount | null => {
  const index = MOCK_SHOPPING_ACCOUNTS_DATA.findIndex((account) => account.id === id);
  if (index === -1) return null;
  MOCK_SHOPPING_ACCOUNTS_DATA[index] = {
    ...MOCK_SHOPPING_ACCOUNTS_DATA[index],
    ...body,
    updatedAt: dayjs().format('YYYY-MM-DD'),
  };
  return MOCK_SHOPPING_ACCOUNTS_DATA[index];
};
```

- [ ] **Step 5: 삭제 유틸 생성**

```typescript
// src/mocks/utils/deleteShoppingAccounts.ts
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';

export const deleteMockShoppingAccounts = (ids: string[]): void => {
  ids.forEach((id) => {
    const index = MOCK_SHOPPING_ACCOUNTS_DATA.findIndex((account) => account.id === id);
    if (index !== -1) MOCK_SHOPPING_ACCOUNTS_DATA.splice(index, 1);
  });
};
```

- [ ] **Step 6: 사용여부 일괄변경 유틸 생성**

```typescript
// src/mocks/utils/updateShoppingAccountsStatus.ts
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import dayjs from 'dayjs';

export const updateMockShoppingAccountsStatus = (ids: string[], isActive: boolean): void => {
  const now = dayjs().format('YYYY-MM-DD');
  ids.forEach((id) => {
    const account = MOCK_SHOPPING_ACCOUNTS_DATA.find((a) => a.id === id);
    if (account) {
      account.isActive = isActive;
      account.updatedAt = now;
    }
  });
};
```

- [ ] **Step 7: Commit**

```bash
git add src/mocks/utils/getShoppingAccounts.ts \
        src/mocks/utils/getShoppingAccount.ts \
        src/mocks/utils/createShoppingAccount.ts \
        src/mocks/utils/updateShoppingAccount.ts \
        src/mocks/utils/deleteShoppingAccounts.ts \
        src/mocks/utils/updateShoppingAccountsStatus.ts
git commit -m "feat: 쇼핑몰 계정 MSW 유틸 추가"
```

---

## Task 4: MSW 핸들러 + 사이드바 메뉴

**Files:**
- Modify: `src/mocks/handlers.ts`
- Modify: `src/constant/sidebarMenu.constant.ts`

- [ ] **Step 1: handlers.ts 상단 import 추가**

`src/mocks/handlers.ts` 상단 import 블록에 아래 내용을 추가한다.

```typescript
import { getMockShoppingAccounts } from './utils/getShoppingAccounts';
import { getMockShoppingAccount } from './utils/getShoppingAccount';
import { createMockShoppingAccount } from './utils/createShoppingAccount';
import { updateMockShoppingAccount } from './utils/updateShoppingAccount';
import { deleteMockShoppingAccounts } from './utils/deleteShoppingAccounts';
import { updateMockShoppingAccountsStatus } from './utils/updateShoppingAccountsStatus';
import {
  ShoppingAccountSearchType,
  CreateShoppingAccountBody,
  UpdateShoppingAccountBody,
} from '@/features/shoppingAccount/types/shoppingAccount.types';
```

- [ ] **Step 2: handlers 배열 끝에 핸들러 추가**

`src/mocks/handlers.ts`의 `handlers` 배열 마지막 항목(프로필 수정 핸들러) 뒤에 아래를 추가한다.

```typescript
  // 쇼핑몰 계정 목록 조회
  http.post(`${baseUrl}/api/shopping/accounts/list`, async ({ request }) => {
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: ShoppingAccountSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockShoppingAccounts(ownerId, filters, page, pageSize));
  }),

  // 쇼핑몰 계정 단건 조회
  http.get(`${baseUrl}/api/shopping/accounts/:id`, ({ params }) => {
    const account = getMockShoppingAccount(params.id as string);
    if (!account) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(account);
  }),

  // 쇼핑몰 계정 등록
  http.post(`${baseUrl}/api/shopping/accounts`, async ({ request }) => {
    const { ownerId, ...body } = (await request.json()) as CreateShoppingAccountBody & { ownerId: string };
    const newAccount = createMockShoppingAccount(body, ownerId);
    return HttpResponse.json(newAccount, { status: 201 });
  }),

  // 쇼핑몰 계정 수정
  http.patch(`${baseUrl}/api/shopping/accounts/:id`, async ({ request, params }) => {
    const body = (await request.json()) as UpdateShoppingAccountBody;
    const updated = updateMockShoppingAccount(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // 쇼핑몰 계정 다중 삭제
  http.post(`${baseUrl}/api/shopping/accounts/delete`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockShoppingAccounts(ids);
    return HttpResponse.json({ success: true });
  }),

  // 쇼핑몰 계정 사용여부 일괄 변경
  http.patch(`${baseUrl}/api/shopping/accounts/status`, async ({ request }) => {
    const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
    updateMockShoppingAccountsStatus(ids, isActive);
    return HttpResponse.json({ success: true });
  }),
```

- [ ] **Step 3: 사이드바 메뉴에 쇼핑몰 계정관리 추가**

`src/constant/sidebarMenu.constant.ts`의 쇼핑몰관리 items 배열 맨 앞에 추가한다.

```typescript
  {
    title: '쇼핑몰관리',
    url: '/shopping',
    icon: StoreIcon,
    items: [
      {
        title: '쇼핑몰 계정관리',   // ← 이 항목 추가 (disabled 없음)
        url: '/shopping/accounts',
      },
      {
        title: '쇼핑몰설정',
        url: '/shopping/settings',
        disabled: true,
      },
      // ... 기존 항목 유지
    ],
  },
```

- [ ] **Step 4: Commit**

```bash
git add src/mocks/handlers.ts src/constant/sidebarMenu.constant.ts
git commit -m "feat: 쇼핑몰 계정 MSW 핸들러 및 사이드바 메뉴 추가"
```

---

## Task 5: Jotai Store + API 레이어

**Files:**
- Create: `src/features/shoppingAccount/store/search.store.ts`
- Create: `src/features/shoppingAccount/api/getShoppingAccounts.ts`
- Create: `src/features/shoppingAccount/api/useGetShoppingAccounts.ts`
- Create: `src/features/shoppingAccount/api/getShoppingAccount.ts`
- Create: `src/features/shoppingAccount/api/createShoppingAccount.ts`
- Create: `src/features/shoppingAccount/api/useCreateShoppingAccount.ts`
- Create: `src/features/shoppingAccount/api/updateShoppingAccount.ts`
- Create: `src/features/shoppingAccount/api/useUpdateShoppingAccount.ts`
- Create: `src/features/shoppingAccount/api/deleteShoppingAccounts.ts`
- Create: `src/features/shoppingAccount/api/useDeleteShoppingAccounts.ts`
- Create: `src/features/shoppingAccount/api/updateShoppingAccountsStatus.ts`
- Create: `src/features/shoppingAccount/api/useUpdateShoppingAccountsStatus.ts`

- [ ] **Step 1: Jotai store 생성**

```typescript
// src/features/shoppingAccount/store/search.store.ts
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { ShoppingAccountSearchType } from '../types/shoppingAccount.types';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const currentPageAtom = atom<number>(1);
export const selectedAccountsAtom = atom<string[]>([]);

export const accountDateTypeAtom = atom<'createdAt' | 'updatedAt'>(DEFAULT_DATE_TYPE);
export const accountStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const accountEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const accountIsActiveAtom = atom<'true' | 'false' | 'ALL'>('ALL');
export const accountMallNameAtom = atom<string>('ALL');
export const accountSearchValueAtom = atom<string>('');

export const getAccountSearchFilterAtom = atom<ShoppingAccountSearchType>((get) => ({
  dateType: get(accountDateTypeAtom),
  startDate: get(accountStartDateAtom),
  endDate: get(accountEndDateAtom),
  isActive: get(accountIsActiveAtom),
  mallName: get(accountMallNameAtom),
  searchValue: get(accountSearchValueAtom),
}));

export const committedFiltersAtom = atom<ShoppingAccountSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  isActive: 'ALL',
  mallName: 'ALL',
  searchValue: '',
});
```

- [ ] **Step 2: API fetch 함수들 생성**

```typescript
// src/features/shoppingAccount/api/getShoppingAccounts.ts
import { GetShoppingAccountsResponse, ShoppingAccountSearchType } from '../types/shoppingAccount.types';

export const getShoppingAccounts = async (
  ownerId: string,
  filters: ShoppingAccountSearchType,
  page: number,
  pageSize = 10,
): Promise<GetShoppingAccountsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, filters, page, pageSize }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 목록 조회 실패');
  return response.json();
};
```

```typescript
// src/features/shoppingAccount/api/getShoppingAccount.ts
import { ShoppingAccount } from '../types/shoppingAccount.types';

export const getShoppingAccount = async (id: string): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`);
  if (!response.ok) throw new Error('쇼핑몰 계정 조회 실패');
  return response.json();
};
```

```typescript
// src/features/shoppingAccount/api/createShoppingAccount.ts
import { ShoppingAccount, CreateShoppingAccountBody } from '../types/shoppingAccount.types';

export const createShoppingAccount = async (
  body: CreateShoppingAccountBody,
  ownerId: string,
): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ownerId }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 등록 실패');
  return response.json();
};
```

```typescript
// src/features/shoppingAccount/api/updateShoppingAccount.ts
import { ShoppingAccount, UpdateShoppingAccountBody } from '../types/shoppingAccount.types';

export const updateShoppingAccount = async (id: string, body: UpdateShoppingAccountBody): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 수정 실패');
  return response.json();
};
```

```typescript
// src/features/shoppingAccount/api/deleteShoppingAccounts.ts
export const deleteShoppingAccounts = async (ids: string[]): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 삭제 실패');
};
```

```typescript
// src/features/shoppingAccount/api/updateShoppingAccountsStatus.ts
export const updateShoppingAccountsStatus = async (ids: string[], isActive: boolean): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, isActive }),
  });
  if (!response.ok) throw new Error('사용여부 변경 실패');
};
```

- [ ] **Step 3: React Query 훅들 생성**

```typescript
// src/features/shoppingAccount/api/useGetShoppingAccounts.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingAccounts } from './getShoppingAccounts';

export const SHOPPING_ACCOUNT_LIST_QUERY_KEY = 'shoppingAccountList';

export const useGetShoppingAccounts = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getShoppingAccounts(workspaceOwnerId, filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
```

```typescript
// src/features/shoppingAccount/api/useCreateShoppingAccount.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { createShoppingAccount } from './createShoppingAccount';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';
import { CreateShoppingAccountBody } from '../types/shoppingAccount.types';

export const useCreateShoppingAccount = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: CreateShoppingAccountBody) => createShoppingAccount(body, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
```

```typescript
// src/features/shoppingAccount/api/useUpdateShoppingAccount.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateShoppingAccount } from './updateShoppingAccount';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';
import { UpdateShoppingAccountBody } from '../types/shoppingAccount.types';

export const useUpdateShoppingAccount = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateShoppingAccountBody) => updateShoppingAccount(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['shoppingAccount', id] });
    },
  });
};
```

```typescript
// src/features/shoppingAccount/api/useDeleteShoppingAccounts.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteShoppingAccounts } from './deleteShoppingAccounts';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';

export const useDeleteShoppingAccounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingAccounts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
```

```typescript
// src/features/shoppingAccount/api/useUpdateShoppingAccountsStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateShoppingAccountsStatus } from './updateShoppingAccountsStatus';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';

export const useUpdateShoppingAccountsStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
      updateShoppingAccountsStatus(ids, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
```

- [ ] **Step 4: Commit**

```bash
git add src/features/shoppingAccount/store/ src/features/shoppingAccount/api/
git commit -m "feat: 쇼핑몰 계정 store 및 API 레이어 추가"
```

---

## Task 6: 검색 필터 섹션

**Files:**
- Create: `src/features/shoppingAccount/ui/list/components/AccountDateFilter.tsx`
- Create: `src/features/shoppingAccount/ui/list/components/AccountMallFilter.tsx`
- Create: `src/features/shoppingAccount/ui/list/components/AccountStatusFilter.tsx`
- Create: `src/features/shoppingAccount/ui/list/components/AccountSearchInput.tsx`
- Create: `src/features/shoppingAccount/ui/list/ShoppingAccountSearchFilterSection.tsx`

- [ ] **Step 1: 날짜 필터 컴포넌트**

```tsx
// src/features/shoppingAccount/ui/list/components/AccountDateFilter.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { RangeTypeProps } from '@/types/common.type';
import { accountDateTypeAtom, accountStartDateAtom, accountEndDateAtom } from '@/features/shoppingAccount/store/search.store';
import { ACCOUNT_DATE_TYPE } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import dayjs from 'dayjs';

export const AccountDateFilter = () => {
  const [dateType, setDateType] = useAtom(accountDateTypeAtom);
  const setStartDate = useSetAtom(accountStartDateAtom);
  const setEndDate = useSetAtom(accountEndDateAtom);

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
          {ACCOUNT_DATE_TYPE.map((item) => (
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

- [ ] **Step 2: 쇼핑몰명 필터 + 사용여부 필터 컴포넌트**

```tsx
// src/features/shoppingAccount/ui/list/components/AccountMallFilter.tsx
'use client';

import { useAtom } from 'jotai';
import { accountMallNameAtom } from '@/features/shoppingAccount/store/search.store';
import { MALL_NAME_OPTIONS, ALL_MALL_NAME } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { FilterSelect } from '@/components/common/FilterSelect';

export const AccountMallFilter = () => {
  const [mallName, setMallName] = useAtom(accountMallNameAtom);

  return (
    <FilterSelect
      label="쇼핑몰"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={mallName}
      onValueChange={setMallName}
      options={MALL_NAME_OPTIONS}
      allOption={ALL_MALL_NAME}
      triggerClassName="w-32"
    />
  );
};
```

```tsx
// src/features/shoppingAccount/ui/list/components/AccountStatusFilter.tsx
'use client';

import { useAtom } from 'jotai';
import { accountIsActiveAtom } from '@/features/shoppingAccount/store/search.store';
import { ACCOUNT_STATUS_OPTIONS, ALL_ACCOUNT_STATUS } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { FilterSelect } from '@/components/common/FilterSelect';

export const AccountStatusFilter = () => {
  const [isActive, setIsActive] = useAtom(accountIsActiveAtom);

  return (
    <FilterSelect
      label="사용여부"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={isActive}
      onValueChange={(v) => setIsActive(v as 'true' | 'false' | 'ALL')}
      options={ACCOUNT_STATUS_OPTIONS}
      allOption={ALL_ACCOUNT_STATUS}
      triggerClassName="w-32"
    />
  );
};
```

- [ ] **Step 3: 검색어 입력 컴포넌트**

```tsx
// src/features/shoppingAccount/ui/list/components/AccountSearchInput.tsx
'use client';

import { ChangeEventHandler, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import {
  getAccountSearchFilterAtom,
  committedFiltersAtom,
  currentPageAtom,
} from '@/features/shoppingAccount/store/search.store';

export const AccountSearchInput = () => {
  const draftFilters = useAtomValue(getAccountSearchFilterAtom);
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
          placeholder="쇼핑몰ID, 별명으로 검색..."
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

- [ ] **Step 4: 검색 필터 섹션 조립**

```tsx
// src/features/shoppingAccount/ui/list/ShoppingAccountSearchFilterSection.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountDateFilter } from './components/AccountDateFilter';
import { AccountStatusFilter } from './components/AccountStatusFilter';
import { AccountMallFilter } from './components/AccountMallFilter';
import { AccountSearchInput } from './components/AccountSearchInput';

export const ShoppingAccountSearchFilterSection = () => {
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
          <div className="px-6 py-1"><AccountDateFilter /></div>
          <div className="px-6 py-1 flex items-center gap-8">
            <AccountStatusFilter />
            <AccountMallFilter />
          </div>
          <div className="px-6 py-1"><AccountSearchInput /></div>
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 5: Commit**

```bash
git add src/features/shoppingAccount/ui/list/components/ \
        src/features/shoppingAccount/ui/list/ShoppingAccountSearchFilterSection.tsx
git commit -m "feat: 쇼핑몰 계정 검색 필터 섹션 추가"
```

---

## Task 7: 액션 섹션

**Files:**
- Create: `src/features/shoppingAccount/ui/list/ShoppingAccountActionSection.tsx`

- [ ] **Step 1: 액션 섹션 생성**

```tsx
// src/features/shoppingAccount/ui/list/ShoppingAccountActionSection.tsx
'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { gradeAtom } from '@/features/auth/store/auth.store';
import { selectedAccountsAtom } from '@/features/shoppingAccount/store/search.store';
import { useDeleteShoppingAccounts } from '@/features/shoppingAccount/api/useDeleteShoppingAccounts';
import { useUpdateShoppingAccountsStatus } from '@/features/shoppingAccount/api/useUpdateShoppingAccountsStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACCOUNT_STATUS_OPTIONS } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { useAlert } from '@/hooks/useAlert';

export const ShoppingAccountActionSection = () => {
  const grade = useAtomValue(gradeAtom);
  const [selectedAccounts, setSelectedAccounts] = useAtom(selectedAccountsAtom);
  const { mutate: deleteAccounts, isPending: isDeleting } = useDeleteShoppingAccounts();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateShoppingAccountsStatus();
  const { showAlert } = useAlert();
  const [statusValue, setStatusValue] = useState<string>('true');

  const canDelete = grade === 'super_admin';
  const canChangeStatus = grade === 'super_admin' || grade === 'admin';

  if (!canDelete && !canChangeStatus) return null;

  const handleDelete = () => {
    if (selectedAccounts.length === 0) {
      showAlert({ message: '삭제할 계정을 선택해주세요.', type: 'warning' });
      return;
    }
    const snapshotIds = [...selectedAccounts];
    const count = snapshotIds.length;
    showAlert({
      title: '계정 삭제',
      message: `선택한 ${count}개의 계정을 삭제하시겠습니까?`,
      showCancel: true,
      onConfirm: () => {
        deleteAccounts(snapshotIds, {
          onSuccess: () => {
            setSelectedAccounts([]);
            showAlert({ message: `${count}개의 계정이 삭제되었습니다.`, type: 'success' });
          },
        });
      },
    });
  };

  const handleChangeStatus = () => {
    if (selectedAccounts.length === 0) {
      showAlert({ message: '변경할 계정을 선택해주세요.', type: 'warning' });
      return;
    }
    const snapshotIds = [...selectedAccounts];
    updateStatus(
      { ids: snapshotIds, isActive: statusValue === 'true' },
      {
        onSuccess: () => {
          setSelectedAccounts([]);
          showAlert({ message: '사용여부가 변경되었습니다.', type: 'success' });
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-muted-foreground min-w-16">
        선택 <span className="font-medium text-foreground">{selectedAccounts.length}</span>개
      </span>
      {canDelete && (
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
          <Trash2 className="h-4 w-4 mr-2" />
          계정삭제
        </Button>
      )}
      {canChangeStatus && (
        <>
          <Select value={statusValue} onValueChange={setStatusValue}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleChangeStatus} disabled={isUpdating}>
            사용변경
          </Button>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shoppingAccount/ui/list/ShoppingAccountActionSection.tsx
git commit -m "feat: 쇼핑몰 계정 액션 섹션 추가 (권한별 노출)"
```

---

## Task 8: 테이블 섹션

**Files:**
- Create: `src/features/shoppingAccount/ui/list/components/ShoppingAccountTable.tsx`
- Create: `src/features/shoppingAccount/ui/list/ShoppingAccountTableSection.tsx`

- [ ] **Step 1: 테이블 컴포넌트 생성**

```tsx
// src/features/shoppingAccount/ui/list/components/ShoppingAccountTable.tsx
'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { selectedAccountsAtom } from '@/features/shoppingAccount/store/search.store';
import { SHOPPING_ACCOUNT_TABLE_HEAD } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';

interface ShoppingAccountTableProps {
  accounts: ShoppingAccount[];
}

export const ShoppingAccountTable = ({ accounts }: ShoppingAccountTableProps) => {
  const [selectedAccounts, setSelectedAccounts] = useAtom(selectedAccountsAtom);
  const router = useRouter();

  const handleSelectAccount = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts((prev) => [...prev, id]);
    } else {
      setSelectedAccounts((prev) => prev.filter((v) => v !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAccounts(accounts.map((a) => a.id));
    } else {
      setSelectedAccounts([]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
          <TableHead className="w-12">
            <Checkbox
              checked={accounts.length > 0 && selectedAccounts.length === accounts.length}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {SHOPPING_ACCOUNT_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className="text-center font-bold uppercase tracking-widest">
              {item.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={SHOPPING_ACCOUNT_TABLE_HEAD.length + 1}
              className="h-40 text-center text-muted-foreground text-sm"
            >
              조건에 맞는 계정이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          accounts.map((account) => (
            <TableRow
              key={account.id}
              className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30 cursor-pointer"
              onClick={() => router.push(`/shopping/accounts/${account.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedAccounts.includes(account.id)}
                  onCheckedChange={(checked: boolean) => handleSelectAccount(account.id, checked)}
                />
              </TableCell>
              <TableCell className="text-center">{account.mallName}</TableCell>
              <TableCell className="text-left">{account.nickname || '-'}</TableCell>
              <TableCell className="text-center">
                <Badge variant={account.isActive ? 'default' : 'secondary'}>
                  {account.isActive ? '사용' : '미사용'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{account.createdAt}</TableCell>
              <TableCell className="text-center">{account.updatedAt}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
```

- [ ] **Step 2: 테이블 섹션 생성**

```tsx
// src/features/shoppingAccount/ui/list/ShoppingAccountTableSection.tsx
'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { currentPageAtom, selectedAccountsAtom } from '@/features/shoppingAccount/store/search.store';
import { useGetShoppingAccounts } from '@/features/shoppingAccount/api/useGetShoppingAccounts';
import { ShoppingAccountTable } from './components/ShoppingAccountTable';

export const ShoppingAccountTableSection = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const { data, isLoading } = useGetShoppingAccounts();
  const setSelectedAccounts = useSetAtom(selectedAccountsAtom);

  useEffect(() => {
    setSelectedAccounts([]);
  }, [data, setSelectedAccounts]);

  const accounts = data?.accounts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-[3px] rounded-full bg-primary" />
            <CardTitle className="text-sm">계정 목록</CardTitle>
          </div>
          <CardDescription>총 {isLoading ? '-' : total}개의 계정</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <ShoppingAccountTable accounts={accounts} />
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

- [ ] **Step 3: Commit**

```bash
git add src/features/shoppingAccount/ui/list/components/ShoppingAccountTable.tsx \
        src/features/shoppingAccount/ui/list/ShoppingAccountTableSection.tsx
git commit -m "feat: 쇼핑몰 계정 테이블 섹션 추가"
```

---

## Task 9: 목록 페이지 조립 + 라우트

**Files:**
- Create: `src/features/shoppingAccount/ui/list/ShoppingAccountListHeaderSection.tsx`
- Create: `src/features/shoppingAccount/ui/list/ShoppingAccountListLayout.tsx`
- Create: `src/app/(authenticated)/shopping/accounts/page.tsx`

- [ ] **Step 1: 헤더 섹션 생성**

```tsx
// src/features/shoppingAccount/ui/list/ShoppingAccountListHeaderSection.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { gradeAtom } from '@/features/auth/store/auth.store';

export const ShoppingAccountListHeaderSection = () => {
  const router = useRouter();
  const grade = useAtomValue(gradeAtom);
  const canRegister = grade === 'super_admin' || grade === 'admin';

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 계정관리</h1>
        <p className="text-muted-foreground">외부 쇼핑 플랫폼 연동 계정을 관리하세요.</p>
      </div>
      {canRegister && (
        <Button onClick={() => router.push('/shopping/accounts/create')}>
          <Plus className="h-4 w-4 mr-2" />
          계정 등록
        </Button>
      )}
    </div>
  );
};
```

- [ ] **Step 2: 레이아웃 조립**

```tsx
// src/features/shoppingAccount/ui/list/ShoppingAccountListLayout.tsx
'use client';

import { ShoppingAccountListHeaderSection } from './ShoppingAccountListHeaderSection';
import { ShoppingAccountSearchFilterSection } from './ShoppingAccountSearchFilterSection';
import { ShoppingAccountActionSection } from './ShoppingAccountActionSection';
import { ShoppingAccountTableSection } from './ShoppingAccountTableSection';

export const ShoppingAccountListLayout = () => {
  return (
    <>
      <ShoppingAccountListHeaderSection />
      <ShoppingAccountSearchFilterSection />
      <ShoppingAccountActionSection />
      <ShoppingAccountTableSection />
    </>
  );
};
```

- [ ] **Step 3: 페이지 라우트 생성**

```tsx
// src/app/(authenticated)/shopping/accounts/page.tsx
import { ShoppingAccountListLayout } from '@/features/shoppingAccount/ui/list/ShoppingAccountListLayout';

export default function ShoppingAccountsPage() {
  return <ShoppingAccountListLayout />;
}
```

- [ ] **Step 4: 개발 서버 실행 후 목록 페이지 확인**

```bash
npm run dev
```

브라우저에서 `/shopping/accounts` 접속 후 확인:
- 사이드바에 "쇼핑몰 계정관리" 메뉴가 보인다
- 목록 페이지가 렌더링되고 Mock 데이터 7건이 표시된다
- 검색 필터(날짜, 사용여부, 쇼핑몰, 검색어)가 동작한다
- 권한별로 액션 버튼이 정상 노출/숨김된다

- [ ] **Step 5: Commit**

```bash
git add src/features/shoppingAccount/ui/list/ShoppingAccountListHeaderSection.tsx \
        src/features/shoppingAccount/ui/list/ShoppingAccountListLayout.tsx \
        src/app/(authenticated)/shopping/accounts/page.tsx
git commit -m "feat: 쇼핑몰 계정 목록 페이지 완성"
```

---

## Task 10: 공유 폼 컴포넌트

**Files:**
- Create: `src/features/shoppingAccount/ui/components/ShoppingAccountForm.tsx`

- [ ] **Step 1: Zod 스키마 + 폼 컴포넌트 생성**

```tsx
// src/features/shoppingAccount/ui/components/ShoppingAccountForm.tsx
'use client';

import { z } from 'zod';
import { Controller, useFormContext } from 'react-hook-form';
import { PHONE_REGEX } from '@/shared/utils/phone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { MALL_NAME_OPTIONS, ACCOUNT_STATUS_OPTIONS } from '@/features/shoppingAccount/constant/shoppingAccount.constants';

export const shoppingAccountSchema = z.object({
  mallName: z.string().min(1, '쇼핑몰을 선택해주세요.'),
  mallId: z.string().min(1, '쇼핑몰 ID를 입력해주세요.'),
  password: z.string().min(1, '패스워드를 입력해주세요.'),
  isActive: z.boolean(),
  nickname: z.string().optional(),
  managerMd: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || PHONE_REGEX.test(val), { message: '올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)' }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: '올바른 이메일 형식이 아닙니다.' }),
  domain: z.string().optional(),
  category: z.string().optional(),
  apiKey: z.string().optional(),
});

export type ShoppingAccountFormData = z.infer<typeof shoppingAccountSchema>;

export const ShoppingAccountForm = () => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ShoppingAccountFormData>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">계정 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {/* 쇼핑몰 선택 */}
          <div className="space-y-2">
            <Controller
              name="mallName"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <FilterSelect
                    label="쇼핑몰 *"
                    divClassName="space-y-2"
                    triggerClassName="w-full"
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    options={MALL_NAME_OPTIONS}
                    placeholder="쇼핑몰을 선택하세요."
                  />
                  {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
                </div>
              )}
            />
          </div>

          {/* 패스워드 */}
          <div className="space-y-2">
            <Label htmlFor="password">패스워드 *</Label>
            <Input id="password" type="password" {...register('password')} placeholder="패스워드를 입력하세요." />
            {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
          </div>

          {/* 사용여부 */}
          <div className="space-y-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FilterSelect
                  label="사용여부"
                  divClassName="space-y-2"
                  triggerClassName="w-full"
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(v) => field.onChange(v === 'true')}
                  options={ACCOUNT_STATUS_OPTIONS}
                />
              )}
            />
          </div>

          {/* 별명 */}
          <div className="space-y-2">
            <Label htmlFor="nickname">별명</Label>
            <Input id="nickname" type="text" {...register('nickname')} placeholder="별명을 입력하세요." />
          </div>

          {/* 쇼핑몰 ID */}
          <div className="space-y-2">
            <Label htmlFor="mallId">쇼핑몰 ID *</Label>
            <Input id="mallId" type="text" {...register('mallId')} placeholder="쇼핑몰 계정 ID를 입력하세요." />
            {errors.mallId && <p className="text-red-500 text-sm">{errors.mallId.message}</p>}
          </div>

          {/* 담당 MD */}
          <div className="space-y-2">
            <Label htmlFor="managerMd">담당 MD</Label>
            <Input id="managerMd" type="text" {...register('managerMd')} placeholder="담당 MD를 입력하세요." />
          </div>

          {/* 연락처 */}
          <div className="space-y-2">
            <Label htmlFor="phone">연락처</Label>
            <Input id="phone" type="tel" {...register('phone')} placeholder="010-1234-5678" />
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
          </div>

          {/* 이메일 */}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" {...register('email')} placeholder="이메일을 입력하세요." />
            {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
          </div>

          {/* 도메인 */}
          <div className="space-y-2">
            <Label htmlFor="domain">도메인</Label>
            <Input id="domain" type="text" {...register('domain')} placeholder="https://example.com" />
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label htmlFor="category">카테고리</Label>
            <Input id="category" type="text" {...register('category')} placeholder="카테고리를 입력하세요." />
          </div>

          {/* 연동 API */}
          <div className="col-span-2 space-y-2">
            <Label htmlFor="apiKey">연동 API</Label>
            <Input id="apiKey" type="text" {...register('apiKey')} placeholder="API 키를 입력하세요." />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shoppingAccount/ui/components/ShoppingAccountForm.tsx
git commit -m "feat: 쇼핑몰 계정 공유 폼 컴포넌트 추가 (Zod 스키마 포함)"
```

---

## Task 11: 등록 페이지

**Files:**
- Create: `src/features/shoppingAccount/ui/create/ShoppingAccountCreateLayout.tsx`
- Create: `src/app/(authenticated)/shopping/accounts/create/page.tsx`

- [ ] **Step 1: 등록 레이아웃 생성**

```tsx
// src/features/shoppingAccount/ui/create/ShoppingAccountCreateLayout.tsx
'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { useCreateShoppingAccount } from '@/features/shoppingAccount/api/useCreateShoppingAccount';
import {
  ShoppingAccountForm,
  ShoppingAccountFormData,
  shoppingAccountSchema,
} from '@/features/shoppingAccount/ui/components/ShoppingAccountForm';
import { CreateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';

export const ShoppingAccountCreateLayout = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { mutate, isPending } = useCreateShoppingAccount();

  const form = useForm<ShoppingAccountFormData>({
    resolver: zodResolver(shoppingAccountSchema),
    defaultValues: {
      mallName: '',
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
    },
  });

  const onSubmit = (data: ShoppingAccountFormData) => {
    const body: CreateShoppingAccountBody = {
      mallName: data.mallName,
      mallId: data.mallId,
      password: data.password,
      isActive: data.isActive,
      nickname: data.nickname ?? '',
      managerMd: data.managerMd ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      domain: data.domain ?? '',
      category: data.category ?? '',
      apiKey: data.apiKey ?? '',
    };
    mutate(body, {
      onSuccess: () => {
        showAlert({
          type: 'success',
          message: '쇼핑몰 계정이 등록되었습니다.',
          onConfirm: () => router.push('/shopping/accounts'),
        });
      },
      onError: () => {
        showAlert({ type: 'error', message: '쇼핑몰 계정 등록에 실패했습니다.' });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 계정 등록</h1>
        <p className="text-muted-foreground">새로운 쇼핑몰 계정을 등록하세요.</p>
      </div>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ShoppingAccountForm />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              초기화
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/shopping/accounts')}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              저장
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
```

- [ ] **Step 2: 페이지 라우트 생성**

```tsx
// src/app/(authenticated)/shopping/accounts/create/page.tsx
import { ShoppingAccountCreateLayout } from '@/features/shoppingAccount/ui/create/ShoppingAccountCreateLayout';

export default function ShoppingAccountCreatePage() {
  return <ShoppingAccountCreateLayout />;
}
```

- [ ] **Step 3: 개발 서버에서 등록 페이지 확인**

브라우저에서 `/shopping/accounts/create` 접속 후 확인:
- 10개 필드가 2컬럼 그리드로 표시된다
- 필수 항목(쇼핑몰, 쇼핑몰 ID, 패스워드) 미입력 시 에러 메시지가 표시된다
- 저장 성공 시 목록 페이지로 이동하고 새 계정이 목록에 나타난다
- 초기화 버튼이 폼을 기본값으로 리셋한다

- [ ] **Step 4: Commit**

```bash
git add src/features/shoppingAccount/ui/create/ \
        src/app/(authenticated)/shopping/accounts/create/
git commit -m "feat: 쇼핑몰 계정 등록 페이지 추가"
```

---

## Task 12: 수정 페이지

**Files:**
- Create: `src/features/shoppingAccount/ui/[id]/ShoppingAccountModifyLayout.tsx`
- Create: `src/app/(authenticated)/shopping/accounts/[id]/page.tsx`

- [ ] **Step 1: 수정 레이아웃 생성**

```tsx
// src/features/shoppingAccount/ui/[id]/ShoppingAccountModifyLayout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { getShoppingAccount } from '@/features/shoppingAccount/api/getShoppingAccount';
import { useUpdateShoppingAccount } from '@/features/shoppingAccount/api/useUpdateShoppingAccount';
import {
  ShoppingAccountForm,
  ShoppingAccountFormData,
  shoppingAccountSchema,
} from '@/features/shoppingAccount/ui/components/ShoppingAccountForm';
import { UpdateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';

type Props = {
  accountId: string;
};

export const ShoppingAccountModifyLayout = ({ accountId }: Props) => {
  const router = useRouter();
  const { showAlert } = useAlert();

  const { data, isSuccess } = useQuery({
    queryKey: ['shoppingAccount', accountId],
    queryFn: () => getShoppingAccount(accountId),
  });

  const { mutate, isPending } = useUpdateShoppingAccount(accountId);

  const form = useForm<ShoppingAccountFormData>({
    resolver: zodResolver(shoppingAccountSchema),
    defaultValues: {
      mallName: '',
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
    },
  });

  useEffect(() => {
    if (isSuccess && data) {
      form.reset({
        mallName: data.mallName,
        mallId: data.mallId,
        password: data.password,
        isActive: data.isActive,
        nickname: data.nickname,
        managerMd: data.managerMd,
        phone: data.phone,
        email: data.email,
        domain: data.domain,
        category: data.category,
        apiKey: data.apiKey,
      });
    }
  }, [isSuccess, data, form]);

  const onSubmit = (formData: ShoppingAccountFormData) => {
    const body: UpdateShoppingAccountBody = {
      mallName: formData.mallName,
      mallId: formData.mallId,
      password: formData.password,
      isActive: formData.isActive,
      nickname: formData.nickname ?? '',
      managerMd: formData.managerMd ?? '',
      phone: formData.phone ?? '',
      email: formData.email ?? '',
      domain: formData.domain ?? '',
      category: formData.category ?? '',
      apiKey: formData.apiKey ?? '',
    };
    mutate(body, {
      onSuccess: () => {
        showAlert({
          type: 'success',
          message: '쇼핑몰 계정이 수정되었습니다.',
          onConfirm: () => router.push('/shopping/accounts'),
        });
      },
      onError: () => {
        showAlert({ type: 'error', message: '쇼핑몰 계정 수정에 실패했습니다.' });
      },
    });
  };

  const handleReset = () => {
    if (data) {
      form.reset({
        mallName: data.mallName,
        mallId: data.mallId,
        password: data.password,
        isActive: data.isActive,
        nickname: data.nickname,
        managerMd: data.managerMd,
        phone: data.phone,
        email: data.email,
        domain: data.domain,
        category: data.category,
        apiKey: data.apiKey,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 계정 수정</h1>
        <p className="text-muted-foreground">쇼핑몰 계정 정보를 수정하세요.</p>
      </div>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ShoppingAccountForm />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleReset}>
              초기화
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/shopping/accounts')}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              저장
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
```

- [ ] **Step 2: 페이지 라우트 생성**

```tsx
// src/app/(authenticated)/shopping/accounts/[id]/page.tsx
import { ShoppingAccountModifyLayout } from '@/features/shoppingAccount/ui/[id]/ShoppingAccountModifyLayout';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ShoppingAccountModifyPage({ params }: Props) {
  const { id } = await params;
  return <ShoppingAccountModifyLayout accountId={id} />;
}
```

- [ ] **Step 3: 개발 서버에서 수정 페이지 확인**

브라우저에서 목록의 계정 행 클릭 후 수정 페이지 확인:
- 기존 계정 데이터가 폼에 자동으로 채워진다
- 초기화 버튼이 서버에서 받은 원본값으로 복원된다
- 저장 성공 시 목록 페이지로 이동하고 변경된 내용이 반영된다

- [ ] **Step 4: Commit**

```bash
git add src/features/shoppingAccount/ui/[id]/ \
        src/app/(authenticated)/shopping/accounts/[id]/
git commit -m "feat: 쇼핑몰 계정 수정 페이지 추가"
```
