# Order List Search Filter — Design Spec

**Date:** 2026-05-14  
**Scope:** `src/features/order/ui/list` 검색 필터 영역 재구축

---

## 1. 목표

주문 목록 페이지(`/order/list`)의 검색 필터 영역을 요구사항에 맞게 4개 행으로 구성한다.  
현재 코드의 타입 불일치(Date[] vs string)와 상품용 상수 혼용 버그도 함께 수정한다.

---

## 2. 레이아웃

```
행 1 (검색 일자)  [주문수집일 ▼] [2025-01-01] ~ [2025-01-31]  [7일] [15일] [30일] [1년]
행 2 (선택사항)   [쇼핑몰 ▼]    [아이디 ▼]                    [택배사 ▼]
행 3 (주문 상태)  [전체 ▼]
행 4 (검색어)     [주문자 ▼]    [텍스트 입력창.................] [검색]
```

- 행 레이아웃: `space-y-4` 수직 스택 (사이드 버튼 제거)
- Label 폭 `w-20 text-right` 통일 (기존 패턴 유지)

---

## 3. 변경 파일 목록

### 3-1. 상수 (constants)

| 파일 | 변경 |
|------|------|
| `src/constant/delivery.constant.ts` | `DELIVERY_COMPANY` 배열 추가 |
| `src/features/order/constant/status.constants.ts` | `ORDER_DATE_TYPE` 배열 추가 |

**ORDER_DATE_TYPE** (`FilterOption[]`)
- `{ id: 'orderCollectionDate', name: '주문수집일' }`
- `{ id: 'paymentDate', name: '결제일' }`
- `{ id: 'deliveryDate', name: '배송일' }`

**DELIVERY_COMPANY** (`FilterOption[]`)
- 대한통운 / 한진택배 / 롯데택배 / 우체국택배 / 로젠택배

### 3-2. 타입 (`src/features/order/types/order.types.ts`)

`OrderSearchType` 재정의:

```ts
interface OrderSearchType {
  dateType: string;       // ORDER_DATE_TYPE id
  startDate: string;      // 'YYYY-MM-DD'
  endDate: string;        // 'YYYY-MM-DD'
  shoppingMall: string;   // SHOPPING_MALLS code or 'ALL'
  mallAccountId: string;  // 계정 ID or 'ALL'
  deliveryCompany: string;// DELIVERY_COMPANY id or 'ALL'
  orderStatus: string;    // ORDER_STATUS id or 'ALL'
  searchType: string;     // ORDER_SEARCH_TYPE id
  searchValue: string;
}
```

### 3-3. 스토어 (`src/features/order/store/search.store.ts`)

기존 `searchDateAtom: atom<Date[]>` 제거. 상품 스토어(`products/store/search.store.ts`) 패턴 동일하게 적용:

| atom | 타입 | 기본값 |
|------|------|--------|
| `dateTypeAtom` | string | `'orderCollectionDate'` |
| `startDateAtom` | string | 오늘 -7일 `'YYYY-MM-DD'` |
| `endDateAtom` | string | 오늘 `'YYYY-MM-DD'` |
| `shoppingMallAtom` | string | `'ALL'` |
| `mallAccountIdAtom` | string | `'ALL'` |
| `deliveryCompanyAtom` | string | `'ALL'` |
| `orderStatusAtom` | string | `'ALL'` (기존 유지) |
| `searchTypeAtom` | string | `'orderName'` |
| `searchValueAtom` | string | `''` (기존 유지) |

`getOrderSearchFilterAtom`: 위 atoms를 모아 `OrderSearchType` 파생 atom 반환.

### 3-4. 컴포넌트

#### OrderDateFilter.tsx (재작성)
- `ProductSearchDate.tsx` 패턴 그대로 적용
- `PRODUCT_DATE_TYPE` → `ORDER_DATE_TYPE` 교체
- `calculatorRangeDate` + `resetKey` 패턴으로 날짜 범위 버튼 동기화

#### OrderMallFilter.tsx (신규)
- 쇼핑몰 드롭다운: `SHOPPING_MALLS`를 `FilterOption` 형태로 매핑 (`code` → `id`)
- 아이디 드롭다운: `shoppingMallAtom` 값에 따라 계정 목록 필터링. 실 데이터 없으므로 `MALL_ACCOUNTS` mock 객체(`Record<string, FilterOption[]>`)를 준비하고 빈 배열 반환. 쇼핑몰 변경 시 `mallAccountIdAtom` 'ALL' 리셋.
- 택배사 드롭다운: `DELIVERY_COMPANY` 사용

#### OrderSearchInput.tsx (수정)
- 기존 텍스트 입력 앞에 `searchType` 드롭다운 추가
- **검색 버튼**을 이 컴포넌트 행 끝에 인라인 배치 (OrderSearchButton 통합)
- 검색 타입 상수 `ORDER_SEARCH_TYPE` (`FilterOption[]`) → `src/features/order/constant/status.constants.ts`에 추가:
  - 주문자 / 수취인 / 주문명 / 주문번호 / 쇼핑몰 주문번호

#### OrderListSearchFilterSection.tsx (수정)
- 사이드 버튼 레이아웃 제거
- 4행 수직 스택으로 재구성: `OrderDateFilter` → `OrderMallFilter` → `OrderStateFilter` → `OrderSearchInput`

---

## 4. 결정 사항

- `DatePickerRangeButton` (공통)은 변경하지 않음 — 7일/15일/30일/1년 버튼 현행 유지
- `OrderSearchButton` 컴포넌트는 삭제하고 `OrderSearchInput` 내부로 흡수
- 검색 버튼 클릭 시 `getOrderSearchFilterAtom` 값을 `console.log`로 출력 (API 연결 전 임시)
- `MALL_ACCOUNTS` mock은 상수 파일로 분리하지 않고 `OrderMallFilter` 내부에 인라인 정의

---

## 5. 범위 외 (Out of Scope)

- 테이블 영역 변경 없음
- API/MSW 핸들러 추가 없음
- 쇼핑몰 계정 실 데이터 연결 없음
