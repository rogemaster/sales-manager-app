# 주문수집 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 쇼핑몰 계정별 주문수집을 트리거하고 진행률을 인라인 프로그레스 바로 확인하는 주문수집 페이지를 구현한다.

**Architecture:** Jotai atom으로 필터 draft 상태를 관리하고 검색버튼 클릭 시 `collectSearchParamsAtom`에 확정 파라미터를 쓴다. TanStack Query가 이 atom을 구독해 API를 호출하며, `COLLECTING` 상태 행이 존재하는 동안 2초 폴링으로 진행률을 갱신한다. 수집 트리거는 useMutation으로 처리하고 useAlert로 피드백을 제공한다.

**Tech Stack:** Next.js 15 App Router, Jotai, TanStack Query, MSW, Tailwind CSS, shadcn/ui (Table, Select, Checkbox, Button, Card)

---

## 파일 맵

| 파일 | 작업 |
|------|------|
| `src/features/order/types/collection.types.ts` | 신규 생성 |
| `src/features/order/store/collect.store.ts` | 신규 생성 |
| `src/mocks/data/MockCollectionJobsData.ts` | 신규 생성 |
| `src/mocks/utils/getCollectionJobs.ts` | 신규 생성 |
| `src/mocks/utils/triggerOrderCollection.ts` | 신규 생성 |
| `src/mocks/handlers.ts` | 핸들러 2개 추가 |
| `src/features/order/api/getCollectionJobs.ts` | 신규 생성 |
| `src/features/order/api/triggerOrderCollection.ts` | 신규 생성 |
| `src/features/order/api/useGetCollectionJobs.ts` | 신규 생성 |
| `src/features/order/api/useTriggerOrderCollection.ts` | 신규 생성 |
| `src/features/order/ui/collect/components/CollectionDateFilter.tsx` | 신규 생성 |
| `src/features/order/ui/collect/components/CollectionMallFilter.tsx` | 신규 생성 |
| `src/features/order/ui/collect/components/CollectionStatusCell.tsx` | 신규 생성 |
| `src/features/order/ui/collect/CollectionFilterSection.tsx` | 신규 생성 |
| `src/features/order/ui/collect/CollectionActionSection.tsx` | 신규 생성 |
| `src/features/order/ui/collect/CollectionTableSection.tsx` | 신규 생성 |
| `src/features/order/ui/collect/OrderCollectionLayout.tsx` | 수정 (플레이스홀더 교체) |

---

## Task 1: 타입 정의

**Files:**
- Create: `src/features/order/types/collection.types.ts`

- [ ] **Step 1: collection.types.ts 생성**

```typescript
// src/features/order/types/collection.types.ts
import { ShoppingMalls } from '@/types/common.type';

export type CollectionStatus = 'WAITING' | 'COLLECTING' | 'COMPLETED' | 'FAILED';

export interface CollectionJob {
  id: string;
  mallName: ShoppingMalls;
  mallAccountId: string;
  status: CollectionStatus;
  lastCollectedAt: string | null;
  totalCount?: number;
  collectedCount?: number;
}

export interface CollectionSearchParams {
  startDate: string;
  endDate: string;
  mallCode: string;
  mallAccountId: string;
}

export interface TriggerCollectionBody {
  jobIds: string[];
}
```

---

## Task 2: Jotai Store

**Files:**
- Create: `src/features/order/store/collect.store.ts`

- [ ] **Step 1: collect.store.ts 생성**

```typescript
// src/features/order/store/collect.store.ts
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { CollectionSearchParams } from '../types/collection.types';

const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const collectStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const collectEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const collectMallAtom = atom<string>('ALL');
export const collectMallAccountIdAtom = atom<string>('ALL');
export const selectedJobIdsAtom = atom<string[]>([]);

// null = 아직 검색하지 않은 상태 (쿼리 비활성)
export const collectSearchParamsAtom = atom<CollectionSearchParams | null>(null);
```

---

## Task 3: Mock 원본 데이터

**Files:**
- Create: `src/mocks/data/MockCollectionJobsData.ts`

- [ ] **Step 1: MockCollectionJobsData.ts 생성**

