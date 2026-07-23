# Order List Search Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주문 목록 페이지(`/order/list`)의 검색 필터를 4행(일자/선택사항/주문상태/검색어) 구조로 재구축하고, 기존 코드의 타입 불일치와 상품용 상수 혼용 버그를 수정한다.

**Architecture:** Jotai atoms로 필터 상태를 관리하고, 각 행을 독립 컴포넌트로 분리한다. 날짜 처리는 기존 `ProductSearchDate` 패턴(string 분리 atom + resetKey)을 동일하게 적용한다. 검색 버튼은 별도 컴포넌트에서 검색어 행 내부로 흡수한다.

**Tech Stack:** Next.js 15 App Router, Jotai, Radix UI (shadcn/ui), Tailwind CSS 4, dayjs

---

## File Map

| Action | Path | Role |
|--------|------|------|
| Modify | `src/features/order/constant/status.constants.ts` | ORDER_DATE_TYPE, ORDER_SEARCH_TYPE 추가 |
| Modify | `src/constant/delivery.constant.ts` | DELIVERY_COMPANY 추가 |
| Modify | `src/features/order/types/order.types.ts` | OrderSearchType 재정의 |
| Modify | `src/features/order/store/search.store.ts` | atoms 재구성 |
| Modify | `src/features/order/ui/list/components/orderSearchFiilter/OrderDateFilter.tsx` | ProductSearchDate 패턴으로 재작성 |
| Create | `src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx` | 쇼핑몰/아이디/택배사 행 |
| Modify | `src/features/order/ui/list/components/orderSearchFiilter/OrderSearchInput.tsx` | searchType 드롭다운 + 검색 버튼 통합 |
| Modify | `src/features/order/ui/list/OrderListSearchFilterSection.tsx` | 4행 레이아웃 |
| Delete | `src/features/order/ui/list/components/orderSearchFiilter/OrderSearchButton.tsx` | OrderSearchInput으로 흡수 |

---

## Task 1: 상수 추가 (ORDER_DATE_TYPE, ORDER_SEARCH_TYPE, DELIVERY_COMPANY)

**Files:**
- Modify: `src/features/order/constant/status.constants.ts`
- Modify: `src/constant/delivery.constant.ts`

- [ ] **Step 1: status.constants.ts에 ORDER_DATE_TYPE, ORDER_SEARCH_TYPE 추가**

`src/features/order/constant/status.constants.ts` 파일 상단에 `FilterOption` import를 추가하고, 파일 끝에 두 상수를 추가한다.

```typescript
// 파일 상단 import 추가
import { FilterOption } from '@/types/common.type';

// 파일 끝에 추가
export const ORDER_DATE_TYPE: FilterOption[] = [
  { id: 'orderCollectionDate', name: '주문수집일' },
  { id: 'paymentDate', name: '결제일' },
  { id: 'deliveryDate', name: '배송일' },
];

export const ORDER_SEARCH_TYPE: FilterOption[] = [
  { id: 'orderName', name: '주문자' },
  { id: 'payeeName', name: '수취인' },
  { id: 'orderProductName', name: '주문명' },
  { id: 'orderNumber', name: '주문번호' },
  { id: 'shopOrderNumber', name: '쇼핑몰 주문번호' },
];
```

- [ ] **Step 2: delivery.constant.ts에 DELIVERY_COMPANY 추가**

`src/constant/delivery.constant.ts` 파일 끝에 추가한다. (기존 `DELIVERY_TYPE_OPTION`은 그대로 유지)

```typescript
export const DELIVERY_COMPANY: FilterOption[] = [
  { id: 'CJ', name: '대한통운' },
  { id: 'HANJIN', name: '한진택배' },
  { id: 'LOTTE', name: '롯데택배' },
  { id: 'EPOST', name: '우체국택배' },
  { id: 'LOGEN', name: '로젠택배' },
];
```

- [ ] **Step 3: 린트 확인**

```bash
npm run lint
```

오류 없으면 진행.

- [ ] **Step 4: 커밋**

```bash
git add src/features/order/constant/status.constants.ts src/constant/delivery.constant.ts
git commit -m "feat(order): add ORDER_DATE_TYPE, ORDER_SEARCH_TYPE, DELIVERY_COMPANY constants"
```

