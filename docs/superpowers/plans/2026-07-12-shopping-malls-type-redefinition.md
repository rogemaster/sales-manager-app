# ShoppingMalls 관련 타입 재정의 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 쇼핑몰(mall) 도메인의 레거시 중복 타입을 제거하고, 이름-의미가 어긋난 필드를 바로잡고, 미사용 필드를 정리한다.

**Architecture:** legacy `MallAccount`를 삭제하고 `shoppingAccount` 도메인에 경량 조회 API(`getShoppingAccountsByMall`)를 신설해 `order/collect`가 이를 사용하도록 마이그레이션한다. `order/collect`, `order/list` 양쪽에서 `mallAccountId`라는 이름으로 실제로는 로그인 아이디(`mallId`) 값이 담기던 필드를 `mallId`로 정정하고, 느슨하게 `string`으로 선언돼 있던 몰 코드 검색 필드를 `ShoppingMalls | 'ALL'`로 엄격화한다.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Jotai, TanStack Query, MSW, Vitest.

**선행 문서:** `docs/superpowers/specs/2026-07-12-shopping-malls-type-redefinition-design.md`

## Global Constraints

- 커밋은 사용자가 명시적으로 요청한 경우에만 실제로 실행한다 (CLAUDE.md Git/PR 규칙). 각 Task의 "커밋" 스텝은 안내용 커맨드이며, 실행 주체(에이전트/스킬)는 자동으로 실행하지 않는다.
- 테스트 커버리지는 `src/mocks/utils/`(순수 비즈니스 로직)에만 존재하는 프로젝트 컨벤션이다. UI 컴포넌트, React Query 훅, fetch API 함수는 테스트 파일을 만들지 않는다 (CLAUDE.md).
- 새 API 추가 시 `src/app/api/.../route.ts` 파일을 생성하지 않는다 — MSW 핸들러(`src/mocks/handlers/*.ts`)에만 추가한다 (msw-rules).
- 고정경로(`/list`, `/by-mall`, `/status` 등)는 동적경로(`/:id`)보다 먼저 등록한다 (msw-rules).
- Prettier: `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`.
- Task 순서를 반드시 지킨다 — Task 3은 Task 2가 만드는 `useGetShoppingAccountsByMall`을 사용한다.

---

### Task 1: `SHOPPING_MALLS`/`ShoppingMallType`에서 미사용 `isActive` 제거

**Files:**
- Modify: `src/types/common.type.ts`
- Modify: `src/shared/constant/shoppingMall.constant.ts`

**Interfaces:**
- Consumes: 없음 (독립 작업)
- Produces: `ShoppingMallType { code: string; name: string }` — 이후 모든 Task가 이 형태를 그대로 사용

- [ ] **Step 1: `ShoppingMallType`에서 `isActive` 필드 제거**

`src/types/common.type.ts`의 기존 블록:

```ts
export interface ShoppingMallType {
  code: string;
  name: string;
  isActive: boolean;
}
```

다음으로 교체:

```ts
export interface ShoppingMallType {
  code: string;
  name: string;
}
```

- [ ] **Step 2: `SHOPPING_MALLS` 배열에서 `isActive: false,` 라인 전부 제거**

`src/shared/constant/shoppingMall.constant.ts` 전체를 다음으로 교체:

```ts
import { ShoppingMallType } from '@/types/common.type';

export const SHOPPING_MALLS: ShoppingMallType[] = [
  { code: 'AUC', name: '옥션' },
  { code: 'GMK', name: '지마켓' },
  { code: '11ST', name: '11번가' },
  { code: 'INTP', name: '인터파크' },
  { code: 'NSST', name: '스마트스토어' },
  { code: 'COUP', name: '쿠팡' },
  { code: 'CJH', name: 'CJ홈쇼핑' },
  { code: 'GSH', name: 'GS홈쇼핑' },
  { code: 'LOTH', name: '롯데홈쇼핑' },
  { code: 'SSGC', name: 'SSG' },
  { code: 'HDH', name: '현대홈쇼핑' },
  { code: 'OHOU', name: '오늘의집' },
  { code: 'HALF', name: '하프클럽' },
  { code: 'MUSIN', name: '무신사스토어' },
  { code: 'KAKAOS', name: '카카오스토어' },
  { code: 'MUST', name: '머스트잇' },
];
```

- [ ] **Step 3: 빌드로 회귀 확인**

Run: `npm run build`
Expected: 컴파일 성공 (`isActive`를 참조하는 코드가 없으므로 에러 없음)

