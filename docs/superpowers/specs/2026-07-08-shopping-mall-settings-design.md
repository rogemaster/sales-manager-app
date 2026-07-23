# 쇼핑몰 정보설정 화면 설계

- 작성일: 2026-07-08
- 상태: 승인됨 (리스트 화면 범위)

## 배경 및 범위

쇼핑몰별 고유 특수 필드값, 배송지 등을 선택·설정한 값을 리스트로 확인하는 "쇼핑몰 정보설정" 화면을 신규 개발한다.

기존 `src/features/shoppingAccount`(쇼핑몰 계정관리, 로그인 계정/API키 관리)와는 별개의 화면이다. 이번 화면은 계정별 "설정값"(특수필드, 배송지 등)을 관리하는 목적이며, 하나의 쇼핑몰 계정에 대해 여러 개의 설정 건(별칭으로 구분)이 존재할 수 있다.

**이번 라운드 구현 범위는 리스트 화면까지다.** 아래 기능은 상세 필드(특수필드/배송지) 설계가 필요한 다음 작업으로 미룬다:

- 신규추가 모달에서 "등록" 클릭 후 이동할 정보 입력 페이지
- 테이블의 "수정" 버튼 → 설정값 편집 모달
- 테이블의 "복사" 버튼 → 설정값 복제 로직
- "정보일괄설정" 버튼 → 특수필드/배송지 일괄 설정 모달

위 4개 기능은 이번 라운드에서 버튼/UI로는 배치하되, 클릭 시 공통 `showAlert({ type: 'info', message: '준비중인 기능입니다.' })` 안내만 노출한다.

## 메뉴 / 라우트

`src/constant/sidebarMenu.constant.ts`의 `쇼핑몰관리` 그룹에 형제 메뉴로 추가:

```
쇼핑몰관리
  ├─ 쇼핑몰 계정관리   /shopping/accounts
  └─ 쇼핑몰 정보설정   /shopping/settings   (신규)
```

신규 페이지: `src/app/(authenticated)/shopping/settings/page.tsx`

## 폴더 구조

기존 `shoppingAccount` feature와 동일한 패턴을 따른다.

```
src/features/shoppingSetting/
├── api/
│   ├── getShoppingSettings.ts / useGetShoppingSettings.ts
│   ├── updateShoppingSettingsStatus.ts / useUpdateShoppingSettingsStatus.ts
│   ├── deleteShoppingSettings.ts / useDeleteShoppingSettings.ts
│   └── getAvailableMallAccounts.ts / useGetAvailableMallAccounts.ts
├── store/
│   └── search.store.ts        # 검색필터 atom, 선택된 행(id) atom
├── types/
│   └── shoppingSetting.types.ts
├── constant/
│   └── shoppingSetting.constants.ts   # 날짜타입 옵션, 테이블 헤더, 쇼핑몰 필터(SHOPPING_MALLS 재사용)
└── ui/list/
    ├── ShoppingSettingListLayout.tsx
    ├── ShoppingSettingListHeaderSection.tsx
    ├── ShoppingSettingSearchFilterSection.tsx
    ├── ShoppingSettingActionSection.tsx
    ├── ShoppingSettingTableSection.tsx
    └── components/
        ├── SettingDateFilter.tsx
        ├── SettingMallFilter.tsx      # 계정등록쇼핑몰 → 쇼핑몰아이디 종속 드롭다운
        ├── SettingSearchInput.tsx
        └── NewSettingModal.tsx        # 신규추가 모달
```

레이아웃 패턴: `HeaderSection → SearchFilterSection → ActionSection → TableSection` (기존 상품/주문/사용자관리 목록 페이지와 동일).

## 데이터 모델

```ts
// src/features/shoppingSetting/types/shoppingSetting.types.ts

export interface ShoppingSetting {
  id: string;
  mallAccountId: string;   // 참조: ShoppingAccount.id
  mallCode: ShoppingMalls; // 쇼핑몰 (denormalized, 필터/테이블 표시용)
  mallId: string;          // 계정 아이디 (denormalized)
  nickname: string;        // 별칭 - 설정 건 단위 구분자 (계정당 여러 설정 허용)
  isActive: boolean;       // 사용여부
  ownerId: string;         // 슈퍼계정 종속 (도메인 설계 규칙: ownerId 패턴)
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingSettingSearchType {
  dateType: 'CREATED' | 'UPDATED';
  startDate: string | null;
  endDate: string | null;
  mallCode: ShoppingMalls | null;
  mallAccountId: string | null; // mallCode에 종속
  keyword: string;
}

export interface GetShoppingSettingsResponse {
  data: ShoppingSetting[];
  totalCount: number;
}

// 신규추가 모달 - 등록 가능 계정 리스트
export interface AvailableMallAccount {
  id: string;           // ShoppingAccount.id
  mallCode: ShoppingMalls;
  mallId: string;
  settingCount: number; // 이미 등록된 설정 건수
}
```