---

## Task 2: OrderSearchType 재정의 + 스토어 재구성

**Files:**
- Modify: `src/features/order/types/order.types.ts`
- Modify: `src/features/order/store/search.store.ts`

- [ ] **Step 1: OrderSearchType 재정의**

`src/features/order/types/order.types.ts`의 `OrderSearchType` 인터페이스를 전체 교체한다.

기존:
```typescript
export interface OrderSearchType {
  dateType: string;
  searchDate: Date[];
  orderStatus: string;
  searchValue: string;
}
```

변경 후:
```typescript
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

- [ ] **Step 2: 스토어 재구성**

`src/features/order/store/search.store.ts` 파일 전체를 아래 내용으로 교체한다.

```typescript
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { OrderSearchType } from '../types/order.types';

const DEFAULT_DATE_TYPE = 'orderCollectionDate';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_ORDER_STATUS = 'ALL';
const DEFAULT_SEARCH_TYPE = 'orderName';

export const dateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);
export const startDateAtom = atom<string>(DEFAULT_START_DATE);
export const endDateAtom = atom<string>(DEFAULT_END_DATE);
export const shoppingMallAtom = atom<string>('ALL');
export const mallAccountIdAtom = atom<string>('ALL');
export const deliveryCompanyAtom = atom<string>('ALL');
export const orderStatusAtom = atom<string>(DEFAULT_ORDER_STATUS);
export const searchTypeAtom = atom<string>(DEFAULT_SEARCH_TYPE);
export const searchValueAtom = atom<string>('');

export const getOrderSearchFilterAtom = atom<OrderSearchType>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  shoppingMall: get(shoppingMallAtom),
  mallAccountId: get(mallAccountIdAtom),
  deliveryCompany: get(deliveryCompanyAtom),
  orderStatus: get(orderStatusAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));
```

- [ ] **Step 3: 린트 확인**

```bash
npm run lint
```

- [ ] **Step 4: 커밋**

```bash
git add src/features/order/types/order.types.ts src/features/order/store/search.store.ts
git commit -m "feat(order): rebuild search store atoms and update OrderSearchType"
```

---

## Task 3: OrderDateFilter 재작성

**Files:**
- Modify: `src/features/order/ui/list/components/orderSearchFiilter/OrderDateFilter.tsx`

기존 코드는 `RangeDatePicker`에 `Date[]`를 넘기는 타입 불일치 버그가 있고, `PRODUCT_DATE_TYPE`을 참조하고 있다. `ProductSearchDate.tsx` 패턴으로 완전히 재작성한다.

- [ ] **Step 1: OrderDateFilter.tsx 전체 교체**

```typescript
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { RangeTypeProps } from '@/types/common.type';
import { dateTypeAtom, startDateAtom, endDateAtom } from '@/features/order/store/search.store';
import { ORDER_DATE_TYPE } from '@/features/order/constant/status.constants';
import dayjs from 'dayjs';