- [ ] **Step 4: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add src/types/common.type.ts src/shared/constant/shoppingMall.constant.ts
git commit -m "refactor: SHOPPING_MALLS에서 미사용 isActive 필드 제거"
```

---

### Task 2: `shoppingAccount` 도메인에 `getShoppingAccountsByMall` 경량 조회 API 신설

**Files:**
- Modify: `src/features/shoppingAccount/types/shoppingAccount.types.ts`
- Create: `src/mocks/utils/getShoppingAccountsByMall.ts`
- Create: `src/mocks/utils/getShoppingAccountsByMall.test.ts`
- Modify: `src/mocks/handlers/shoppingAccounts.ts`
- Create: `src/features/shoppingAccount/api/getShoppingAccountsByMall.ts`
- Create: `src/features/shoppingAccount/api/useGetShoppingAccountsByMall.ts`

**Interfaces:**
- Consumes: `ShoppingAccount`(`src/features/shoppingAccount/types/shoppingAccount.types.ts`), `MOCK_SHOPPING_ACCOUNTS_DATA`(`src/mocks/data/MockShoppingAccountsData.ts`), `workspaceOwnerIdAtom`(`@/features/auth/store/auth.store`)
- Produces: `MallAccountOption { id: string; mallCode: ShoppingMalls; mallId: string }`, `getShoppingAccountsByMall(ownerId: string, mallCode: ShoppingMalls): Promise<MallAccountOption[]>`, `useGetShoppingAccountsByMall(mallCode: ShoppingMalls | 'ALL')` 훅(`{ data: MallAccountOption[] | undefined, ... }`) — Task 3에서 사용

- [ ] **Step 1: mock 유틸 실패 테스트 작성**

`src/mocks/utils/getShoppingAccountsByMall.test.ts` 생성:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';

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

const { ACCOUNTS } = vi.hoisted(() => ({ ACCOUNTS: [] as ShoppingAccount[] }));
vi.mock('../data/MockShoppingAccountsData', () => ({ MOCK_SHOPPING_ACCOUNTS_DATA: ACCOUNTS }));

ACCOUNTS.push(
  makeAccount({ id: 'sa_001', ownerId: 'usr_001', mallCode: 'COUP', mallId: 'coupang_seller_001', isActive: true }),
  makeAccount({ id: 'sa_002', ownerId: 'usr_001', mallCode: 'NSST', mallId: 'naver_store_002', isActive: true }),
  makeAccount({ id: 'sa_003', ownerId: 'usr_001', mallCode: 'COUP', mallId: 'coupang_seller_003', isActive: false }),
  makeAccount({ id: 'sa_004', ownerId: 'usr_005', mallCode: 'COUP', mallId: 'coupang_seller_004', isActive: true }),
);

import { getMockShoppingAccountsByMall } from './getShoppingAccountsByMall';

describe('getMockShoppingAccountsByMall', () => {
  it('ownerId와 mallCode가 모두 일치하는 활성 계정만 반환한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'COUP');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sa_001');
  });

  it('isActive가 false인 계정은 제외한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'COUP');
    expect(result.find((a) => a.id === 'sa_003')).toBeUndefined();
  });

  it('다른 owner의 계정은 제외한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'COUP');
    expect(result.find((a) => a.id === 'sa_004')).toBeUndefined();
  });

  it('mallCode가 일치하지 않으면 빈 배열을 반환한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'HALF');
    expect(result).toHaveLength(0);
  });

  it('응답 객체는 id/mallCode/mallId만 포함한다', () => {
    const result = getMockShoppingAccountsByMall('usr_001', 'COUP');
    expect(result[0]).toEqual({ id: 'sa_001', mallCode: 'COUP', mallId: 'coupang_seller_001' });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test -- getShoppingAccountsByMall`
Expected: FAIL — `Cannot find module './getShoppingAccountsByMall'` (아직 구현 파일 없음)

- [ ] **Step 3: `MallAccountOption` 타입 추가**

`src/features/shoppingAccount/types/shoppingAccount.types.ts`의 `CreateShoppingAccountBody`/`UpdateShoppingAccountBody` 아래에 추가:

```ts
export interface MallAccountOption {
  id: string;
  mallCode: ShoppingMalls;
  mallId: string;
}
```

- [ ] **Step 4: mock 유틸 최소 구현**

`src/mocks/utils/getShoppingAccountsByMall.ts` 생성:

