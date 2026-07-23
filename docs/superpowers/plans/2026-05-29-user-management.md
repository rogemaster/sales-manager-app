# 사용자관리 페이지 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/account/user` 경로에 사용자 목록 조회 및 일괄 삭제 기능을 갖춘 사용자관리 페이지를 구현한다.

**Architecture:** Jotai atoms(검색 필터 draft + committed 이중 상태) + TanStack Query(데이터 페칭/캐시 무효화) + MSW(POST 목록/DELETE 삭제 mock API). Role-based 버튼 노출은 gradeAtom을 읽어 조건부 렌더링으로 처리한다.

**Tech Stack:** Next.js 15 App Router, Jotai, TanStack Query, MSW, Tailwind CSS, shadcn/ui(Radix UI), dayjs

---

### Task 1: 타입 정의 & MockUsersData 업데이트

**Files:**
- Create: `src/features/account/types/user.types.ts`
- Modify: `src/mocks/data/MockUsersData.ts`
- Modify: `src/mocks/handlers.ts` (import 수정)

- [ ] **Step 1: AccountUser 타입 파일 생성**

`src/features/account/types/user.types.ts` 를 아래 내용으로 생성한다.

```typescript
import { User, UserGrade } from '@/features/auth/types/Auth';

export interface AccountUser extends User {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSearchType {
  dateType: string;
  startDate: string;
  endDate: string;
  grade: UserGrade | 'ALL';
  searchType: string;
  searchValue: string;
}

export interface GetUsersResponse {
  users: AccountUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

- [ ] **Step 2: MockUsersData.ts 전체 교체**

기존 `MockUser` 타입과 `User` 배열을 제거하고 `MockUserData`, `MOCK_USERS_DATA`로 교체한다.
`id`(고정 문자열), `createdAt`, `updatedAt` 필드를 추가한다.

```typescript
import { faker } from '@faker-js/faker';
import { AccountUser } from '@/features/account/types/user.types';

type MockUserData = AccountUser & { password: string };

export const MOCK_USERS_DATA: MockUserData[] = [
  {
    id: 'usr_001',
    email: 'admin@example.com',
    password: 'admin123',
    name: '슈퍼관리자',
    avatar: faker.image.avatar(),
    phone: '010-1234-5678',
    bio: '슈퍼 관리자입니다.',
    company: '앱 컴퍼니',
    location: '서울, 대한민국',
    grade: 'super_admin',
    createdAt: '2025-01-10',
    updatedAt: '2025-04-15',
  },
  {
    id: 'usr_002',
    email: 'user@example.com',
    password: 'user123',
    name: '홍길동',
    avatar: faker.image.avatar(),
    phone: '010-9876-5432',
    bio: '일반 관리자입니다.',
    company: '앱 컴퍼니',
    location: '서울, 대한민국',
    grade: 'admin',
    createdAt: '2025-02-20',
    updatedAt: '2025-06-08',
  },
  {
    id: 'usr_003',
    email: 'user2@example.com',
    password: 'user123',
    name: '김민준',
    avatar: faker.image.avatar(),
    phone: '010-1111-2222',
    bio: '일반 관리자입니다.',
    company: '앱 컴퍼니',
    location: '서울, 대한민국',
    grade: 'admin',
    createdAt: '2025-04-05',
    updatedAt: '2025-08-22',
  },
  {
    id: 'usr_004',
    email: 'user3@example.com',
    password: 'user123',
    name: '이서연',
    avatar: faker.image.avatar(),
    phone: '010-3333-4444',
    bio: '운영자입니다.',
    company: '앱 컴퍼니',
    location: '경기, 대한민국',
    grade: 'operator',
    createdAt: '2025-06-14',
    updatedAt: '2025-10-30',
  },
  {
    id: 'usr_005',
    email: 'user4@example.com',
    password: 'user123',
    name: '박지훈',
    avatar: faker.image.avatar(),
    phone: '010-5555-6666',
    bio: '운영자입니다.',
    company: '앱 컴퍼니',
    location: '인천, 대한민국',
    grade: 'operator',
    createdAt: '2025-08-01',
    updatedAt: '2025-12-18',
  },
  {
    id: 'usr_006',
    email: 'user5@example.com',
    password: 'user123',
    name: '최수아',
    avatar: faker.image.avatar(),
    phone: '010-7777-8888',
    bio: '운영자입니다.',
    company: '앱 컴퍼니',
    location: '부산, 대한민국',
    grade: 'operator',
    createdAt: '2025-10-11',
    updatedAt: '2026-02-07',
  },
  {
    id: 'usr_007',
    email: 'user6@example.com',
    password: 'user123',
    name: '정우진',
    avatar: faker.image.avatar(),
    phone: '010-9999-0000',
    bio: '운영자입니다.',
    company: '앱 컴퍼니',
    location: '대구, 대한민국',
    grade: 'operator',
    createdAt: '2026-01-03',
    updatedAt: '2026-05-20',
  },
];
```

- [ ] **Step 3: handlers.ts import 수정**

`src/mocks/handlers.ts` 상단 import와 로그인 핸들러를 수정한다.

```typescript
// 변경 전
import { User } from './data/MockUsersData';