```typescript
// src/mocks/data/MockCollectionJobsData.ts
import { CollectionJob } from '@/features/order/types/collection.types';

export const MOCK_COLLECTION_JOBS: CollectionJob[] = [
  {
    id: 'JOB-001',
    mallName: 'COUP',
    mallAccountId: 'coupang_seller1',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-25 09:00:00',
    totalCount: 150,
    collectedCount: 150,
  },
  {
    id: 'JOB-002',
    mallName: 'GMK',
    mallAccountId: 'gadmin1111',
    status: 'WAITING',
    lastCollectedAt: null,
  },
  {
    id: 'JOB-003',
    mallName: 'NSST',
    mallAccountId: 'naver_store1',
    status: 'FAILED',
    lastCollectedAt: '2026-05-24 15:30:00',
    totalCount: 200,
    collectedCount: 87,
  },
  {
    id: 'JOB-004',
    mallName: 'AUC',
    mallAccountId: 'auction_admin1',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-25 08:00:00',
    totalCount: 300,
    collectedCount: 300,
  },
  {
    id: 'JOB-005',
    mallName: '11ST',
    mallAccountId: 'elevenst_shop1',
    status: 'WAITING',
    lastCollectedAt: null,
  },
  {
    id: 'JOB-006',
    mallName: 'INTP',
    mallAccountId: 'ipark_seller',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-23 11:00:00',
    totalCount: 80,
    collectedCount: 80,
  },
];
```

---

## Task 4: Mock 유틸리티

**Files:**
- Create: `src/mocks/utils/triggerOrderCollection.ts`
- Create: `src/mocks/utils/getCollectionJobs.ts`

- [ ] **Step 1: triggerOrderCollection.ts 생성**

```typescript
// src/mocks/utils/triggerOrderCollection.ts
import { MOCK_COLLECTION_JOBS } from '../data/MockCollectionJobsData';

// 수집 시작 시각 (ms) 저장 — 경과 시간으로 진행률 계산
const collectionProgressMap: Record<string, number> = {};

export function getCollectionProgressMap(): Record<string, number> {
  return collectionProgressMap;
}

export function triggerOrderCollectionMock(jobIds: string[]): number {
  const now = Date.now();
  let triggered = 0;

  jobIds.forEach((id) => {
    const job = MOCK_COLLECTION_JOBS.find((j) => j.id === id);
    if (job && job.status !== 'COLLECTING') {
      job.status = 'COLLECTING';
      job.totalCount = Math.floor(Math.random() * 400) + 100; // 100~500건
      job.collectedCount = 0;
      collectionProgressMap[id] = now;
      triggered++;
    }
  });

  return triggered;
}
```

- [ ] **Step 2: getCollectionJobs.ts 생성**

```typescript
// src/mocks/utils/getCollectionJobs.ts
import dayjs from 'dayjs';
import { CollectionJob, CollectionSearchParams } from '@/features/order/types/collection.types';
import { MOCK_COLLECTION_JOBS } from '../data/MockCollectionJobsData';
import { getCollectionProgressMap } from './triggerOrderCollection';

const COLLECTION_DURATION_MS = 10_000; // 10초 후 완료

export function getCollectionJobsMock(params: CollectionSearchParams): CollectionJob[] {
  const progressMap = getCollectionProgressMap();
  const now = Date.now();

  MOCK_COLLECTION_JOBS.forEach((job) => {
    const startTime = progressMap[job.id];
    if (job.status === 'COLLECTING' && startTime !== undefined) {
      const progress = Math.min((now - startTime) / COLLECTION_DURATION_MS, 1);
      job.collectedCount = Math.floor(progress * (job.totalCount ?? 100));
      if (progress >= 1) {
        job.status = 'COMPLETED';
        job.lastCollectedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
        delete progressMap[job.id];
      }
    }
  });

  return MOCK_COLLECTION_JOBS.filter((job) => {
    if (params.mallCode !== 'ALL' && job.mallName !== params.mallCode) return false;
    if (params.mallAccountId !== 'ALL' && job.mallAccountId !== params.mallAccountId) return false;
    return true;
  });
}
```

---

## Task 5: MSW 핸들러 추가

**Files:**
- Modify: `src/mocks/handlers.ts`

- [ ] **Step 1: import 추가**

`handlers.ts` 상단 import 블록에 아래 3줄 추가:

```typescript
import { CollectionSearchParams, TriggerCollectionBody } from '@/features/order/types/collection.types';
import { getCollectionJobsMock } from './utils/getCollectionJobs';
import { triggerOrderCollectionMock } from './utils/triggerOrderCollection';
```

- [ ] **Step 2: 핸들러 2개 추가**

`handlers` 배열 마지막 항목(쇼핑몰 계정 삭제) 뒤에 추가:

```typescript
  // 수집 작업 목록 조회
  http.get(`${baseUrl}/api/order/collection/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const params: CollectionSearchParams = {
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
      mallCode: url.searchParams.get('mallCode') ?? 'ALL',
      mallAccountId: url.searchParams.get('mallAccountId') ?? 'ALL',
    };
    return HttpResponse.json(getCollectionJobsMock(params));
  }),

  // 주문수집 트리거
  http.post(`${baseUrl}/api/order/collection/trigger`, async ({ request }) => {
    await delay(300);
    const { jobIds } = (await request.json()) as TriggerCollectionBody;
    const triggeredCount = triggerOrderCollectionMock(jobIds);
    return HttpResponse.json({ success: true, triggeredCount });
  }),
```

---

## Task 6: Feature API 함수 및 훅

**Files:**
- Create: `src/features/order/api/getCollectionJobs.ts`
- Create: `src/features/order/api/triggerOrderCollection.ts`
- Create: `src/features/order/api/useGetCollectionJobs.ts`
- Create: `src/features/order/api/useTriggerOrderCollection.ts`

- [ ] **Step 1: getCollectionJobs.ts 생성**

```typescript
// src/features/order/api/getCollectionJobs.ts
import { CollectionJob, CollectionSearchParams } from '../types/collection.types';

export async function getCollectionJobs(params: CollectionSearchParams): Promise<CollectionJob[]> {
  const query = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    mallCode: params.mallCode,
    mallAccountId: params.mallAccountId,
  });
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/jobs?${query}`);
  if (!response.ok) throw new Error('수집 작업 목록 조회 실패');
  return response.json();
}
```

- [ ] **Step 2: triggerOrderCollection.ts 생성**

```typescript
// src/features/order/api/triggerOrderCollection.ts
import { TriggerCollectionBody } from '../types/collection.types';

export async function triggerOrderCollection(jobIds: string[]): Promise<{ success: boolean; triggeredCount: number }> {
  const body: TriggerCollectionBody = { jobIds };
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('주문수집 실행 실패');
  return response.json();
}
```

- [ ] **Step 3: useGetCollectionJobs.ts 생성**

```typescript
// src/features/order/api/useGetCollectionJobs.ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { collectSearchParamsAtom } from '../store/collect.store';
import { getCollectionJobs } from './getCollectionJobs';
import { CollectionJob } from '../types/collection.types';

export const COLLECTION_JOBS_QUERY_KEY = 'collectionJobs';

export const useGetCollectionJobs = () => {
  const searchParams = useAtomValue(collectSearchParamsAtom);

  return useQuery({
    queryKey: [COLLECTION_JOBS_QUERY_KEY, searchParams],
    queryFn: () => getCollectionJobs(searchParams!),
    enabled: searchParams !== null,
    refetchInterval: (query) => {
      const jobs: CollectionJob[] = query.state.data ?? [];
      return jobs.some((job) => job.status === 'COLLECTING') ? 2000 : false;
    },
  });
};
```

- [ ] **Step 4: useTriggerOrderCollection.ts 생성**

```typescript
// src/features/order/api/useTriggerOrderCollection.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerOrderCollection } from './triggerOrderCollection';
import { COLLECTION_JOBS_QUERY_KEY } from './useGetCollectionJobs';

export const useTriggerOrderCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobIds: string[]) => triggerOrderCollection(jobIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_JOBS_QUERY_KEY] });
    },
  });
};
```

---

## Task 7: 필터 컴포넌트

**Files:**
- Create: `src/features/order/ui/collect/components/CollectionDateFilter.tsx`
- Create: `src/features/order/ui/collect/components/CollectionMallFilter.tsx`

- [ ] **Step 1: CollectionDateFilter.tsx 생성**

```tsx
// src/features/order/ui/collect/components/CollectionDateFilter.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { RangeTypeProps } from '@/types/common.type';
import { collectStartDateAtom, collectEndDateAtom } from '@/features/order/store/collect.store';
import dayjs from 'dayjs';

export const CollectionDateFilter = () => {
  const setStartDate = useSetAtom(collectStartDateAtom);
  const setEndDate = useSetAtom(collectEndDateAtom);

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
      <Label className="w-20 shrink-0 text-right">검색 기간</Label>
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

- [ ] **Step 2: CollectionMallFilter.tsx 생성**

```tsx
// src/features/order/ui/collect/components/CollectionMallFilter.tsx
'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collectMallAtom, collectMallAccountIdAtom } from '@/features/order/store/collect.store';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { getMallAccounts } from '@/shared/api/getMallAccounts';
import { FilterOption, ShoppingMalls } from '@/types/common.type';

const ALL_OPTION: FilterOption = { id: 'ALL', name: '전체' };

