# ShoppingMalls 관련 타입 재정의 설계

- 작성일: 2026-07-12
- 상태: 승인 대기
- 선행 문서: `docs/superpowers/specs/2026-07-10-shopping-setting-info-input-design.md` (해당 문서 "다음 작업"에서 이월된 항목)
- 참고 조사: `docs/research/2026-07-11-mall-specific-fields-research.md` (이번 작업 범위와는 별개, 참고만)

## 배경 및 범위

`feat/shopping-setting-info-input` 완료 후 "이번 작업 완료 후 다시 하자"고 미뤄뒀던 `ShoppingMalls` 타입 재정의를 진행한다. 브레인스토밍 중 두 차례의 전체 재조사(코드 grep + 읽기 전용 탐색 서브에이전트)를 거치며 예상보다 범위가 넓어졌다 — 단순 타입 정리가 아니라 **레거시 중복 엔티티 제거 + 이름-의미 불일치 필드 정정 + 미사용 필드 삭제**가 함께 필요한 것으로 확인됐다.

### 범위 내 (7개 섹션)

1. 레거시 `MallAccount`/`MallAccountEntry` 계열 삭제
2. `shoppingAccount` 도메인에 경량 조회 API 신설
3. `order/collect` 마이그레이션 (`mallAccountId` → `mallId`)
4. `order/list` 리네이밍 (`mallAccountId` → `mallId`, 이름만)
5. `SHOPPING_MALLS`/`ShoppingMallType`의 미사용 `isActive` 필드 제거
6. 검색 타입 엄격화 (`string` → `ShoppingMalls | 'ALL'`)
7. `ORDERLIST_TABLE_HEAD`의 `shopId` → `shoppingMallId` 명명 수정

### 범위 외 (다음 라운드로 이월)

- **`Order`/`CollectionJob`의 `ownerId` 테넌트 격리 공백** — `src/mocks/handlers/{orders,collection}.ts`의 10개 엔드포인트와 관련 타입/API/훅 전체에 `ownerId` 스코프가 없음이 이번 조사에서 발견됨. 타입 이름 정리 수준을 넘어서는 별도 설계가 필요해 이번 라운드에서 제외한다. 상세 내용은 `[[project_order_ownerid_gap]]` 메모리 참고.
- `order/list`의 몰별 계정 드롭다운(`OrderMallFilter.tsx`) 실데이터 연동 — 현재 `MALL_ACCOUNTS: Record<string, FilterOption[]> = {}` 빈 스텁 상태이며, 이번 작업은 관련 필드명만 바로잡고 스텁 자체는 건드리지 않는다.
- "쇼핑몰별 필드" 실제 필드 설계, 출고지/반품지 몰별 실 API 연동 — 기존 문서에서 이미 범위 외로 명시됨.

---

## 섹션 1. 레거시 `MallAccount` 계열 삭제

`MallAccount`(`src/shared/types/mallAccount.types.ts`)는 `ShoppingAccount`(`src/features/shoppingAccount`)와 개념이 사실상 동일한 "로그인 계정 1건"이지만, `ownerId`가 없고 별도의 mock 생태계를 갖고 있었다. `MockShoppingMallAccountsData.ts`의 `MallAccountEntry`도 필드가 거의 동일한 세 번째 유사 타입이다. `createMallAccount`/`deleteMallAccount`는 호출하는 UI가 없는 죽은 코드다.

### 삭제 대상

| 파일 | 비고 |
|---|---|
| `src/shared/types/mallAccount.types.ts` | `MallAccount` 타입 |
| `src/shared/api/getMallAccounts.ts` | 섹션 2로 대체 |
| `src/shared/api/createMallAccount.ts` | 죽은 코드 |
| `src/shared/api/deleteMallAccount.ts` | 죽은 코드 |
| `src/mocks/handlers/mallAccounts.ts` | `/api/mall-accounts` 3개 엔드포인트 |
| `src/mocks/utils/mallAccounts.ts` | `MallAccountEntry` 포함 |
| `src/mocks/data/MockShoppingMallAccountsData.ts` | mock 원본 데이터 |

### 함께 수정

- `src/mocks/handlers.ts`: `mallAccountHandlers` spread 제거

---

## 섹션 2. `shoppingAccount` 도메인에 경량 조회 API 신설

`order/collect`의 `CollectionMallFilter`가 몰별 로그인 계정 목록을 조회할 대체 수단이 필요하다. `shoppingSetting`의 `AvailableMallAccount`/`getAvailableMallAccounts` 패턴을 그대로 따른다.

### 타입 추가 (`src/features/shoppingAccount/types/shoppingAccount.types.ts`)

```ts
export interface MallAccountOption {
  id: string;
  mallCode: ShoppingMalls;
  mallId: string;
}
```

