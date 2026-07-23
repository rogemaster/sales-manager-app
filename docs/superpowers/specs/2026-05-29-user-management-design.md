# 사용자관리 페이지 설계

## 개요

`/account/user` 경로에 사용자 목록 조회 및 일괄 삭제 기능을 가진 페이지를 구현한다.
등록/수정은 이 페이지에서 처리하지 않으며 각각 별도 페이지로 개발 예정이다. 현재는 버튼 클릭 시 해당 경로로 이동하는 것만 구현한다.

## 권한 (Role-based UI)

- `super_admin`: 사용자등록 버튼, 삭제 버튼 모두 노출
- `admin`: 사용자등록 버튼만 노출
- `operator`: 두 버튼 모두 미노출

권한 체크는 Jotai `gradeAtom`을 직접 읽어 조건부 렌더링으로 처리한다.

## 타입 설계

### AccountUser

```typescript
// src/features/account/types/user.types.ts
import { User } from '@/features/auth/types/Auth';

export interface AccountUser extends User {
  id: string;       // DB 자동 부여 유니크 값 (UUID 등)
  createdAt: string;
  updatedAt: string;
}
```

기존 `User` (auth)를 상속하여 `id`, `createdAt`, `updatedAt`을 추가한다.
`id`는 DB에서 자동 부여되는 유니크 값으로 수정 페이지 URL 경로 및 삭제 식별자로 사용한다.
`password`는 mock 인증 전용으로 `MockUsersData.ts` 내부 타입에만 유지한다.

### MockUsersData 타입 교체

```typescript
// src/mocks/data/MockUsersData.ts
import { AccountUser } from '@/features/account/types/user.types';

type MockUserData = AccountUser & { password: string };
```

기존 로컬 `MockUser` 타입을 제거하고 `MockUserData`로 교체. `id`(faker UUID), `createdAt`, `updatedAt` 필드를 mock 데이터에 추가한다.

## 파일 구조

```
src/features/account/
├── api/
│   ├── getUsers.ts
│   ├── useGetUsers.ts
│   ├── deleteUsers.ts
│   └── useDeleteUsers.ts
├── constant/
│   └── user.constants.ts
├── store/
│   └── userSearch.store.ts
├── types/
│   └── user.types.ts
└── ui/
    └── user/
        ├── UserManagementLayout.tsx
        ├── UserSearchFilterSection.tsx
        ├── UserActionSection.tsx
        ├── UserTableSection.tsx
        └── components/
            ├── UserDateFilter.tsx
            ├── UserGradeFilter.tsx
            ├── UserSearchInput.tsx
            └── UserTable.tsx

src/app/(authenticated)/account/user/
└── page.tsx

src/mocks/
├── data/MockUsersData.ts          # 기존 파일 수정 (타입 교체, 날짜 필드 추가)
└── utils/
    ├── getUsers.ts
    ├── deleteUsers.ts
    └── loginUser.ts               # email/password 조회 후 password 제외 반환

src/types/
└── next-auth.d.ts                 # NextAuth User, Session, JWT 커스텀 필드 모듈 확장
```

## 검색 상태 (Jotai Atoms)

```typescript
// src/features/account/store/userSearch.store.ts
export const userDateTypeAtom = atom<string>('createdAt');
export const userStartDateAtom = atom<string>(DEFAULT_START_DATE);  // 오늘 기준 -7일
export const userEndDateAtom = atom<string>(DEFAULT_END_DATE);      // 오늘
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
export const committedFiltersAtom = atom<UserSearchType>({ /* 초기값 */ });
```

검색 버튼 클릭 시점에 `committedFiltersAtom`을 업데이트하여 API를 호출한다 (입력마다 호출하지 않음).

