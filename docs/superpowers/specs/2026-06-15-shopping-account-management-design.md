# 쇼핑몰 계정관리 화면 설계

**작성일:** 2026-06-15  
**상태:** 설계 확정 (구현 대기)

---

## 1. 개요

외부 쇼핑 플랫폼(쿠팡, 네이버 등)의 API 연동 계정을 등록·조회·수정·삭제하는 화면.  
사용자 권한(슈퍼계정 / 일반관리자 / 운영자)에 따라 노출되는 액션이 다르다.

---

## 2. 메뉴 위치

사이드바 `쇼핑몰관리` 하위에 배치한다. 계정관리 하위가 아닌 이유: 계정관리는 사람·조직 단위 엔티티 관리이고, 쇼핑몰 계정은 시스템 통합 설정 성격이기 때문이다.

```
쇼핑몰관리
  ├── 쇼핑몰 계정관리   ← 신규 (enabled)
  ├── 쇼핑몰설정        (disabled)
  ├── 쇼핑몰상품등록    (disabled)
  └── 쇼핑몰상품목록    (disabled)
```

`src/constant/sidebarMenu.constant.ts`의 쇼핑몰관리 items 배열 최상단에 추가한다.

---

## 3. 라우트 구조

| 경로 | 역할 |
|------|------|
| `/shopping/accounts` | 계정 목록 페이지 |
| `/shopping/accounts/create` | 계정 등록 페이지 |
| `/shopping/accounts/[id]` | 계정 수정 페이지 |

---

## 4. 피처 모듈 구조

```
src/features/shoppingAccount/
  ├── api/
  │   ├── getShoppingAccounts.ts     # 목록 조회
  │   ├── getShoppingAccount.ts      # 단건 조회
  │   ├── createShoppingAccount.ts   # 등록
  │   ├── updateShoppingAccount.ts   # 수정
  │   └── deleteShoppingAccounts.ts  # 삭제 (단건/다중)
  ├── store/
  │   └── search.store.ts            # 검색 필터 atoms
  ├── types/
  │   └── shoppingAccount.types.ts
  ├── constant/
  │   └── shoppingAccount.constants.ts
  └── ui/
      ├── list/
      │   ├── ShoppingAccountListLayout.tsx
      │   ├── ShoppingAccountListHeaderSection.tsx
      │   ├── ShoppingAccountActionSection.tsx
      │   ├── ShoppingAccountSearchFilterSection.tsx
      │   └── ShoppingAccountTableSection.tsx
      ├── create/
      │   └── ShoppingAccountCreateLayout.tsx
      └── [id]/
          └── ShoppingAccountModifyLayout.tsx
```

---

## 5. 데이터 모델

```typescript
// src/features/shoppingAccount/types/shoppingAccount.types.ts

export interface ShoppingAccount {
  id: string;
  mallName: string;       // 쇼핑몰명 (쿠팡, 네이버 등)
  mallId: string;         // 쇼핑몰 ID
  password: string;       // 패스워드
  isActive: boolean;      // 사용여부
  nickname: string;       // 별명
  managerMd: string;      // 담당 MD
  phone: string;          // 연락처
  email: string;          // 이메일
  domain: string;         // 도메인
  category: string;       // 카테고리
  apiKey: string;         // 연동 API
  ownerId: string;        // 슈퍼계정 ID (기존 계층 구조 활용)
  createdAt: string;      // 등록일 (ISO 8601)
  updatedAt: string;      // 수정일 (ISO 8601)
}

export interface ShoppingAccountSearchType {
  dateType: 'createdAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  isActive: boolean | 'ALL';
  mallName: string | 'ALL';
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

---

## 6. 목록 페이지 상세 설계

### 6-1. 검색 필터 영역

```
행1: [등록일/수정일 ▼]  [시작일]  ~  [종료일]
행2: [사용여부 ▼]       [쇼핑몰 선택 ▼]
행3: [검색어 입력_______________________________]  [검색]
```

- `등록일/수정일` 드롭박스: `createdAt` | `updatedAt`
- `사용여부` 드롭박스: 전체 | 사용 | 미사용
- `쇼핑몰 선택` 드롭박스: 전체 + 등록된 쇼핑몰 플랫폼 목록

### 6-2. 액션 버튼 영역 (권한별 노출)

| 권한 | 노출 버튼 |
|------|-----------|
| `super_admin` | [계정삭제] [사용여부 ▼] [사용변경] |
| `admin` | [사용여부 ▼] [사용변경] |
| `operator` | (없음) |

- `계정삭제`: 체크박스 선택 항목 일괄 삭제 → confirm 다이얼로그 후 실행
- `사용여부` 드롭박스: 사용 | 미사용 선택
- `사용변경`: 선택 항목의 사용여부를 드롭박스 값으로 일괄 변경

### 6-3. 테이블 헤더

| 컬럼 | 정렬 |
|------|------|
| 체크박스 | center |
| 쇼핑몰명 | center |
| 별명 | left |
| 사용여부 | center (Badge) |
| 등록일 | center |
| 수정일 | center |

- 행 클릭 → `/shopping/accounts/[id]` (수정 페이지 이동)
- 페이지네이션: 기존 `TablePagination` 공통 컴포넌트 재사용

---

## 7. 등록/수정 페이지 상세 설계

### 7-1. 입력 필드 (10개, 2컬럼 그리드)

| 좌측 | 우측 |
|------|------|
| 쇼핑몰 ID | 패스워드 |
| 사용여부 (드롭박스) | 별명 |
| 담당 MD | 연락처 |
| 이메일 | 도메인 |
| 카테고리 | 연동 API |

### 7-2. 유효성 검사 (Zod)

- `mallId`: 필수
- `password`: 필수
- `nickname`: 선택
- `phone`: 선택, 연락처 형식 검증 (공통 유틸 활용)
- `email`: 선택, 이메일 형식 검증
- 나머지 필드: 선택

### 7-3. 하단 버튼

```
                              [초기화]  [취소]  [저장]
```

- `초기화`: 폼을 기본값으로 리셋. 수정 페이지에서는 서버에서 받은 원본값으로 복원
- `취소`: `/shopping/accounts`로 이동
- `저장`: 유효성 검사 통과 후 등록(POST) 또는 수정(PATCH) API 호출 → 성공 시 목록으로 이동 + TanStack Query 캐시 무효화

---

## 8. MSW 핸들러 목록

```
POST   /api/shopping/accounts/list     # 목록 조회 (필터·페이지 body)
GET    /api/shopping/accounts/:id      # 단건 조회
POST   /api/shopping/accounts          # 등록
PATCH  /api/shopping/accounts/:id      # 수정
DELETE /api/shopping/accounts/:id      # 단건 삭제
POST   /api/shopping/accounts/delete   # 다중 삭제
PATCH  /api/shopping/accounts/status   # 사용여부 일괄 변경
```

핸들러 로직은 모두 `src/mocks/utils/` 하위 파일로 분리한다.

---

## 9. 권한 체계

기존 `ownerId` 기반 슈퍼계정/일반관리자/운영자 구조를 그대로 활용한다.  
`UserGrade` 타입: `super_admin` | `admin` | `operator`

목록 페이지의 액션 버튼 노출 여부는 `useSession()`으로 가져온 `grade` 값으로 판단한다.

---

## 10. 구현 시 제거할 alert 코드

`src/constant/sidebarMenu.constant.ts`에서 쇼핑몰 계정관리 메뉴의 `disabled: true`를 제거하면  
`GlobalSidebarMenu`의 `handleDisabledMenuClick` 분기가 자동으로 해제된다.