```ts
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { MallAccountOption } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { ShoppingMalls } from '@/types/common.type';

export const getMockShoppingAccountsByMall = (ownerId: string, mallCode: ShoppingMalls): MallAccountOption[] => {
  return MOCK_SHOPPING_ACCOUNTS_DATA.filter(
    (account) => account.ownerId === ownerId && account.mallCode === mallCode && account.isActive,
  ).map(({ id, mallCode, mallId }) => ({ id, mallCode, mallId }));
};
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm run test -- getShoppingAccountsByMall`
Expected: PASS (5개 테스트 전부)

- [ ] **Step 6: MSW 핸들러 추가**

`src/mocks/handlers/shoppingAccounts.ts` 상단 import에 추가:

```ts
import { getMockShoppingAccountsByMall } from '../utils/getShoppingAccountsByMall';
import { ShoppingMalls } from '@/types/common.type';
```

`shoppingAccountHandlers` 배열의 `/list` 핸들러 바로 다음(다른 `/:id` 핸들러들보다 앞)에 추가:

```ts
  http.post(`${baseUrl}/api/shopping/accounts/by-mall`, async ({ request }) => {
    const { ownerId, mallCode } = (await request.json()) as { ownerId: string; mallCode: ShoppingMalls };
    return HttpResponse.json(getMockShoppingAccountsByMall(ownerId, mallCode));
  }),
```

- [ ] **Step 7: 클라이언트 API 함수 작성**

`src/features/shoppingAccount/api/getShoppingAccountsByMall.ts` 생성:

```ts
import { MallAccountOption } from '../types/shoppingAccount.types';
import { ShoppingMalls } from '@/types/common.type';

export const getShoppingAccountsByMall = async (
  ownerId: string,
  mallCode: ShoppingMalls,
): Promise<MallAccountOption[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/by-mall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, mallCode }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 목록 조회 실패');
  return response.json();
};
```

- [ ] **Step 8: React Query 훅 작성**

`src/features/shoppingAccount/api/useGetShoppingAccountsByMall.ts` 생성:

```ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingAccountsByMall } from './getShoppingAccountsByMall';
import { ShoppingMalls } from '@/types/common.type';

export const MALL_ACCOUNT_OPTIONS_QUERY_KEY = 'mallAccountOptions';

export const useGetShoppingAccountsByMall = (mallCode: ShoppingMalls | 'ALL') => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [MALL_ACCOUNT_OPTIONS_QUERY_KEY, workspaceOwnerId, mallCode],
    queryFn: () => getShoppingAccountsByMall(workspaceOwnerId, mallCode as ShoppingMalls),
    enabled: !!workspaceOwnerId && mallCode !== 'ALL',
  });
};
```

- [ ] **Step 9: 빌드 확인**

Run: `npm run build`
Expected: 컴파일 성공

- [ ] **Step 10: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add src/features/shoppingAccount/types/shoppingAccount.types.ts \
        src/mocks/utils/getShoppingAccountsByMall.ts \
        src/mocks/utils/getShoppingAccountsByMall.test.ts \
        src/mocks/handlers/shoppingAccounts.ts \
        src/features/shoppingAccount/api/getShoppingAccountsByMall.ts \
        src/features/shoppingAccount/api/useGetShoppingAccountsByMall.ts
git commit -m "feat: shoppingAccount 도메인에 몰별 경량 계정 조회 API 추가"
```

---

### Task 3: `order/collect` 마이그레이션 (레거시 `MallAccount` 삭제 포함)

**Files:**
- Modify: `src/features/order/types/collection.types.ts`
- Modify: `src/features/order/store/collect.store.ts`
- Modify: `src/features/order/ui/collect/components/CollectionMallFilter.tsx`
- Modify: `src/features/order/ui/collect/CollectionFilterSection.tsx`
- Modify: `src/features/order/ui/collect/CollectionTableSection.tsx`
- Modify: `src/mocks/data/MockCollectionJobsData.ts`
- Modify: `src/mocks/utils/getCollectionJobs.ts`
- Modify: `src/mocks/handlers/collection.ts`
- Modify: `src/features/order/api/getCollectionJobs.ts`
- Delete: `src/shared/types/mallAccount.types.ts`
- Delete: `src/shared/api/getMallAccounts.ts`
- Delete: `src/shared/api/createMallAccount.ts`
- Delete: `src/shared/api/deleteMallAccount.ts`
- Delete: `src/mocks/handlers/mallAccounts.ts`
- Delete: `src/mocks/utils/mallAccounts.ts`
- Delete: `src/mocks/data/MockShoppingMallAccountsData.ts`
- Modify: `src/mocks/handlers.ts`

**Interfaces:**
- Consumes: Task 2의 `useGetShoppingAccountsByMall(mallCode: ShoppingMalls | 'ALL')`, `MallAccountOption`
- Produces: `CollectionJob.mallId: string`(변경 전 `mallAccountId`), `CollectionSearchParams.mallId: string`(변경 전 `mallAccountId`), `CollectionSearchParams.mallCode: ShoppingMalls | 'ALL'`(변경 전 `string`)

- [ ] **Step 1: `CollectionJob`/`CollectionSearchParams` 타입 변경**

`src/features/order/types/collection.types.ts` 전체를 다음으로 교체:

```ts
// src/features/order/types/collection.types.ts
import { ShoppingMalls } from '@/types/common.type';