### API 함수 (신규 `src/features/shoppingAccount/api/getShoppingAccountsByMall.ts`)

```ts
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

### 훅 (신규 `src/features/shoppingAccount/api/useGetShoppingAccountsByMall.ts`)

```ts
export const useGetShoppingAccountsByMall = (mallCode: ShoppingMalls | 'ALL') => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: ['mallAccountOptions', workspaceOwnerId, mallCode],
    queryFn: () => getShoppingAccountsByMall(workspaceOwnerId, mallCode as ShoppingMalls),
    enabled: !!workspaceOwnerId && mallCode !== 'ALL',
  });
};
```

- 기존 `getShoppingAccounts`(list, 페이지네이션)와는 별개 함수로 유지한다 — 드롭다운 용도에 페이지네이션 응답 구조를 억지로 맞추지 않는다.

### MSW 핸들러 (`src/mocks/handlers/shoppingAccounts.ts`에 추가)

```ts
http.post(`${baseUrl}/api/shopping/accounts/by-mall`, async ({ request }) => {
  const { ownerId, mallCode } = (await request.json()) as { ownerId: string; mallCode: ShoppingMalls };
  return HttpResponse.json(getMockShoppingAccountsByMall(ownerId, mallCode));
}),
```

- **라우트 순서 주의**: 기존 `/list`, `/delete`, `/status`(고정경로)와 신규 `/by-mall`(고정경로)은 순서 무관하나, 전부 `PATCH/GET /:id`(동적경로)보다 **먼저** 등록해야 한다. `by-mall`은 새 파일 상단, 기존 `/:id` 핸들러들 앞에 추가.

### mock 유틸 (신규 `src/mocks/utils/getShoppingAccountsByMall.ts`)

msw-rules 컨벤션대로 `src/mocks/utils/`는 동작별로 파일이 분리돼 있다(`getShoppingAccounts.ts`, `createShoppingAccount.ts` 등 1파일 1함수). 동일한 패턴으로 신규 파일을 추가한다.

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

---

## 섹션 3. `order/collect` 마이그레이션

### 타입 변경 (`src/features/order/types/collection.types.ts`)

```ts
export interface CollectionJob {
  id: string;
  mallName: ShoppingMalls;
  mallId: string;        // 변경 전: mallAccountId (실제로는 로그인 아이디 문자열이 들어가고 있었음)
  status: CollectionStatus;
  lastCollectedAt: string | null;
  totalCount?: number;
  collectedCount?: number;
}

export interface CollectionSearchParams {
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';  // 섹션 6과 함께 반영
  mallId: string;                    // 변경 전: mallAccountId
}
```

### `CollectionMallFilter.tsx` 변경

- `getMallAccounts({ mallCode })` 호출 제거 → `useGetShoppingAccountsByMall(mall)` 사용
- `accountOptions`는 기존과 동일하게 `a.mallId`를 id/name으로 사용 (표시 방식 변화 없음)

### 함께 리네이밍

| 위치 | 변경 |
|---|---|
| `src/features/order/store/collect.store.ts` | `collectMallAccountIdAtom` → `collectMallIdAtom`, `collectSearchParamsAtom`의 `mallAccountId` 키 → `mallId` |
| `src/mocks/data/MockCollectionJobsData.ts` | 각 레코드의 `mallAccountId` 키 → `mallId` |
| `src/mocks/utils/getCollectionJobs.ts` | 필터링 로직의 필드 참조 갱신 |
| `src/mocks/handlers/collection.ts` | 파라미터 구조분해 갱신 |
| `src/features/order/api/getCollectionJobs.ts` | 타입 참조 갱신 |
| `src/features/order/ui/collect/CollectionFilterSection.tsx`, `CollectionTableSection.tsx` | atom/필드 참조 갱신 |

---

## 섹션 4. `order/list` 리네이밍 (이름만)

`OrderSearchType.mallAccountId`도 동일한 문제(`mocks/utils/getOrders.ts`에서 `item.shoppingMallId`와 비교 — 실제로는 `mallId`)로 확인됐다. `OrderMallFilter.tsx`의 계정 드롭다운은 `MALL_ACCOUNTS: Record<string, FilterOption[]> = {}` 빈 스텁이라 **실데이터 연동은 이번 범위에 포함하지 않고 이름만 바로잡는다.**

### 타입 변경 (`src/features/order/types/order.types.ts`)

```ts
export interface OrderSearchType {
  dateType: string;
  startDate: string;
  endDate: string;
  shoppingMall: ShoppingMalls | 'ALL';  // 섹션 6과 함께 반영, 변경 전: string
  mallId: string;                        // 변경 전: mallAccountId
  deliveryCompany: string;
  orderStatus: string;
  searchType: string;
  searchValue: string;
}
```

### 함께 리네이밍

| 위치 | 변경 |
|---|---|
| `src/features/order/store/search.store.ts` | `mallAccountIdAtom` → `mallIdAtom` |
| `src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx` | atom 참조 갱신 (`MALL_ACCOUNTS` 빈 스텁 자체는 유지) |
| `src/mocks/utils/getOrders.ts` | `filterByMallAccountId` → `filterByMallId`, 파라미터명 갱신 |
| `src/mocks/utils/getOrders.test.ts` | 필드명 갱신 |

---

## 섹션 5. `SHOPPING_MALLS`/`ShoppingMallType` 정리

`isActive` 필드가 16개 원소 전부 `false`로 고정돼 있고 참조하는 코드가 없어 제거한다. 필요해지면 그때 다시 추가한다(YAGNI).

```ts
// src/types/common.type.ts
export interface ShoppingMallType {
  code: string;
  name: string;
  // isActive 제거
}
```

```ts
// src/shared/constant/shoppingMall.constant.ts
export const SHOPPING_MALLS: ShoppingMallType[] = [
  { code: 'AUC', name: '옥션' },
  { code: 'GMK', name: '지마켓' },
  // ... 이하 14개 동일하게 isActive 라인만 제거
];
```

---

## 섹션 6. 검색 타입 엄격화

`OrderSearchType.shoppingMall`, `CollectionSearchParams.mallCode`가 `ShoppingMalls`가 아닌 느슨한 `string`으로 선언돼 있던 것을 바로잡는다 (섹션 3, 4의 타입 정의에 이미 반영됨).

### atom 타입 조정

```ts
// src/features/order/store/search.store.ts
export const shoppingMallAtom = atom<ShoppingMalls | 'ALL'>('ALL');  // 변경 전: atom<string>

