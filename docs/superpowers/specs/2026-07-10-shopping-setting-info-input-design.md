# 쇼핑몰 정보설정 - 정보 입력 화면 설계

- 작성일: 2026-07-10
- 상태: 승인 대기
- 선행 문서: `docs/superpowers/specs/2026-07-08-shopping-mall-settings-design.md` (리스트 화면, 구현 완료)

## 배경 및 범위

`2026-07-08-shopping-mall-settings-design.md`에서 "다음 작업"으로 미뤄둔 **정보 입력 화면**을 구현한다. 리스트 화면의 신규추가 모달 "등록" 버튼과 테이블 "수정" 버튼이 현재 `showAlert({ type: 'info', message: '준비중인 기능입니다.' })`만 노출하는 상태이며, 이를 실제 화면으로 연결한다.

화면은 하나의 `ShoppingSetting` 건에 대해 다음 값을 입력/수정한다:

- 공통 필드: 별칭, 상품상태, 판매기간, 출고지, 반품지
- 쇼핑몰별 필드: 이번 라운드는 빈 섹션(안내 문구)만 배치, 자료 조사 후 다음 작업에서 실제 필드 추가

**범위 외** (이번 라운드에 포함하지 않음):
- 쇼핑몰별 필드 영역의 실제 필드 정의
- 몰별 실제 출고지/반품지 API 연동 (현재는 MSW 목업)
- `ShoppingMalls` 관련 타입 재정의 — 이번 작업 완료 후 별도로 진행 (사용자 요청)
- 테이블의 "복사" 버튼, "정보일괄설정" 모달 (기존 문서에서 이미 범위 외로 명시됨)

## 라우팅 / 진입 흐름

기존 `shopping/accounts`(create/[id]) 패턴을 따른다.

- **생성**: `src/app/(authenticated)/shopping/settings/create/page.tsx`
  - 리스트의 `NewSettingModal`에서 계정 행의 "등록" 버튼 클릭 시 해당 계정의 `mallCode`, `mallId`를 쿼리 파라미터로 담아 이동
    - 예: `/shopping/settings/create?mallCode=COUP&mallId=coupang_seller_001`
  - 진입 시 `useGetAvailableMallAccounts`(기존 API, `getAvailableMallAccounts`)를 호출해 목록에서 `mallCode`+`mallId`가 일치하는 계정을 찾아 `mallAccountId`(`ShoppingAccount.id`)를 확보한다. 신규 조회 API를 추가하지 않고 기존 API를 재사용한다.
  - 화면 상단에 쇼핑몰명/쇼핑몰 아이디를 읽기 전용으로 표시
  - 일치하는 계정을 찾지 못하면(쿼리파라미터 누락/불일치) "잘못된 접근입니다" 안내 후 `/shopping/settings`로 리다이렉트
- **수정**: `src/app/(authenticated)/shopping/settings/[id]/page.tsx`
  - 리스트 테이블의 "수정" 버튼 클릭 시 `ShoppingSetting.id`로 이동
  - `useGetShoppingSetting(id)`(신규)로 기존 값 전체 조회
  - 데이터 없음: "설정을 찾을 수 없습니다" 표시 (기존 `ShoppingAccountModifyLayout` 패턴과 동일)
- 저장 성공 시 공통 관례대로 성공 alert → `/shopping/settings` 리스트로 리다이렉트

## 폴더 구조

Products 방식(패턴 B: 필드 그룹을 섹션 컴포넌트로 분리, Layout이 `FormProvider` 소유, `mode` prop 없이 Layout 레벨에서 생성/수정 분기)을 따른다.

```
src/features/shoppingSetting/
├── api/
│   ├── (기존 list/status/delete/available-accounts API)
│   ├── getShoppingSetting.ts / useGetShoppingSetting.ts        # 신규 (단건 조회)
│   ├── createShoppingSetting.ts / useCreateShoppingSetting.ts  # 신규
│   ├── updateShoppingSetting.ts / useUpdateShoppingSetting.ts  # 신규
│   └── getAddressBook.ts / useGetAddressBook.ts                # 신규 (출고지/반품지 주소록)
├── types/
│   └── shoppingSetting.types.ts   # ProductCondition, SalesPeriod, MallAddress 추가
└── ui/
    ├── create/
    │   └── ShoppingSettingCreateLayout.tsx
    ├── [id]/
    │   └── ShoppingSettingModifyLayout.tsx
    └── components/
        ├── ShoppingSettingForm.tsx                     # 섹션 조합 (create/modify 공용)
        ├── form/
        │   ├── ShoppingSettingBasicInfoSection.tsx     # 별칭 / 상품상태 / 판매기간
        │   ├── ShoppingSettingAddressSection.tsx       # 출고지/반품지 선택 버튼 + 선택값 표시
        │   └── ShoppingSettingMallFieldSection.tsx     # 쇼핑몰별 필드 (빈 Card, "준비중" 안내)
        └── address/
            ├── AddressSelectModal.tsx                  # 출고지/반품지 공용 모달
            └── AddressSelectTable.tsx                  # 선택/출고지명/우편번호/주소 테이블

src/app/(authenticated)/shopping/settings/
├── create/page.tsx
└── [id]/page.tsx
```

## 데이터 모델

```ts
// src/features/shoppingSetting/types/shoppingSetting.types.ts (확장)

export type ProductCondition = 'NEW' | 'USED'; // 신상품/중고상품
export type SalesPeriod = 7 | 15 | 30 | 60 | 90;

export interface MallAddress {
  code: string;         // 출고지코드/반품지코드 (몰 내부 식별자)
  name: string;          // 출고지명/반품지명
  zipCode: string;
  address: string;
  addressDetail: string;
}

export interface ShoppingSetting {
  id: string;
  mallAccountId: string;
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

export type CreateShoppingSettingBody = Omit<ShoppingSetting, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdateShoppingSettingBody = Partial<CreateShoppingSettingBody>;
```