export type CollectionStatus = 'WAITING' | 'COLLECTING' | 'COMPLETED' | 'FAILED';

export interface CollectionJob {
  id: string;
  mallName: ShoppingMalls;
  mallId: string;
  status: CollectionStatus;
  lastCollectedAt: string | null;
  totalCount?: number;
  collectedCount?: number;
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

- [ ] **Step 2: `collect.store.ts` atom 이름/타입 변경**

`src/features/order/store/collect.store.ts` 전체를 다음으로 교체:

```ts
// src/features/order/store/collect.store.ts
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { CollectionSearchParams } from '../types/collection.types';
import { ShoppingMalls } from '@/types/common.type';

const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const collectStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const collectEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const collectMallAtom = atom<ShoppingMalls | 'ALL'>('ALL');
export const collectMallIdAtom = atom<string>('ALL');
export const selectedJobIdsAtom = atom<string[]>([]);

export const collectSearchParamsAtom = atom<CollectionSearchParams>({
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mallCode: 'ALL',
  mallId: 'ALL',
});
```

- [ ] **Step 3: `CollectionMallFilter.tsx`를 신규 API로 마이그레이션**

`src/features/order/ui/collect/components/CollectionMallFilter.tsx` 전체를 다음으로 교체:

```tsx
// src/features/order/ui/collect/components/CollectionMallFilter.tsx
'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collectMallAtom, collectMallIdAtom } from '@/features/order/store/collect.store';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { useGetShoppingAccountsByMall } from '@/features/shoppingAccount/api/useGetShoppingAccountsByMall';
import { FilterOption, ShoppingMalls } from '@/types/common.type';

const ALL_OPTION: FilterOption = { id: 'ALL', name: '전체' };

export const CollectionMallFilter = () => {
  const [mall, setMall] = useAtom(collectMallAtom);
  const [mallId, setMallId] = useAtom(collectMallIdAtom);

  const mallOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...SHOPPING_MALLS.map((m) => ({ id: m.code, name: m.name }))],
    [],
  );

  const { data: mallAccounts = [] } = useGetShoppingAccountsByMall(mall);

  const accountOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...mallAccounts.map((a) => ({ id: a.mallId, name: a.mallId }))],
    [mallAccounts],
  );

  const handleMallChange = (value: string) => {
    setMall(value as ShoppingMalls | 'ALL');
    setMallId('ALL');
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 shrink-0 text-right">쇼핑몰</Label>
      <Select value={mall} onValueChange={handleMallChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="쇼핑몰 선택" />
        </SelectTrigger>
        <SelectContent>
          {mallOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={mallId} onValueChange={setMallId} disabled={mall === 'ALL'}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="아이디 선택" />
        </SelectTrigger>
        <SelectContent>
          {accountOptions.map((option) => (
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

- [ ] **Step 4: `CollectionFilterSection.tsx` atom 참조 갱신**

`src/features/order/ui/collect/CollectionFilterSection.tsx` 전체를 다음으로 교체:

```tsx
'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CollectionDateFilter } from './components/CollectionDateFilter';
import { CollectionMallFilter } from './components/CollectionMallFilter';
import {
  collectStartDateAtom,
  collectEndDateAtom,
  collectMallAtom,
  collectMallIdAtom,
  collectSearchParamsAtom,
  selectedJobIdsAtom,
} from '@/features/order/store/collect.store';

export const CollectionFilterSection = () => {
  const startDate = useAtomValue(collectStartDateAtom);
  const endDate = useAtomValue(collectEndDateAtom);
  const mallCode = useAtomValue(collectMallAtom);
  const mallId = useAtomValue(collectMallIdAtom);
  const setSearchParams = useSetAtom(collectSearchParamsAtom);
  const setSelectedJobIds = useSetAtom(selectedJobIdsAtom);

  const handleSearch = () => {
    setSelectedJobIds([]);
    setSearchParams({ startDate, endDate, mallCode, mallId });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">검색 필터</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          <div className="px-6 py-1"><CollectionDateFilter /></div>
          <div className="flex items-center justify-between px-6 py-1">
            <CollectionMallFilter />
            <Button onClick={handleSearch}>검색</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 5: `CollectionTableSection.tsx`의 필드 참조 갱신**

`src/features/order/ui/collect/CollectionTableSection.tsx`에서:

```tsx
<TableCell className="text-center">{job.mallAccountId}</TableCell>
```

다음으로 교체:

```tsx
<TableCell className="text-center">{job.mallId}</TableCell>
```

- [ ] **Step 6: mock 데이터 필드명 갱신**

`src/mocks/data/MockCollectionJobsData.ts` 전체를 다음으로 교체 (6개 레코드 전부 `mallAccountId` → `mallId`):

```ts
// src/mocks/data/MockCollectionJobsData.ts
import { CollectionJob } from '@/features/order/types/collection.types';

export const MOCK_COLLECTION_JOBS: CollectionJob[] = [
  {
    id: 'JOB-001',
    mallName: 'COUP',
    mallId: 'coupang_seller1',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-25 09:00:00',
    totalCount: 150,
    collectedCount: 150,
  },
  {
    id: 'JOB-002',
    mallName: 'GMK',
    mallId: 'gadmin1111',
    status: 'WAITING',
    lastCollectedAt: null,
  },
  {
    id: 'JOB-003',
    mallName: 'NSST',
    mallId: 'naver_store1',
    status: 'FAILED',
    lastCollectedAt: '2026-05-24 15:30:00',
    totalCount: 200,
    collectedCount: 87,
  },
  {
    id: 'JOB-004',
    mallName: 'AUC',
    mallId: 'auction_admin1',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-25 08:00:00',
    totalCount: 300,
    collectedCount: 300,
  },
  {
    id: 'JOB-005',
    mallName: '11ST',
    mallId: 'elevenst_shop1',
    status: 'WAITING',
    lastCollectedAt: null,
  },
  {
    id: 'JOB-006',
    mallName: 'INTP',
    mallId: 'ipark_seller',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-23 11:00:00',
    totalCount: 80,
    collectedCount: 80,
  },
];
```

- [ ] **Step 7: mock 유틸 필터링 로직 갱신**

`src/mocks/utils/getCollectionJobs.ts`에서:

```ts
  return MOCK_COLLECTION_JOBS.filter((job) => {
    if (params.mallCode !== 'ALL' && job.mallName !== params.mallCode) return false;
    if (params.mallAccountId !== 'ALL' && job.mallAccountId !== params.mallAccountId) return false;
    return true;
  });
```

다음으로 교체:

```ts
  return MOCK_COLLECTION_JOBS.filter((job) => {
    if (params.mallCode !== 'ALL' && job.mallName !== params.mallCode) return false;
    if (params.mallId !== 'ALL' && job.mallId !== params.mallId) return false;
    return true;
  });
```

- [ ] **Step 8: MSW 핸들러 쿼리 파싱 갱신**

`src/mocks/handlers/collection.ts` 전체를 다음으로 교체:

```ts
import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { CollectionSearchParams, TriggerCollectionBody } from '@/features/order/types/collection.types';
import { getCollectionJobsMock } from '../utils/getCollectionJobs';
import { triggerOrderCollectionMock } from '../utils/triggerOrderCollection';
import { ShoppingMalls } from '@/types/common.type';

export const collectionHandlers = [
  http.get(`${baseUrl}/api/order/collection/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const params: CollectionSearchParams = {
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
      mallCode: (url.searchParams.get('mallCode') ?? 'ALL') as ShoppingMalls | 'ALL',
      mallId: url.searchParams.get('mallId') ?? 'ALL',
    };
    return HttpResponse.json(getCollectionJobsMock(params));
  }),