// 변경 후
import { MOCK_USERS_DATA } from './data/MockUsersData';
```

로그인 핸들러 내부도 수정한다.

```typescript
// 변경 전
http.post(`${baseUrl}/api/login`, () => {
  return HttpResponse.json(User[0], {
    headers: {
      'Set-Cookie': 'connect.sid=msw-cookie;HttpOnly;Path=/',
    },
  });
}),

// 변경 후
http.post(`${baseUrl}/api/login`, () => {
  return HttpResponse.json(MOCK_USERS_DATA[0], {
    headers: {
      'Set-Cookie': 'connect.sid=msw-cookie;HttpOnly;Path=/',
    },
  });
}),
```

---

### Task 2: Account 상수 파일 생성

**Files:**
- Create: `src/features/account/constant/user.constants.ts`

- [ ] **Step 1: 상수 파일 생성**

`src/features/account/constant/user.constants.ts` 를 아래 내용으로 생성한다.

```typescript
import { FilterOption, TableTitleValue } from '@/types/common.type';

export const USER_DATE_TYPE: FilterOption[] = [
  { id: 'createdAt', name: '등록일' },
  { id: 'updatedAt', name: '수정일' },
];

export const ALL_USER_GRADE: FilterOption = { id: 'ALL', name: '전체' };

export const USER_GRADE_OPTIONS: FilterOption[] = [
  { id: 'super_admin', name: '슈퍼관리자' },
  { id: 'admin', name: '일반관리자' },
  { id: 'operator', name: '운영자' },
];

export const USER_SEARCH_TYPE: FilterOption[] = [
  { id: 'email', name: '이메일' },
  { id: 'name', name: '이름' },
];

export const USER_TABLE_HEAD: TableTitleValue[] = [
  { id: 'grade', title: '등급' },
  { id: 'email', title: '이메일' },
  { id: 'name', title: '이름' },
  { id: 'createdAt', title: '등록일' },
  { id: 'updatedAt', title: '수정일' },
];
```

---

### Task 3: Jotai 검색 상태 스토어 생성

**Files:**
- Create: `src/features/account/store/userSearch.store.ts`

- [ ] **Step 1: 스토어 파일 생성**

```typescript
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { UserGrade } from '@/features/auth/types/Auth';
import { UserSearchType } from '../types/user.types';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const currentPageAtom = atom<number>(1);
export const selectedUsersAtom = atom<string[]>([]);

export const userDateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);
export const userStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const userEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const userGradeAtom = atom<UserGrade | 'ALL'>('ALL');
export const userSearchTypeAtom = atom<string>('email');
export const userSearchValueAtom = atom<string>('');