export const CollectionMallFilter = () => {
  const [mall, setMall] = useAtom(collectMallAtom);
  const [mallAccountId, setMallAccountId] = useAtom(collectMallAccountIdAtom);

  const mallOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...SHOPPING_MALLS.map((m) => ({ id: m.code, name: m.name }))],
    [],
  );

  const { data: mallAccounts = [] } = useQuery({
    queryKey: ['mallAccounts', mall],
    queryFn: () => getMallAccounts({ mallCode: mall as ShoppingMalls }),
    enabled: mall !== 'ALL',
  });

  const accountOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...mallAccounts.map((a) => ({ id: a.mallId, name: a.mallId }))],
    [mallAccounts],
  );

  const handleMallChange = (value: string) => {
    setMall(value);
    setMallAccountId('ALL');
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
      <Select value={mallAccountId} onValueChange={setMallAccountId} disabled={mall === 'ALL'}>
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

---

## Task 8: 필터 섹션 (Card 래퍼 + 검색버튼)

**Files:**
- Create: `src/features/order/ui/collect/CollectionFilterSection.tsx`

- [ ] **Step 1: CollectionFilterSection.tsx 생성**

```tsx
// src/features/order/ui/collect/CollectionFilterSection.tsx
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
  collectMallAccountIdAtom,
  collectSearchParamsAtom,
} from '@/features/order/store/collect.store';

export const CollectionFilterSection = () => {
  const startDate = useAtomValue(collectStartDateAtom);
  const endDate = useAtomValue(collectEndDateAtom);
  const mallCode = useAtomValue(collectMallAtom);
  const mallAccountId = useAtomValue(collectMallAccountIdAtom);
  const setSearchParams = useSetAtom(collectSearchParamsAtom);

  const handleSearch = () => {
    setSearchParams({ startDate, endDate, mallCode, mallAccountId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>검색 필터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <CollectionDateFilter />
          <div className="flex items-center justify-between">
            <CollectionMallFilter />
            <Button onClick={handleSearch}>검색</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Task 9: 수집상태 셀 컴포넌트

**Files:**
- Create: `src/features/order/ui/collect/components/CollectionStatusCell.tsx`

- [ ] **Step 1: CollectionStatusCell.tsx 생성**

```tsx
// src/features/order/ui/collect/components/CollectionStatusCell.tsx
import { cn } from '@/lib/utils';
import { CollectionStatus } from '@/features/order/types/collection.types';

const STATUS_CONFIG: Record<Exclude<CollectionStatus, 'COLLECTING'>, { label: string; className: string }> = {
  WAITING: { label: '대기중', className: 'bg-gray-100 text-gray-600' },
  COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  FAILED: { label: '실패', className: 'bg-red-100 text-red-700' },
};

interface Props {
  status: CollectionStatus;
  collectedCount?: number;
  totalCount?: number;
}

export const CollectionStatusCell = ({ status, collectedCount = 0, totalCount = 0 }: Props) => {
  if (status === 'COLLECTING') {
    const percentage = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;
    return (
      <div className="flex flex-col gap-1 min-w-36">
        <span className="text-xs font-medium text-blue-600">
          {collectedCount.toLocaleString()} / {totalCount.toLocaleString()}
        </span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
};
```

---

## Task 10: 테이블 섹션

**Files:**
- Create: `src/features/order/ui/collect/CollectionTableSection.tsx`

- [ ] **Step 1: CollectionTableSection.tsx 생성**

```tsx
// src/features/order/ui/collect/CollectionTableSection.tsx
'use client';

import { useAtom } from 'jotai';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { selectedJobIdsAtom } from '@/features/order/store/collect.store';
import { useGetCollectionJobs } from '@/features/order/api/useGetCollectionJobs';
import { CollectionStatusCell } from './components/CollectionStatusCell';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

const getMallName = (mallCode: string): string =>
  SHOPPING_MALLS.find((m) => m.code === mallCode)?.name ?? mallCode;

export const CollectionTableSection = () => {
  const { data: jobs = [] } = useGetCollectionJobs();
  const [selectedJobIds, setSelectedJobIds] = useAtom(selectedJobIdsAtom);

  const allIds = jobs.map((j) => j.id);
  const isAllChecked = allIds.length > 0 && allIds.every((id) => selectedJobIds.includes(id));
  const isIndeterminate = selectedJobIds.some((id) => allIds.includes(id)) && !isAllChecked;

  const handleToggleAll = (checked: boolean) => {
    setSelectedJobIds(checked ? allIds : []);
  };

  const handleToggleRow = (id: string, checked: boolean) => {
    setSelectedJobIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={isIndeterminate ? 'indeterminate' : isAllChecked}
                onCheckedChange={(checked) => handleToggleAll(!!checked)}
              />
            </TableHead>
            <TableHead>쇼핑몰명</TableHead>
            <TableHead>아이디</TableHead>
            <TableHead>수집상태</TableHead>
            <TableHead>작업ID</TableHead>
            <TableHead>최종수집일자</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                검색 조건을 선택한 후 검색 버튼을 눌러주세요.
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((job) => (
              <TableRow key={job.id} data-state={selectedJobIds.includes(job.id) ? 'selected' : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selectedJobIds.includes(job.id)}
                    onCheckedChange={(checked) => handleToggleRow(job.id, !!checked)}
                  />
                </TableCell>
                <TableCell>{getMallName(job.mallName)}</TableCell>
                <TableCell>{job.mallAccountId}</TableCell>
                <TableCell>
                  <CollectionStatusCell
                    status={job.status}
                    collectedCount={job.collectedCount}
                    totalCount={job.totalCount}
                  />
                </TableCell>
                <TableCell>{job.id}</TableCell>
                <TableCell>{job.lastCollectedAt ?? '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
```

---

## Task 11: 주문수집 액션 섹션

**Files:**
- Create: `src/features/order/ui/collect/CollectionActionSection.tsx`

- [ ] **Step 1: CollectionActionSection.tsx 생성**

```tsx
// src/features/order/ui/collect/CollectionActionSection.tsx
'use client';

import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { selectedJobIdsAtom } from '@/features/order/store/collect.store';
import { useTriggerOrderCollection } from '@/features/order/api/useTriggerOrderCollection';
import { useAlert } from '@/hooks/useAlert';

export const CollectionActionSection = () => {
  const [selectedJobIds, setSelectedJobIds] = useAtom(selectedJobIdsAtom);
  const { mutate: trigger, isPending } = useTriggerOrderCollection();
  const { showAlert } = useAlert();

  const handleCollect = () => {
    if (selectedJobIds.length === 0) return;

    const count = selectedJobIds.length;
    const snapshotIds = [...selectedJobIds];

    trigger(snapshotIds, {
      onSuccess: ({ triggeredCount }) => {
        setSelectedJobIds([]);
        showAlert({ message: `${triggeredCount}개 수집을 시작했습니다.`, type: 'success' });
      },
      onError: () => {
        showAlert({ message: '주문수집 실행 중 오류가 발생했습니다.', type: 'warning' });
      },
    });
  };

  return (
    <div className="flex justify-center py-2">
      <Button onClick={handleCollect} disabled={selectedJobIds.length === 0 || isPending} size="lg">
        주문수집
        {selectedJobIds.length > 0 && ` (${selectedJobIds.length}건)`}
      </Button>
    </div>
  );
};
```

---

## Task 12: 레이아웃 조립 및 동작 검증

**Files:**
- Modify: `src/features/order/ui/collect/OrderCollectionLayout.tsx`

- [ ] **Step 1: OrderCollectionLayout.tsx 수정**

```tsx
// src/features/order/ui/collect/OrderCollectionLayout.tsx
import { CollectionFilterSection } from './CollectionFilterSection';
import { CollectionActionSection } from './CollectionActionSection';
import { CollectionTableSection } from './CollectionTableSection';

export const OrderCollectionLayout = () => {
  return (
    <div className="space-y-4">
      <CollectionFilterSection />
      <CollectionActionSection />
      <CollectionTableSection />
    </div>
  );
};
```

- [ ] **Step 2: 개발 서버 실행 후 기능 검증**

```bash
npm run dev
```

브라우저에서 `/order/collect` 접속 후 아래 순서로 검증:

1. **필터 영역** — 날짜 범위 표시, 7일/15일/30일/1년 버튼 클릭 시 날짜 변경 확인
2. **쇼핑몰 드롭다운** — 쇼핑몰 선택 전 아이디 드롭다운 disabled 확인
3. **쇼핑몰 선택 후** — 아이디 드롭다운 활성화, 해당 쇼핑몰 계정 목록 로드 확인
4. **검색 버튼 클릭** — 테이블에 수집 작업 목록 표시 확인 (6건)
5. **체크박스** — 개별/전체 선택 동작 확인, 주문수집 버튼 `(N건)` 텍스트 변경 확인
6. **주문수집 버튼 클릭** — WAITING/FAILED 행 선택 후 클릭 시 상태가 COLLECTING으로 변경 확인
7. **진행률 바** — COLLECTING 행에 프로그레스 바 + `수집중/총건수` 숫자 표시 확인
8. **폴링** — 2초마다 진행률 증가, 10초 후 COMPLETED 배지로 전환 확인
9. **수집상태 배지** — WAITING(회색), COMPLETED(초록), FAILED(빨간색) 확인