  http.post(`${baseUrl}/api/order/collection/trigger`, async ({ request }) => {
    await delay(300);
    const { jobIds } = (await request.json()) as TriggerCollectionBody;
    const triggeredCount = triggerOrderCollectionMock(jobIds);
    return HttpResponse.json({ success: true, triggeredCount });
  }),
];
```

- [ ] **Step 9: 클라이언트 API 함수의 쿼리 빌드 갱신**

`src/features/order/api/getCollectionJobs.ts` 전체를 다음으로 교체:

```ts
// src/features/order/api/getCollectionJobs.ts
import { CollectionJob, CollectionSearchParams } from '../types/collection.types';

export async function getCollectionJobs(params: CollectionSearchParams): Promise<CollectionJob[]> {
  const query = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    mallCode: params.mallCode,
    mallId: params.mallId,
  });
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/jobs?${query}`);
  if (!response.ok) throw new Error('수집 작업 목록 조회 실패');
  return response.json();
}
```

- [ ] **Step 10: 레거시 `MallAccount` 계열 파일 삭제**

```bash
rm src/shared/types/mallAccount.types.ts
rm src/shared/api/getMallAccounts.ts
rm src/shared/api/createMallAccount.ts
rm src/shared/api/deleteMallAccount.ts
rm src/mocks/handlers/mallAccounts.ts
rm src/mocks/utils/mallAccounts.ts
rm src/mocks/data/MockShoppingMallAccountsData.ts
```

