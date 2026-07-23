# 타입 중복/불일치 정리 — 몰 코드 필드명 통일 + ShoppingAccountForm zod 강화

## 배경

2026-07-16 설계 누수 점검(4갈래 조사)에서 발견된 항목 중, 사용자가 우선순위를 "타입 중복/불일치 → hook/함수 중복" 순으로 확정했다. 타입 중복/불일치 항목 중 아래 3가지를 이번 라운드에서 처리한다 (4, 5번 — `getProducts` 응답 미타이핑, `AccountUser.ownerId` nullable 네이밍 — 은 범위 제외, 이번 라운드 완료 후 별도 논의).

1. 쇼핑몰 코드 필드명 4갈래 혼용(`mallCode`/`mallName`/`shoppingMallName`/`shoppingMall`) 통일
2. `CollectionJob.mallName`이 실제로는 몰 코드를 저장하는 오도적 네이밍 수정 (1번에 포함되는 항목)
3. `ShoppingAccountForm`의 zod 스키마가 인터페이스보다 느슨해 제출부에서 `as` 강제 캐스팅이 발생하는 문제 해결

## 범위

브레인스토밍 중 확정된 범위:

- **1번(필드명 통일)은 Order 도메인까지 전체 포함한다.** ShoppingAccount/ShoppingSetting/CollectionJob/Order 4개 도메인 전부 `mallCode`(몰 코드)/`mallId`(계정 id)로 통일.
- **`Order.shoppingMallId`(계정 id)도 함께 `mallId`로 통일한다.** 원래 조사 목록엔 없었지만 Order 도메인 파일을 어차피 이번에 건드리므로 같은 파일을 두 번 건드리는 수고를 피하기 위해 포함.
- ShoppingAccount/ShoppingSetting 도메인은 이미 `mallCode`/`mallId`를 사용 중이라 **리네임 대상 아님** — 3번(zod 강화)만 해당.

## 리네임 매핑표

### CollectionJob 도메인

| 기존 | 변경 |
|---|---|
| `CollectionJob.mallName` | `mallCode` |

영향 파일:
- `src/features/order/types/collection.types.ts` (인터페이스 정의)
- `src/features/order/ui/collect/CollectionTableSection.tsx` (`job.mallName` 참조)
- `src/mocks/data/MockCollectionJobsData.ts` (6건 `mallName:` 필드)
- `src/mocks/utils/getCollectionJobs.ts` (`job.mallName !== params.mallCode` 비교)
- `src/mocks/utils/getCollectionJobs.test.ts` (fixture)

### Order 도메인

| 기존 | 변경 |
|---|---|
| `Order.shoppingMallName` | `mallCode` |
| `Order.shoppingMallId` | `mallId` |
| `OrderSearchType.shoppingMall` | `mallCode` |
| `shoppingMallAtom` (order/store/search.store.ts) | `mallCodeAtom` |

`OrderSearchType.mallId`는 이미 올바른 이름이라 변경 없음.

영향 파일:
- `src/features/order/types/order.types.ts` (인터페이스 정의 2곳 + 상단 한글 필드 매핑 주석)
- `src/features/order/store/search.store.ts` (atom 이름, `getOrderSearchFilterAtom`/`committedFiltersAtom` 내 필드)
- `src/features/order/ui/list/components/orderSearchFiilter/OrderMallFilter.tsx` (atom import, 로컬 변수 `shoppingMall`/`setShoppingMall` → `mallCode`/`setMallCode`)
- `src/mocks/utils/getOrders.ts` (`filterByShoppingMall` 파라미터/비교, `filterByMallId` 비교 대상 필드, `getMockOrders` 구조분해)
- `src/mocks/data/MockOrdersData.ts` (25건 × `shoppingMallName`/`shoppingMallId` 필드)
- `src/mocks/utils/getOrders.test.ts`, `src/mocks/utils/getHomeOrderStats.test.ts` (fixture/assertion)
- `src/features/order/ui/detail/OrderInfoSection.tsx` (`order.shoppingMallName` 참조)
- `src/features/order/ui/list/components/orderTable/OrderListTable.tsx` (`order.shoppingMallName`, `order.shoppingMallId` 참조)
- `src/components/excel/strategies/orderExcelSaveStrategy.ts` (`shoppingMallName:`/`shoppingMallId:` 필드, `Order['shoppingMallName']` 캐스팅 타입)
- `src/features/order/constant/table.constant.ts` (`id: 'shoppingMall'` / `id: 'shoppingMallId'` 헤더 정의)