export const OrderDateFilter = () => {
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
      const [start, end] = calculatorRangeDate(value);
      const formatStart = dayjs(start).format('YYYY-MM-DD');
      const formatEnd = dayjs(end).format('YYYY-MM-DD');
      setPickerInitDate({ startDate: formatStart, endDate: formatEnd });
      setResetKey((prev) => prev + 1);
      setStartDate(formatStart);
      setEndDate(formatEnd);
    },
    [setStartDate, setEndDate],
  );

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색 일자</Label>
      <Select value={dateType} onValueChange={setDateType}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER_DATE_TYPE.map((item) => (
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

- [ ] **Step 2: 린트 확인**

```bash
npm run lint
```

- [ ] **Step 3: 커밋**

```bash
git add src/features/order/ui/list/components/orderSearchFiilter/OrderDateFilter.tsx
git commit -m "fix(order): rewrite OrderDateFilter with correct RangeDatePicker API and ORDER_DATE_TYPE"
```

---

## Task 4: OrderMallFilter 신규 생성

**Files:**
- Create: `src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx`

쇼핑몰 선택 → 아이디 연동(쇼핑몰 변경 시 아이디 'ALL' 리셋) + 택배사 드롭다운을 하나의 행으로 구성한다. `MALL_ACCOUNTS`는 실 데이터 연동 전 빈 매핑으로 준비한다.

- [ ] **Step 1: OrderMallFilter.tsx 생성**

```typescript
'use client';

import { useAtom } from 'jotai';
import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { shoppingMallAtom, mallAccountIdAtom, deliveryCompanyAtom } from '@/features/order/store/search.store';
import { SHOPPING_MALLS } from '@/constant/shoppingMall.constant';
import { DELIVERY_COMPANY } from '@/constant/delivery.constant';
import { FilterOption } from '@/types/common.type';

const ALL_OPTION: FilterOption = { id: 'ALL', name: '전체' };

// 쇼핑몰별 계정 ID 목록 (실 데이터 연동 전 빈 매핑)
const MALL_ACCOUNTS: Record<string, FilterOption[]> = {};

export const OrderMallFilter = () => {
  const [shoppingMall, setShoppingMall] = useAtom(shoppingMallAtom);
  const [mallAccountId, setMallAccountId] = useAtom(mallAccountIdAtom);
  const [deliveryCompany, setDeliveryCompany] = useAtom(deliveryCompanyAtom);

  const mallOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...SHOPPING_MALLS.map((mall) => ({ id: mall.code, name: mall.name }))],
    [],
  );

  const accountOptions = useMemo<FilterOption[]>(
    () => [ALL_OPTION, ...(shoppingMall !== 'ALL' ? (MALL_ACCOUNTS[shoppingMall] ?? []) : [])],
    [shoppingMall],
  );

  const deliveryOptions = useMemo<FilterOption[]>(() => [ALL_OPTION, ...DELIVERY_COMPANY], []);

  const handleMallChange = (value: string) => {
    setShoppingMall(value);
    setMallAccountId('ALL');
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">선택사항</Label>
      <Select value={shoppingMall} onValueChange={handleMallChange}>
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
      <Select value={mallAccountId} onValueChange={setMallAccountId}>
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

- [ ] **Step 2: 린트 확인**

```bash
npm run lint
```

- [ ] **Step 3: 커밋**

```bash
git add src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx
git commit -m "feat(order): add OrderMallFilter component (shopping mall / account / delivery)"
```

---

## Task 5: OrderSearchInput 수정 — searchType 드롭다운 + 검색 버튼 통합

**Files:**
- Modify: `src/features/order/ui/list/components/orderSearchFiilter/OrderSearchInput.tsx`

기존 텍스트 입력 앞에 검색 항목 드롭다운을 추가하고, `OrderSearchButton`의 역할(검색 실행)을 이 컴포넌트로 흡수한다.

- [ ] **Step 1: OrderSearchInput.tsx 전체 교체**

```typescript
'use client';

import { ChangeEventHandler } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { searchValueAtom, searchTypeAtom, getOrderSearchFilterAtom } from '@/features/order/store/search.store';
import { ORDER_SEARCH_TYPE } from '@/features/order/constant/status.constants';

export const OrderSearchInput = () => {
  const [searchType, setSearchType] = useAtom(searchTypeAtom);
  const [searchValue, setSearchValue] = useAtom(searchValueAtom);
  const filterData = useAtomValue(getOrderSearchFilterAtom);

  const handleSearchInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSearchValue(e.target.value);
  };

  const handleSearch = () => {
    console.log('검색결과', filterData);
  };

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">검색어</Label>
      <Select value={searchType} onValueChange={setSearchType}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER_SEARCH_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1 max-w-md">
        <Input placeholder="검색어를 입력하세요..." value={searchValue} onChange={handleSearchInput} />
      </div>
      <Button onClick={handleSearch}>
        <Search className="h-4 w-4 mr-2" />
        검색
      </Button>
    </div>
  );
};
```

- [ ] **Step 2: 린트 확인**

```bash
npm run lint
```

- [ ] **Step 3: 커밋**

```bash
git add src/features/order/ui/list/components/orderSearchFiilter/OrderSearchInput.tsx
git commit -m "feat(order): add search type dropdown and inline search button to OrderSearchInput"
```

---

## Task 6: OrderListSearchFilterSection 레이아웃 변경 + OrderSearchButton 삭제

**Files:**
- Modify: `src/features/order/ui/list/OrderListSearchFilterSection.tsx`
- Delete: `src/features/order/ui/list/components/orderSearchFiilter/OrderSearchButton.tsx`

사이드 버튼 레이아웃을 제거하고 4행 수직 스택으로 교체한다. `OrderSearchButton`은 더 이상 사용되지 않으므로 삭제한다.

- [ ] **Step 1: OrderListSearchFilterSection.tsx 전체 교체**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderDateFilter } from './components/orderSearchFiilter/OrderDateFilter';
import { OrderMallFilter } from './components/orderSearchFiilter/OrderMallFilter';
import { OrderStateFilter } from './components/orderSearchFiilter/OrderStateFilter';
import { OrderSearchInput } from './components/orderSearchFiilter/OrderSearchInput';

export const OrderListSearchFilterSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>검색 및 필터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <OrderDateFilter />
          <OrderMallFilter />
          <OrderStateFilter />
          <OrderSearchInput />
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: OrderSearchButton.tsx 삭제**

```bash
git rm src/features/order/ui/list/components/orderSearchFiilter/OrderSearchButton.tsx
```

- [ ] **Step 3: 린트 + 빌드 확인**

```bash
npm run lint
```

오류 없으면:

```bash
npm run build
```

빌드 성공 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/features/order/ui/list/OrderListSearchFilterSection.tsx
git commit -m "feat(order): restructure search filter to 4-row layout, remove OrderSearchButton"
```