**mock 데이터**: `src/mocks/data/MockShoppingSettingsData.ts` — 기존 `MockShoppingAccountsData`의 계정 일부를 참조하는 `ShoppingSetting[]` 샘플. 동일 계정에 별칭이 다른 2건 이상을 포함해 "복사로 여러 건이 생길 수 있음"을 반영한다.

특수필드(`customFields` 등)와 배송지(`deliveryAddress` 등) 필드는 이번 라운드에 포함하지 않는다. 다음 작업에서 `ShoppingSetting` 타입을 확장한다.

## 화면 구성

### SearchFilterSection

- **일자 필터** (`SettingDateFilter`): 등록/수정 구분 드롭다운 + 날짜 range picker + 기간버튼(7일/15일/30일/1년) — 버튼 클릭 시 `startDate`/`endDate` atom 자동 세팅
- **쇼핑몰 필터** (`SettingMallFilter`): 계정등록쇼핑몰 드롭다운(`SHOPPING_MALLS`) → 선택 시 쇼핑몰아이디 드롭다운이 해당 쇼핑몰의 등록 계정만 필터링되어 노출. **mallCode 변경 시 mallAccountId 선택값은 자동 초기화**
- **검색** (`SettingSearchInput`): keyword input + 검색 버튼

### ActionSection

| 버튼 | 동작 |
|------|------|
| 신규추가 | `NewSettingModal` 오픈 |
| 정보일괄설정 | 선택된 행의 `mallCode`가 모두 동일한지 검증 → 다르면 alert("동일한 쇼핑몰만 선택해 주세요"), 같으면 "준비중" alert |
| 사용여부(드롭다운: 사용중/사용안함) + 사용여부변경 | 선택된 id들에 대해 `isActive` 일괄 변경 |
| 삭제 | 확인 alert 후 선택된 id들 일괄 삭제 |

선택된 행이 없는 상태에서 정보일괄설정/사용여부변경/삭제 클릭 시 alert("선택된 항목이 없습니다") 노출, API 호출 안 함.

### TableSection

컬럼: 체크박스 / 쇼핑몰 / 아이디 / 별칭 / 사용여부 / 등록일 / 수정일 / 수정(버튼) / 복사(버튼)

수정·복사 버튼 클릭 시 "준비중" alert.

### NewSettingModal

- `getAvailableMallAccounts` API로 계정 등록된 전체 쇼핑몰계정 + `settingCount` 조회 (이미 설정된 계정도 포함하여 노출)
- 리스트 행: 쇼핑몰 / 아이디 / "이미 N건 설정됨" 표시 / 등록 버튼
- 등록 버튼 클릭 시 "준비중" alert (실제 페이지 이동은 다음 라운드)

## API / MSW

신규 파일: `src/mocks/handlers/shoppingSettings.ts`(핸들러) + `src/mocks/utils/shoppingSettings.ts`(비즈니스 로직), `handlers.ts` 인덱스에 spread 추가.

```
POST   /api/shopping/settings/list
  body: { ownerId, filters: ShoppingSettingSearchType, page, pageSize }
  → GetShoppingSettingsResponse

PATCH  /api/shopping/settings/status
  body: { ids: string[], isActive: boolean }

POST   /api/shopping/settings/delete
  body: { ids: string[] }

POST   /api/shopping/settings/available-accounts
  body: { ownerId }
  → AvailableMallAccount[]
```

이 도메인은 `/:id` 형태의 단건 라우트가 없으므로 고정경로/동적경로 순서 충돌은 해당 없음.

## 엣지 케이스 / 검증

- 선택 없이 액션 버튼 클릭 시 alert 안내, API 미호출
- 정보일괄설정: 선택 행의 쇼핑몰이 섞여 있으면 alert로 차단
- 삭제: 실행 전 확인 alert
- 쇼핑몰 필터: mallCode 변경 시 mallAccountId 초기화
- "준비중" 처리 대상: 신규추가 모달의 등록 버튼, 테이블의 수정/복사 버튼, 정보일괄설정(검증 통과 시) — 공통 `showAlert({ type: 'info', message: '준비중인 기능입니다.' })`

## 다음 작업 (범위 외)

- 정보 입력 화면 (별도 페이지, 신규추가 등록 후 이동 대상) — 특수필드/배송지 필드 설계 필요
- 수정 모달 (설정값 편집)
- 복사 로직 (설정값 복제하여 새 행 생성)
- 정보일괄설정 모달 (특수필드/배송지 일괄 설정)