`getShoppingMallName()` 같은 코드→표시명 변환 헬퍼(`src/utils/shoppingMallGenerator.ts`)는 이름은 그대로 두되, 호출부에서 넘기는 인자만 `order.mallCode`로 변경된다 (헬퍼 자체 리네임 대상 아님).

## zod 스키마 강화 (item 3)

**현재 문제:**
```ts
// ShoppingAccountForm.tsx
mallCode: z.string().min(1, '쇼핑몰을 선택해주세요.'),
```
`ShoppingAccount.mallCode: ShoppingMalls`(유니온 타입)보다 느슨해서, 제출부에서 강제 캐스팅 발생:
```ts
// ShoppingAccountCreateLayout.tsx / ShoppingAccountModifyLayout.tsx
mallCode: data.mallCode as CreateShoppingAccountBody['mallCode'],
mallCode: data.mallCode as UpdateShoppingAccountBody['mallCode'],
```

**목표:** `SHOPPING_MALLS`(`src/shared/constant/shoppingMall.constant.ts`) 상수에서 코드 목록을 파생시켜 실제 유효한 몰 코드만 통과하도록 검증을 강화하고, 폼 제출 데이터(`ShoppingAccountFormData['mallCode']`)의 타입이 `ShoppingMalls`로 좁혀지도록 만들어 위 2곳의 `as` 캐스팅을 제거한다.

**제약 조건:** Select 컴포넌트의 "미선택" 초기 상태(`defaultValues.mallCode = ''`)를 다루기 위해, 스키마 입력 단계에서는 빈 문자열을 허용하되(검증 실패 처리) 검증 통과 후 출력 타입은 `ShoppingMalls`로 좁혀지는 방식(zod의 `refine` 타입가드 또는 `pipe` 등)을 사용한다. 정확한 zod API 선택은 구현 단계에서 결정하며, **완료 기준은 (1) 잘못된/빈 값 제출 시 기존과 동일한 한글 에러 메시지가 표시되고 (2) `npm run build`(typecheck)가 캐스팅 없이 통과하는 것**이다.

**범위 제한:** 현재 다른 화면(ShoppingSetting 등)에는 동일 패턴의 zod 스키마가 없으므로, 검증 로직은 `ShoppingAccountForm.tsx` 내부에 로컬로 둔다. 공용 유틸 추출은 YAGNI로 이번 라운드에서 하지 않는다.

## 실행/검증 순서

도메인별 단계 진행 방식(작은 도메인 → 큰 도메인 순)으로 진행하여, 문제 발생 시 어느 단계에서 깨졌는지 격리한다.

1. **CollectionJob 리네임** → `npm run lint` + `npm run test`(mocks/utils 대상 vitest) 통과 확인
2. **Order 리네임** → 동일 검증 (blast radius가 가장 크므로 별도 단계로 분리)
3. **ShoppingAccountForm zod 강화** → `npm run build`(typecheck) 통과 + 수동 dev 서버 확인(등록/수정 폼 정상 동작, 빈 값/잘못된 값 제출 시 에러 메시지 정상 노출)
4. **전체 최종 검증** → `npm run lint && npm run test && npm run build` 통과 확인

## 테스트 범위

이 프로젝트의 vitest 커버리지는 `src/mocks/utils/`(순수 비즈니스 로직)로 한정되는 컨벤션을 따른다 (CLAUDE.md 참조). 따라서:
- `getCollectionJobs.test.ts`, `getOrders.test.ts`, `getHomeOrderStats.test.ts`는 필드명 변경에 맞춰 fixture/assertion을 갱신한다 (기존 테스트 케이스 로직 자체는 변경 없음, 필드명만 리네임).
- `ShoppingAccountForm.tsx`의 zod 스키마 변경은 UI 컴포넌트 내부 로직이라 신규 테스트 파일을 추가하지 않는 기존 컨벤션을 따르고, 대신 dev 서버 수동 확인으로 검증한다.

## 영향 없음 / 명시적 비대상

- `ShoppingAccount.mallCode`, `ShoppingSetting`의 `mallCode`/`mallAccountId` 관련 필드 — 이미 올바른 이름, 변경 없음
- `CollectionSearchParams.mallCode`, `OrderSearchType.mallId` — 이미 올바른 이름, 변경 없음
- item 4(`getProducts` 응답 미타이핑), item 5(`AccountUser.ownerId` nullable 네이밍) — 이번 라운드 범위 제외, 완료 후 별도 논의
- hook/함수 중복(검색·페이지네이션 atom 패턴, API POST 보일러플레이트, React Query list/delete 훅) — 타입 정리 완료 후 별도 라운드로 진행