- [ ] **Step 11: `handlers.ts` 인덱스에서 삭제된 핸들러 제거**

`src/mocks/handlers.ts` 전체를 다음으로 교체:

```ts
import { authHandlers } from './handlers/auth';
import { homeHandlers } from './handlers/home';
import { productHandlers } from './handlers/products';
import { orderHandlers } from './handlers/orders';
import { collectionHandlers } from './handlers/collection';
import { shoppingAccountHandlers } from './handlers/shoppingAccounts';
import { shoppingSettingHandlers } from './handlers/shoppingSettings';

export const handlers = [
  ...authHandlers,
  ...homeHandlers,
  ...productHandlers,
  ...orderHandlers,
  ...collectionHandlers,
  ...shoppingAccountHandlers,
  ...shoppingSettingHandlers,
];
```

- [ ] **Step 12: 빌드 + 테스트로 회귀 확인**

Run: `npm run build`
Expected: 컴파일 성공 (삭제된 파일을 참조하는 곳이 없어야 함 — 남아있다면 여기서 모듈 미발견 에러로 드러남)

Run: `npm run test`
Expected: 기존 테스트 전부 PASS (이 Task에서 변경한 파일 중 테스트 대상은 없음 — `getCollectionJobs.ts`는 기존에 테스트 파일이 없었음)

- [ ] **Step 13: dev 서버에서 수동 확인**

Run: `npm run dev`
- `/order/collect` 접속 → 쇼핑몰 선택(예: 쿠팡) → "아이디 선택" 드롭다운에 해당 몰의 `ShoppingAccount` 계정 목록이 나오는지 확인
- 검색 버튼 클릭 → 목록이 정상적으로 필터링되는지 확인