// src/features/order/store/collect.store.ts
export const collectMallAtom = atom<ShoppingMalls | 'ALL'>('ALL');   // 변경 전: atom<string>
```

- `OrderMallFilter.tsx`, `CollectionMallFilter.tsx`의 `onValueChange` 핸들러가 `string`을 받는 Radix `Select`와 연결되므로, atom setter 호출부에서 타입이 좁혀지는지 구현 시 확인 필요(대부분 `value as ShoppingMalls | 'ALL'` 캐스팅 또는 핸들러 시그니처 조정으로 해결).

---

## 섹션 7. `ORDERLIST_TABLE_HEAD` 명명 수정

```ts
// src/features/order/constant/table.constant.ts
{ id: 'shoppingMallId', title: '쇼핑몰ID' },  // 변경 전: id: 'shopId'
```

- 테이블 렌더링은 하드코딩 JSX라 동작 영향 없음. 컬럼 식별자를 실제 `Order.shoppingMallId` 필드명과 일치시키는 명명 정리.

---

## 영향받지 않는 것 (확인 완료, 변경 없음)

- `ShoppingSetting.mallAccountId` — `ShoppingAccount.id`를 정확히 참조하는 정상적인 FK. 리네이밍 대상 아님.
- `AvailableMallAccount`, `MallAddress` — 기존 구조 유지.
- mock 데이터의 `mallCode` 값들 — 16개 코드 내에서 전수 확인 완료, 오탈자 없음.
- `SHOPPING_MALLS` 외 몰 목록 하드코딩 — 전체 재조사 결과 발견되지 않음.

## 검증 / 엣지케이스

- 섹션 1 삭제 후 `npm run build`로 미참조 확인 (TypeScript 컴파일 에러 발생 시 놓친 참조 존재)
- 섹션 2 신규 API: `mallCode`별 계정이 0건인 경우 빈 배열 반환 확인 (`CollectionMallFilter`의 "아이디 선택" 드롭다운이 "전체"만 노출)
- 섹션 3, 4 리네이밍 후 기존 `src/mocks/utils/getShoppingSettings.test.ts` 등 무관한 테스트가 영향받지 않는지 `npm run test`로 확인 (해당 파일들의 `mallAccountId`는 `ShoppingSetting` 소속이라 변경 대상 아님)
- 섹션 6 타입 엄격화 후 `npm run lint`/`tsc`로 `Select` 컴포넌트 연결부 타입 에러 확인

## 다음 작업 (범위 외)

- `Order`/`CollectionJob`의 `ownerId` 테넌트 격리 (`[[project_order_ownerid_gap]]` 참고)
- `order/list`의 `OrderMallFilter` 계정 드롭다운 실데이터 연동
- "쇼핑몰별 필드" 실제 필드 설계 및 구현
- 출고지/반품지 몰별 실제 API 연동