## UI 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│ 상단 (UserSearchFilterSection)                            │
│  [등록일/수정일 ▼] [YYYY-MM-DD ~ YYYY-MM-DD] [7일][15일][30일][1년] │
│  [등급 ▼]                                               │
│  [이메일/이름 ▼] [검색어 입력...................] [검색]  │
├──────────────────────────────────────────────────────────┤
│ 중간 (UserActionSection)                                 │
│  [사용자등록]¹  [삭제]²                                  │
│  ¹ super_admin, admin만 노출                             │
│  ² super_admin만 노출                                    │
├──────────────────────────────────────────────────────────┤
│ 테이블 (UserTableSection)                                │
│  ☐  등급        이메일               이름    등록일   수정일  ✏️  │
│  ☐  슈퍼관리자  admin@example.com   슈퍼관리자  2026-01-10  2026-04-15  ✏️ │
│  ...                                                     │
│  [페이지네이션]                                          │
└──────────────────────────────────────────────────────────┘
```

### 컴포넌트별 역할

- **UserDateFilter**: 날짜 타입 드롭다운(등록일/수정일) + RangeDatePicker + DatePickerRangeButton. 기존 `OrderDateFilter` 패턴과 동일.
- **UserGradeFilter**: 등급 드롭다운 (전체 / 슈퍼관리자 / 일반관리자 / 운영자)
- **UserSearchInput**: 이메일/이름 선택 드롭다운 + 텍스트 입력 + 검색 버튼
- **UserActionSection**: `gradeAtom` 읽어 권한별 버튼 조건부 렌더링
- **UserTableSection**: 체크박스 선택 상태 관리, TanStack Query로 데이터 페칭, 페이지네이션

## MSW Mock API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/login` | 로그인 (email/password 조회) |
| POST | `/api/account/users/list` | 사용자 목록 조회 |
| DELETE | `/api/account/users` | 사용자 일괄 삭제 |

**로그인 핸들러:** `loginUser(email, password)` → 일치하는 사용자 없으면 401, 있으면 password 제외 후 반환. 기존 `MOCK_USERS_DATA[0]` 고정 반환 방식에서 변경.

**POST 요청 body:** `{ filters: UserSearchType, page: number, pageSize: number }`

**DELETE 요청 body:** `{ ids: string[] }`

비즈니스 로직은 `src/mocks/utils/getUsers.ts`, `deleteUsers.ts`로 분리한다.

## 삭제 플로우

1. 체크박스로 대상 선택
2. 삭제 버튼 클릭 → Alert 다이얼로그: "선택한 N명의 사용자를 삭제하시겠습니까?"
3. 확인 → `DELETE /api/account/users` (`{ ids: string[] }`)
4. TanStack Query invalidate → 목록 자동 갱신
5. 체크박스 선택 초기화

## 라우트 이동 (등록/수정)

- 사용자등록 버튼 → `router.push('/account/user/create')`
- 수정 아이콘 → `router.push('/account/user/[id]')`

해당 페이지는 현재 개발 범위 외. 페이지 파일 없이 경로 이동만 구현.

## NextAuth 타입 확장 및 gradeAtom 초기화

`gradeAtom` 초기값은 `'operator'`. 로그인 후 실제 등급으로 업데이트하려면 두 가지가 필요하다.

**1. `src/types/next-auth.d.ts` — 모듈 확장 (Declaration Merging)**

NextAuth 공식 권장 방식. `User`, `Session`, `JWT` 인터페이스에 `grade`, `avatar`, `phone`, `bio`, `company`, `location` 필드를 추가한다. `as any` 캐스트나 API 재조회는 비권장.

**2. `route.ts` jwt/session 콜백 — 커스텀 필드를 토큰/세션에 포함**

`authorize`가 반환한 `user` 객체의 커스텀 필드를 `jwt` 콜백에서 `token`에 저장하고, `session` 콜백에서 `session.user`에 전달한다.

**3. `layout.tsx` — `useSession` + `setUserInfoAtom`으로 gradeAtom 초기화**

```typescript
const { data: session } = useSession();
const setUserInfo = useSetAtom(setUserInfoAtom);

useEffect(() => {
  if (session?.user) setUserInfo(session.user as unknown as User);
}, [session, setUserInfo]);
```

## 미들웨어

`src/middleware.ts` 매처에 `/account/:path*`를 추가하여 미인증 사용자가 `/account/*` 경로에 접근 시 `/login`으로 리다이렉트한다.

```typescript
export const config = {
  matcher: ['/', '/home/:path*', '/products/:path*', '/order/:path*', '/account/:path*'],
};
```