// UI draft 상태 — 검색 버튼 클릭 전까지 API 호출에 사용되지 않음
export const getUserSearchFilterAtom = atom<UserSearchType>((get) => ({
  dateType: get(userDateTypeAtom),
  startDate: get(userStartDateAtom),
  endDate: get(userEndDateAtom),
  grade: get(userGradeAtom),
  searchType: get(userSearchTypeAtom),
  searchValue: get(userSearchValueAtom),
}));

// 검색 버튼 클릭 시 확정된 필터 — API 쿼리에 실제로 사용
export const committedFiltersAtom = atom<UserSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  grade: 'ALL',
  searchType: 'email',
  searchValue: '',
});
```

---

### Task 4: MSW 유틸 함수 생성

**Files:**
- Create: `src/mocks/utils/getUsers.ts`
- Create: `src/mocks/utils/deleteUsers.ts`

- [ ] **Step 1: getUsers.ts 생성**

`src/mocks/utils/getUsers.ts` 를 생성한다.

```typescript
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { MOCK_USERS_DATA } from '../data/MockUsersData';
import { AccountUser, GetUsersResponse, UserSearchType } from '@/features/account/types/user.types';

dayjs.extend(isBetween);

export const getMockUsers = (filters: UserSearchType, page: number, pageSize: number): GetUsersResponse => {
  const { dateType, startDate, endDate, grade, searchType, searchValue } = filters;

  const filtered = MOCK_USERS_DATA.filter((user) => {
    const dateValue = dateType === 'createdAt' ? user.createdAt : user.updatedAt;
    if (!dayjs(dateValue).isBetween(startDate, endDate, 'day', '[]')) return false;
    if (grade !== 'ALL' && user.grade !== grade) return false;
    if (searchValue) {
      const target = searchType === 'email' ? user.email : user.name;
      if (!target.toLowerCase().includes(searchValue.toLowerCase())) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const users: AccountUser[] = filtered
    .slice((page - 1) * pageSize, page * pageSize)
    .map(({ password: _password, ...user }) => user);

  return { users, total, page, pageSize, totalPages };
};
```

- [ ] **Step 2: deleteUsers.ts 생성**

`src/mocks/utils/deleteUsers.ts` 를 생성한다.

```typescript
import { MOCK_USERS_DATA } from '../data/MockUsersData';

export const deleteMockUsers = (ids: string[]): void => {
  const idSet = new Set(ids);
  for (let i = MOCK_USERS_DATA.length - 1; i >= 0; i--) {
    if (idSet.has(MOCK_USERS_DATA[i].id)) {
      MOCK_USERS_DATA.splice(i, 1);
    }
  }
};
```

---

### Task 5: MSW 핸들러 등록

**Files:**
- Modify: `src/mocks/handlers.ts`

- [ ] **Step 1: import 추가**

`src/mocks/handlers.ts` 상단 import 블록에 아래를 추가한다.

```typescript
import { getMockUsers } from './utils/getUsers';
import { deleteMockUsers } from './utils/deleteUsers';
import { UserSearchType } from '@/features/account/types/user.types';
```

- [ ] **Step 2: 핸들러 2개 추가**

`handlers` 배열 마지막 핸들러 뒤에 아래 두 핸들러를 추가한다.

```typescript
  // 사용자 목록 조회
  http.post(`${baseUrl}/api/account/users/list`, async ({ request }) => {
    const { filters, page, pageSize } = (await request.json()) as {
      filters: UserSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockUsers(filters, page, pageSize));
  }),

  // 사용자 일괄 삭제
  http.delete(`${baseUrl}/api/account/users`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockUsers(ids);
    return HttpResponse.json({ success: true });
  }),
```

---

### Task 6: API 함수 & React Query 훅 생성

**Files:**
- Create: `src/features/account/api/getUsers.ts`
- Create: `src/features/account/api/useGetUsers.ts`
- Create: `src/features/account/api/deleteUsers.ts`
- Create: `src/features/account/api/useDeleteUsers.ts`

- [ ] **Step 1: getUsers.ts 생성**

```typescript
import { GetUsersResponse, UserSearchType } from '../types/user.types';

export const getUsers = async (filters: UserSearchType, page: number, pageSize: number = 20): Promise<GetUsersResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });
  if (!response.ok) throw new Error('사용자 목록 조회 실패');
  return response.json();
};
```

- [ ] **Step 2: useGetUsers.ts 생성**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/userSearch.store';
import { getUsers } from './getUsers';

export const USER_LIST_QUERY_KEY = 'userList';

export const useGetUsers = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);

  return useQuery({
    queryKey: [USER_LIST_QUERY_KEY, filters, currentPage],
    queryFn: () => getUsers(filters, currentPage),
  });
};
```