- `shippingAddress`/`returnAddress`는 모달에서 선택한 `MallAddress` 객체 전체를 저장한다(코드값 포함 — 추후 실제 몰 연동 시 발주/배송 처리에 사용될 수 있음).
- 출고지와 반품지는 동일한 주소록(같은 API 응답)을 공유하고, 폼에서는 각각 독립적으로 선택 상태를 가진다.

## 화면 구성

### ShoppingSettingBasicInfoSection (공통 필드)

- 별칭: text input, 필수
- 상품상태: 라디오 버튼 (신상품 / 중고상품), 필수
- 판매기간: 라디오 버튼 (7일 / 15일 / 30일 / 60일 / 90일), 필수

### ShoppingSettingAddressSection (출고지/반품지)

- "출고지 선택" 버튼 → 클릭 시 `AddressSelectModal` 오픈(`title="출고지 선택"`)
- 선택된 값이 있으면 버튼 옆에 `출고지명 (우편번호) 주소 상세주소` 형식으로 표시, 없으면 "선택된 출고지가 없습니다"
- 반품지도 동일 구조로 별도 배치(`title="반품지 선택"`)
- 둘 다 필수 — 미선택 상태로 저장 시도 시 인라인 에러 표시

### ShoppingSettingMallFieldSection (쇼핑몰별 필드, 이번 라운드 범위 외)

- 빈 Card + "쇼핑몰별 필드는 준비 중입니다." 안내 문구만 배치

### AddressSelectModal / AddressSelectTable

- 모달 오픈 시 `mallCode`+`mallId`로 주소록 조회 (`getAddressBook`)
- 로딩 중: 스피너, 빈 배열: "등록된 주소가 없습니다" 안내 (`NewSettingModal` 빈 상태 패턴과 동일)
- 테이블 컬럼: 선택(라디오) / 출고지명 / 우편번호 / 주소(주소+상세주소 결합 표시)
- 모달 재오픈 시 폼에 이미 저장된 값이 있으면 해당 라디오가 기본 선택된 상태로 시작
- "적용" 버튼: 라디오 미선택 상태로 클릭 시 alert("주소를 선택해주세요"), 모달 유지. 선택 상태면 해당 `MallAddress`를 폼에 반영하고 모달 닫힘
- "취소"/닫기: 선택 반영 없이 모달만 닫힘

## API / MSW

```
POST   /api/shopping/settings/addresses
  body: { mallCode, mallId }
  → MallAddress[]

GET    /api/shopping/settings/:id
  → ShoppingSetting

POST   /api/shopping/settings
  body: CreateShoppingSettingBody
  → ShoppingSetting

PATCH  /api/shopping/settings/:id
  body: UpdateShoppingSettingBody
  → ShoppingSetting
```

- `src/mocks/handlers/shoppingSettings.ts`에 위 4개 핸들러 추가, 로직은 `src/mocks/utils/`에 위임(msw-rules 컨벤션)
- **라우트 순서 주의**: `PATCH /api/shopping/settings/status`(고정경로, 기존)와 신규 `PATCH /api/shopping/settings/:id`(동적경로)는 같은 메서드(PATCH)이므로 `:id`가 `"status"` 문자열과 매칭될 수 있다. msw-rules 컨벤션대로 **고정경로(`/status`)를 동적경로(`/:id`)보다 먼저 등록**한다. `GET /api/shopping/settings/:id`는 기존에 GET 핸들러가 없으므로 충돌 없음. `POST /api/shopping/settings`(생성)는 `/list`, `/delete`, `/available-accounts`, `/addresses`와 문자열이 완전히 달라 충돌 없음

### Mock 데이터

- `src/mocks/data/MockMallAddressBookData.ts`: `Record<ShoppingMalls, MallAddress[]>` 형태로 16개 몰 전체에 동일 구조로 목업 데이터 생성(몰별 2~3건, `code` 값에 `${mallCode}-` 접두어로 구분해 실제 몰별 데이터처럼 보이게 함)
- `src/mocks/data/MockShoppingSettingsData.ts`의 기존 4건 샘플에 `productCondition`, `salesPeriod`, `shippingAddress`, `returnAddress` 필드값 추가

## 검증 / 엣지케이스

- 별칭 / 상품상태 / 판매기간 / 출고지 / 반품지 모두 필수 (zod). 미입력 상태로 저장 클릭 시 인라인 에러
- 출고지/반품지 선택 모달: 라디오 미선택 상태로 "적용" 클릭 시 alert, 모달 유지
- 주소록 조회 결과가 빈 배열이면 "등록된 주소가 없습니다" 안내
- 생성 화면: `mallCode`/`mallId` 쿼리파라미터 누락 또는 일치하는 계정 없음 → "잘못된 접근입니다" 안내 후 리스트로 리다이렉트
- 수정 화면: `id`에 해당하는 설정 없음 → "설정을 찾을 수 없습니다" 표시

## 다음 작업 (범위 외)

- 쇼핑몰별 필드 영역 실제 필드 설계 및 구현 (자료 조사 필요)
- 출고지/반품지 몰별 실제 API 연동 (현재는 MSW 목업)
- `ShoppingMalls` 관련 타입 재정의 (이번 작업 완료 후 별도 진행)
- 테이블 "복사" 버튼, "정보일괄설정" 모달 (기존 리스트 화면 설계 문서에서 이미 범위 외로 명시)