---

## Self-Review

### Spec Coverage

| 요구사항 | 대응 Task |
|----------|-----------|
| 일자 행 드롭다운 (주문수집일/결제일/배송일) | Task 1 (ORDER_DATE_TYPE), Task 3 (OrderDateFilter) |
| 날짜 범위 시작일~종료일 | Task 3 (RangeDatePicker) |
| 빠른 선택 (7일/15일/30일/1년) | Task 3 (DatePickerRangeButton, 기존 유지) |
| 선택사항 행 — 쇼핑몰 드롭다운 (SHOPPING_MALLS) | Task 4 (OrderMallFilter) |
| 선택사항 행 — 아이디 드롭다운 (쇼핑몰 연동) | Task 4 (MALL_ACCOUNTS 연동, 쇼핑몰 변경 시 리셋) |
| 선택사항 행 — 택배사 드롭다운 (DELIVERY_COMPANY) | Task 1 (상수), Task 4 (OrderMallFilter) |
| 주문 상태 드롭다운 (ORDER_STATUS) | 기존 OrderStateFilter 유지 — 별도 수정 불필요 |
| 검색어 행 — 검색항목 드롭다운 | Task 1 (ORDER_SEARCH_TYPE), Task 5 (OrderSearchInput) |
| 검색어 행 — 텍스트 입력창 | Task 5 (OrderSearchInput) |
| 검색어 행 — 검색 버튼 | Task 5 (OrderSearchInput 통합) |
| PRODUCT_DATE_TYPE 제거 | Task 3 (ORDER_DATE_TYPE으로 교체) |
| Date[] 타입 버그 수정 | Task 2 (스토어), Task 3 (OrderDateFilter) |

모든 요구사항 커버됨.

### Placeholder Scan

없음.

### Type Consistency

- Task 1: `ORDER_DATE_TYPE`, `ORDER_SEARCH_TYPE` → `FilterOption[]` (id: string, name: string)
- Task 2: `startDateAtom`, `endDateAtom` → `atom<string>` / Task 3에서 `useSetAtom(startDateAtom)` 로 일치
- Task 2: `searchTypeAtom` → `atom<string>` / Task 5에서 `useAtom(searchTypeAtom)` 로 일치
- Task 2: `getOrderSearchFilterAtom` 반환타입 `OrderSearchType` / Task 5에서 `useAtomValue(getOrderSearchFilterAtom)` 로 일치
- Task 4: `DELIVERY_COMPANY` → Task 1에서 정의한 `FilterOption[]` 타입 일치
- Task 4: `MALL_ACCOUNTS: Record<string, FilterOption[]>` / `SHOPPING_MALLS[].code` → `string` key 일치

모두 일관됨.