- [ ] **Step 3: deleteUsers.ts 생성**

```typescript
export const deleteUsers = async (ids: string[]): Promise<void> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('사용자 삭제 실패');
};
```

- [ ] **Step 4: useDeleteUsers.ts 생성**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUsers } from './deleteUsers';
import { USER_LIST_QUERY_KEY } from './useGetUsers';

export const useDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_LIST_QUERY_KEY] });
    },
  });
};
```

---

### Task 7: 검색 필터 UI 컴포넌트

**Files:**
- Create: `src/features/account/ui/user/components/UserDateFilter.tsx`
- Create: `src/features/account/ui/user/components/UserGradeFilter.tsx`
- Create: `src/features/account/ui/user/components/UserSearchInput.tsx`
- Create: `src/features/account/ui/user/UserSearchFilterSection.tsx`

- [ ] **Step 1: UserDateFilter.tsx 생성**

`FilterSelect`는 자체 div 래퍼를 포함하므로 인라인 flex 항목으로 사용하면 레이아웃이 깨진다.
`OrderDateFilter`와 동일하게 `Select`를 직접 사용한다.

```tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { RangeTypeProps } from '@/types/common.type';
import { userDateTypeAtom, userStartDateAtom, userEndDateAtom } from '@/features/account/store/userSearch.store';
import { USER_DATE_TYPE } from '@/features/account/constant/user.constants';
import dayjs from 'dayjs';