- [ ] **Step 14: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add -A -- src/features/order src/mocks src/shared
git commit -m "refactor: order/collect가 legacy MallAccount 대신 ShoppingAccount 기반 API를 사용하도록 마이그레이션"
```

---

### Task 4: `order/list` 타입 정리 (`mallAccountId`→`mallId`, `shoppingMall` 엄격화, `shopId` 명명 수정)

**Files:**
- Modify: `src/features/order/types/order.types.ts`
- Modify: `src/features/order/store/search.store.ts`
- Modify: `src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx`
- Modify: `src/mocks/utils/getOrders.ts`
- Modify: `src/mocks/utils/getOrders.test.ts`
- Modify: `src/features/order/constant/table.constant.ts`

**Interfaces:**
- Consumes: 없음 (Task 2, 3과 독립적으로 실행 가능)
- Produces: `OrderSearchType.shoppingMall: ShoppingMalls | 'ALL'`(변경 전 `string`), `OrderSearchType.mallId: string`(변경 전 `mallAccountId`)

- [ ] **Step 1: 기존 테스트에서 실패하는 부분 먼저 갱신 (리네이밍 반영)**

`src/mocks/utils/getOrders.test.ts`에서 `defaultFilters`를:

```ts
const defaultFilters: OrderSearchType = {
  dateType: 'paymentDate',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  shoppingMall: 'ALL',
  mallAccountId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: 'ALL',
  searchType: 'orderName',
  searchValue: '',
};
```

다음으로 교체:

```ts
const defaultFilters: OrderSearchType = {
  dateType: 'paymentDate',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  shoppingMall: 'ALL',
  mallId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: 'ALL',
  searchType: 'orderName',
  searchValue: '',
};
```

`describe('계정 ID 필터', ...)` 블록 내부의 두 테스트를:

```ts
  describe('계정 ID 필터', () => {
    it("'mall-1' 계정만 필터링하면 2개를 반환한다", () => {
      const result = getMockOrders({ ...defaultFilters, mallAccountId: 'mall-1' }, 1, 10);
      expect(result.total).toBe(2);
      result.orders.forEach((o) => expect(o.shoppingMallId).toBe('mall-1'));
    });

    it("'mall-2' 계정만 필터링하면 1개를 반환한다", () => {
      const result = getMockOrders({ ...defaultFilters, mallAccountId: 'mall-2' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });
  });
```

다음으로 교체:

```ts
  describe('아이디 필터', () => {
    it("'mall-1' 아이디만 필터링하면 2개를 반환한다", () => {
      const result = getMockOrders({ ...defaultFilters, mallId: 'mall-1' }, 1, 10);
      expect(result.total).toBe(2);
      result.orders.forEach((o) => expect(o.shoppingMallId).toBe('mall-1'));
    });

    it("'mall-2' 아이디만 필터링하면 1개를 반환한다", () => {
      const result = getMockOrders({ ...defaultFilters, mallId: 'mall-2' }, 1, 10);
      expect(result.total).toBe(1);
      expect(result.orders[0].orderNumber).toBe('ORD-002');
    });
  });
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test -- getOrders`
Expected: FAIL — `OrderSearchType`에 `mallAccountId`가 없다는 TS 에러 또는 `mallId` 필터가 아직 반영 안 돼 기대값 불일치

- [ ] **Step 3: `OrderSearchType` 타입 변경**

`src/features/order/types/order.types.ts`에서:

```ts
export interface OrderSearchType {
  dateType: string;
  startDate: string;
  endDate: string;
  shoppingMall: string;
  mallAccountId: string;
  deliveryCompany: string;
  orderStatus: string;
  searchType: string;
  searchValue: string;
}
```

다음으로 교체:

```ts
export interface OrderSearchType {
  dateType: string;
  startDate: string;
  endDate: string;
  shoppingMall: ShoppingMalls | 'ALL';
  mallId: string;
  deliveryCompany: string;
  orderStatus: string;
  searchType: string;
  searchValue: string;
}
```

- [ ] **Step 4: `getOrders.ts` 필터 함수 이름/필드 갱신**

`src/mocks/utils/getOrders.ts`에서:

```ts
const filterByMallAccountId = (mallAccountId: string, data: Order[]) => {
  if (!mallAccountId || mallAccountId === 'ALL') return data;
  return data.filter((item) => item.shoppingMallId === mallAccountId);
};
```

다음으로 교체:

```ts
const filterByMallId = (mallId: string, data: Order[]) => {
  if (!mallId || mallId === 'ALL') return data;
  return data.filter((item) => item.shoppingMallId === mallId);
};
```

같은 파일의 `getMockOrders` 함수 내부를:

```ts
export const getMockOrders = (filters: OrderSearchType, page: number, pageSize: number) => {
  const { dateType, startDate, endDate, shoppingMall, mallAccountId, orderStatus, searchType, searchValue } = filters;

  const byDate = filterByDate(dateType, startDate, endDate, MOCK_ORDERS_DATA);
  const byMall = filterByShoppingMall(shoppingMall, byDate);
  const byAccountId = filterByMallAccountId(mallAccountId, byMall);
  const byStatus = filterByOrderStatus(orderStatus, byAccountId);
  const filtered = filterBySearchValue(searchType, searchValue, byStatus);
```

다음으로 교체:

```ts
export const getMockOrders = (filters: OrderSearchType, page: number, pageSize: number) => {
  const { dateType, startDate, endDate, shoppingMall, mallId, orderStatus, searchType, searchValue } = filters;

  const byDate = filterByDate(dateType, startDate, endDate, MOCK_ORDERS_DATA);
  const byMall = filterByShoppingMall(shoppingMall, byDate);
  const byAccountId = filterByMallId(mallId, byMall);
  const byStatus = filterByOrderStatus(orderStatus, byAccountId);
  const filtered = filterBySearchValue(searchType, searchValue, byStatus);
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm run test -- getOrders`
Expected: PASS (전체)

- [ ] **Step 6: `search.store.ts` atom 이름/타입 갱신**

`src/features/order/store/search.store.ts` 전체를 다음으로 교체:

```ts
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
export const shoppingMallAtom = atom<ShoppingMalls | 'ALL'>('ALL');
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
  shoppingMall: get(shoppingMallAtom),
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
  shoppingMall: 'ALL',
  mallId: 'ALL',
  deliveryCompany: DEFAULT_ORDER_STATUS,
  orderStatus: DEFAULT_ORDER_STATUS,
  searchType: DEFAULT_SEARCH_TYPE,
  searchValue: '',
});
```

주의: 위 `committedFiltersAtom`의 `deliveryCompany: DEFAULT_ORDER_STATUS` 부분은 기존 원본 파일의 오기를 그대로 유지한 것이 아니라 **원본 그대로 `deliveryCompany: 'ALL'`이어야 한다** — 아래처럼 정확히 작성한다:

```ts
export const committedFiltersAtom = atom<OrderSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  shoppingMall: 'ALL',
  mallId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: DEFAULT_ORDER_STATUS,
  searchType: DEFAULT_SEARCH_TYPE,
  searchValue: '',
});
```

- [ ] **Step 7: `OrderMallFilter.tsx` atom 참조 및 타입 캐스팅 갱신**

`src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx` 전체를 다음으로 교체:

```tsx
'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  shoppingMallAtom,
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
  const [shoppingMall, setShoppingMall] = useAtom(shoppingMallAtom);
  const [mallId, setMallId] = useAtom(mallIdAtom);
  const [deliveryCompany, setDeliveryCompany] = useAtom(deliveryCompanyAtom);

  const mallOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...SHOPPING_MALLS.map((mall) => ({ id: mall.code, name: mall.name }))],
    [],
  );

  const accountOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...(shoppingMall !== 'ALL' ? (MALL_ACCOUNTS[shoppingMall] ?? []) : [])],
    [shoppingMall],
  );

  const deliveryOptions: FilterOption[] = [ALL_OPTION, ...DELIVERY_COMPANY];

  const handleMallChange = (value: string) => {
    setShoppingMall(value as ShoppingMalls | 'ALL');
    setMallId('ALL');
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">선택사항</Label>
      <Select value={shoppingMall} onValueChange={handleMallChange}>
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

- [ ] **Step 8: `ORDERLIST_TABLE_HEAD`의 `shopId` → `shoppingMallId` 명명 수정**

`src/features/order/constant/table.constant.ts`에서:

```ts
  {
    id: 'shopId',
    title: '쇼핑몰ID',
  },
```

다음으로 교체:

```ts
  {
    id: 'shoppingMallId',
    title: '쇼핑몰ID',
  },
```

- [ ] **Step 9: 빌드 + 전체 테스트로 회귀 확인**

Run: `npm run build`
Expected: 컴파일 성공

Run: `npm run test`
Expected: 전체 PASS

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 10: dev 서버에서 수동 확인**

Run: `npm run dev`
- `/order/list` 접속 → 쇼핑몰 선택 시 "아이디 선택" 드롭다운이 "전체"만 노출되는 기존 동작(빈 스텁) 유지되는지 확인 — 이번 작업으로 인한 회귀 없음
- 쇼핑몰 필터로 검색 시 기존과 동일하게 필터링되는지 확인

- [ ] **Step 11: 커밋 (안내용 — 사용자 명시 요청 시에만 실제 실행)**

```bash
git add src/features/order/types/order.types.ts \
        src/features/order/store/search.store.ts \
        src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx \
        src/mocks/utils/getOrders.ts \
        src/mocks/utils/getOrders.test.ts \
        src/features/order/constant/table.constant.ts
git commit -m "refactor: order/list의 mallAccountId를 mallId로 정정하고 shoppingMall 타입 엄격화"
```

---

## Self-Review 결과

- **스펙 커버리지**: 설계 문서의 7개 섹션 전부 Task 1~4에 매핑됨 (섹션 1→Task 3 Step 10-11, 섹션 2→Task 2, 섹션 3→Task 3, 섹션 4→Task 4, 섹션 5→Task 1, 섹션 6→Task 3 Step 1/Task 4 Step 3, 섹션 7→Task 4 Step 8). 범위 외로 명시된 `ownerId` 테넌트 격리, `OrderMallFilter` 실데이터 연동은 의도적으로 포함하지 않음.
- **플레이스홀더 스캔**: "TODO"/"나중에" 등 미완성 표현 없음. 모든 Step에 실제 diff 코드 포함.
- **타입 일관성 확인**: `MallAccountOption`(Task 2) → `useGetShoppingAccountsByMall`(Task 2) → `CollectionMallFilter.tsx`(Task 3)까지 필드명(`id`/`mallCode`/`mallId`) 일치 확인. `CollectionJob.mallId`/`CollectionSearchParams.mallId`(Task 3)와 `OrderSearchType.mallId`(Task 4)는 서로 다른 도메인이라 이름이 같아도 무방함(둘 다 "로그인 아이디 문자열"이라는 의미는 동일). `search.store.ts`의 `committedFiltersAtom` 초안에서 `deliveryCompany` 오기를 self-review 중 발견해 Step 6에서 바로잡음.