export const UserDateFilter = () => {
  const [dateType, setDateType] = useAtom(userDateTypeAtom);
  const setStartDate = useSetAtom(userStartDateAtom);
  const setEndDate = useSetAtom(userEndDateAtom);

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
      <Select value={dateType} onValueChange={setDateType}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USER_DATE_TYPE.map((item) => (
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

- [ ] **Step 2: UserGradeFilter.tsx 생성**

```tsx
'use client';

import { useAtom } from 'jotai';
import { userGradeAtom } from '@/features/account/store/userSearch.store';
import { ALL_USER_GRADE, USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { FilterSelect } from '@/components/common/FilterSelect';
import { UserGrade } from '@/features/auth/types/Auth';

export const UserGradeFilter = () => {
  const [grade, setGrade] = useAtom(userGradeAtom);

  return (
    <FilterSelect
      label="등급"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={grade}
      onValueChange={(v) => setGrade(v as UserGrade | 'ALL')}
      options={USER_GRADE_OPTIONS}
      allOption={ALL_USER_GRADE}
      triggerClassName="w-32"
    />
  );
};
```

- [ ] **Step 3: UserSearchInput.tsx 생성**

```tsx
'use client';

import { ChangeEventHandler, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import {
  userSearchTypeAtom,
  getUserSearchFilterAtom,
  committedFiltersAtom,
  currentPageAtom,
} from '@/features/account/store/userSearch.store';
import { USER_SEARCH_TYPE } from '@/features/account/constant/user.constants';

export const UserSearchInput = () => {
  const [searchType, setSearchType] = useAtom(userSearchTypeAtom);
  const draftFilters = useAtomValue(getUserSearchFilterAtom);
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
      <Select value={searchType} onValueChange={setSearchType}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USER_SEARCH_TYPE.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1 max-w-md">
        <Input
          placeholder="검색어를 입력하세요..."
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

- [ ] **Step 4: UserSearchFilterSection.tsx 생성**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserDateFilter } from './components/UserDateFilter';
import { UserGradeFilter } from './components/UserGradeFilter';
import { UserSearchInput } from './components/UserSearchInput';

export const UserSearchFilterSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>검색 및 필터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <UserDateFilter />
          <UserGradeFilter />
          <UserSearchInput />
        </div>
      </CardContent>
    </Card>
  );
};
```

---

### Task 8: 액션 섹션 (등록/삭제 버튼)

**Files:**
- Create: `src/features/account/ui/user/UserActionSection.tsx`

- [ ] **Step 1: UserActionSection.tsx 생성**

`gradeAtom`을 읽어 권한별 버튼을 조건부 렌더링한다.
삭제는 `useAlert` confirm 후 `useDeleteUsers` 호출한다.

```tsx
'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserPlus, Trash2 } from 'lucide-react';
import { gradeAtom } from '@/features/auth/store/auth.store';
import { selectedUsersAtom } from '@/features/account/store/userSearch.store';
import { useDeleteUsers } from '@/features/account/api/useDeleteUsers';
import { useAlert } from '@/hooks/useAlert';

export const UserActionSection = () => {
  const grade = useAtomValue(gradeAtom);
  const [selectedUsers, setSelectedUsers] = useAtom(selectedUsersAtom);
  const { mutate: deleteUsers, isPending } = useDeleteUsers();
  const { showAlert } = useAlert();
  const router = useRouter();

  const canRegister = grade === 'super_admin' || grade === 'admin';
  const canDelete = grade === 'super_admin';

  const handleDelete = () => {
    if (selectedUsers.length === 0) {
      showAlert({ message: '삭제할 사용자를 선택해주세요.', type: 'warning' });
      return;
    }

    const snapshotIds = [...selectedUsers];
    const count = snapshotIds.length;

    showAlert({
      title: '사용자 삭제',
      message: `선택한 ${count}명의 사용자를 삭제하시겠습니까?`,
      showCancel: true,
      onConfirm: () => {
        deleteUsers(snapshotIds, {
          onSuccess: () => {
            setSelectedUsers([]);
            showAlert({ message: `${count}명의 사용자가 삭제되었습니다.`, type: 'success' });
          },
        });
      },
    });
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-muted-foreground min-w-16">
        선택 <span className="font-medium text-foreground">{selectedUsers.length}</span>명
      </span>
      {canRegister && (
        <Button variant="outline" size="sm" onClick={() => router.push('/account/user/create')}>
          <UserPlus className="h-4 w-4 mr-2" />
          사용자 등록
        </Button>
      )}
      {canDelete && (
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </Button>
      )}
    </div>
  );
};
```

---

### Task 9: 테이블 UI

**Files:**
- Create: `src/features/account/ui/user/components/UserTable.tsx`
- Create: `src/features/account/ui/user/UserTableSection.tsx`

- [ ] **Step 1: UserTable.tsx 생성**

체크박스 전체 선택/해제, 수정 아이콘 클릭 시 `/account/user/[id]` 이동

```tsx
'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit } from 'lucide-react';
import { selectedUsersAtom } from '@/features/account/store/userSearch.store';
import { USER_TABLE_HEAD, USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { AccountUser } from '@/features/account/types/user.types';

const gradeLabel = (grade: string) => USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;

interface UserTableProps {
  users: AccountUser[];
}

export const UserTable = ({ users }: UserTableProps) => {
  const [selectedUsers, setSelectedUsers] = useAtom(selectedUsersAtom);
  const router = useRouter();

  const handleSelectUser = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, id]);
    } else {
      setSelectedUsers((prev) => prev.filter((v) => v !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((u) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={users.length > 0 && selectedUsers.length === users.length}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {USER_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className="text-center">
              {item.title}
            </TableHead>
          ))}
          <TableHead className="text-center">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={USER_TABLE_HEAD.length + 2} className="h-40 text-center text-muted-foreground text-sm">
              조건에 맞는 사용자가 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={(checked: boolean) => handleSelectUser(user.id, checked)}
                />
              </TableCell>
              <TableCell className="text-center">{gradeLabel(user.grade)}</TableCell>
              <TableCell className="text-center">{user.email}</TableCell>
              <TableCell className="text-center">{user.name}</TableCell>
              <TableCell className="text-center">{user.createdAt}</TableCell>
              <TableCell className="text-center">{user.updatedAt}</TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/account/user/${user.id}`)}>
                  <Edit className="h-4 w-4" />
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

- [ ] **Step 2: UserTableSection.tsx 생성**

페이지 변경 시 선택 초기화, 로딩 상태, 페이지네이션 포함

```tsx
'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { currentPageAtom, selectedUsersAtom } from '@/features/account/store/userSearch.store';
import { useGetUsers } from '@/features/account/api/useGetUsers';
import { UserTable } from './components/UserTable';

export const UserTableSection = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const { data, isLoading } = useGetUsers();
  const setSelectedUsers = useSetAtom(selectedUsersAtom);

  useEffect(() => {
    setSelectedUsers([]);
  }, [data, setSelectedUsers]);

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>총 {isLoading ? '-' : total}명의 사용자</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">불러오는 중...</div>
        ) : (
          <UserTable users={users} />
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

---

### Task 10: 레이아웃 & 페이지

**Files:**
- Create: `src/features/account/ui/user/UserManagementLayout.tsx`
- Create: `src/app/(authenticated)/account/user/page.tsx`

- [ ] **Step 1: UserManagementLayout.tsx 생성**

```tsx
'use client';

import { UserSearchFilterSection } from './UserSearchFilterSection';
import { UserActionSection } from './UserActionSection';
import { UserTableSection } from './UserTableSection';

export const UserManagementLayout = () => {
  return (
    <>
      <UserSearchFilterSection />
      <UserActionSection />
      <UserTableSection />
    </>
  );
};
```

- [ ] **Step 2: page.tsx 생성**

```tsx
import { UserManagementLayout } from '@/features/account/ui/user/UserManagementLayout';

export default function UserManagementPage() {
  return <UserManagementLayout />;
}
```

- [ ] **Step 3: 개발 서버에서 동작 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/account/user` 접속 후 아래 항목을 확인한다:

1. 사용자 목록이 테이블에 표시되는가
2. 날짜 필터 / 등급 필터 / 검색어 필터 후 검색 버튼 클릭 시 목록이 필터링되는가
3. 체크박스로 사용자 선택 → 삭제 버튼 → Alert 확인 → 목록에서 제거되는가
4. super_admin 로그인 시 "사용자 등록", "삭제" 버튼 모두 표시되는가
5. admin 로그인 시 "사용자 등록" 버튼만 표시되는가 (로그인 화면에서 `user@example.com` / `user123` 사용)
6. 수정 아이콘 클릭 시 `/account/user/[id]` 경로로 이동 시도되는가

---

### 추가 변경: MSW 로그인 핸들러 개선

**Files:**
- Create: `src/mocks/utils/loginUser.ts`
- Modify: `src/mocks/handlers.ts`

기존 로그인 핸들러는 무조건 `MOCK_USERS_DATA[0]`을 반환했다. email/password를 조회해서 일치하는 사용자를 반환하도록 수정한다.

- [ ] **Step 1: loginUser.ts 생성**

```typescript
import { MOCK_USERS_DATA } from '../data/MockUsersData';

export const loginUser = (email: string, password: string) => {
  const user = MOCK_USERS_DATA.find((u) => u.email === email && u.password === password);
  if (!user) return null;
  const { password: _, ...rest } = user;
  return rest;
};
```

> `password: _` 표기는 ESLint/TypeScript에서 "의도적으로 미사용" 임을 나타내는 범용 관례. `_password`는 프로젝트 ESLint `varsIgnorePattern` 미설정 시 에러 발생.

- [ ] **Step 2: handlers.ts 로그인 핸들러 수정**

```typescript
import { loginUser } from './utils/loginUser';

http.post(`${baseUrl}/api/login`, async ({ request }) => {
  const { email, password } = (await request.json()) as { email: string; password: string };
  const user = loginUser(email, password);
  if (!user) return new HttpResponse(null, { status: 401 });
  return HttpResponse.json(user, {
    headers: {
      'Set-Cookie': 'connect.sid=msw-cookie;HttpOnly;Path=/',
    },
  });
}),
```

---

### 추가 변경: NextAuth 타입 확장 및 gradeAtom 초기화

**Files:**
- Create: `src/types/next-auth.d.ts`
- Modify: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/app/(authenticated)/layout.tsx`

**원인:** NextAuth `jwt`/`session` 콜백이 `grade` 등 커스텀 필드를 토큰에 저장하지 않았고, `setUserInfoAtom`도 어디서도 호출되지 않아 `gradeAtom`이 항상 초기값 `'operator'`로 유지됨.

- [ ] **Step 1: next-auth.d.ts 생성 (모듈 확장)**

NextAuth가 공식 권장하는 Declaration Merging 방식. `as any` 캐스트나 API 재조회 대신 타입 안전하게 커스텀 필드를 추가한다.

```typescript
// src/types/next-auth.d.ts
import { UserGrade } from '@/features/auth/types/Auth';

declare module 'next-auth' {
  interface User {
    grade: UserGrade;
    avatar: string;
    phone: string;
    bio: string;
    company: string;
    location: string;
  }

  interface Session {
    user: {
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
    grade: UserGrade;
    avatar: string;
    phone: string;
    bio: string;
    company: string;
    location: string;
  }
}
```

- [ ] **Step 2: route.ts jwt/session 콜백 수정**

```typescript
async jwt({ token, user }) {
  if (user) {
    token.email = user.email;
    token.name = user.name;
    token.grade = user.grade;
    token.avatar = user.avatar;
    token.phone = user.phone;
    token.bio = user.bio;
    token.company = user.company;
    token.location = user.location;
  }
  return token;
},
async session({ session, token }) {
  session.user.email = token.email ?? '';
  session.user.name = token.name ?? '';
  session.user.grade = token.grade;
  session.user.avatar = token.avatar;
  session.user.phone = token.phone;
  session.user.bio = token.bio;
  session.user.company = token.company;
  session.user.location = token.location;
  return session;
},
```

- [ ] **Step 3: layout.tsx에서 setUserInfoAtom 호출**

```typescript
'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSetAtom } from 'jotai';
import { setUserInfoAtom } from '@/features/auth/store/auth.store';
import { User } from '@/features/auth/types/Auth';

export default function Layout({ children }: Props) {
  const queryClient = new QueryClient();
  const { data: session } = useSession();
  const setUserInfo = useSetAtom(setUserInfoAtom);

  useEffect(() => {
    if (session?.user) {
      setUserInfo(session.user as unknown as User);
    }
  }, [session, setUserInfo]);

  // ...
}
```

---

### 추가 변경: 미들웨어 매처

**Files:**
- Modify: `src/middleware.ts`

`/account/:path*` 경로 보호를 위해 매처에 추가한다.

```typescript
export const config = {
  matcher: ['/', '/home/:path*', '/products/:path*', '/order/:path*', '/account/:path*'],
};
```
