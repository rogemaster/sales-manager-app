# 쇼핑몰 연동 상품 목록 설계

- 날짜: 2026-08-01
- 목적: `/shopping/register`에서 외부 쇼핑몰로 전송한 결과(성공·실패)를 조회하는 화면을 만든다. 그 과정에서 **연동 데이터를 오리지널 상품과 분리된 독립 엔티티로 정립**한다.
- 선행 라운드: `2026-07-29-mall-registration-send-result-design.md` (PR #36)
- **이번 라운드 산출물: 데이터 모델 전환 + 목록 조회까지.** 연동 데이터 수정·재전송은 다음 라운드로 이관.

## 화면 이름을 '쇼핑몰 연동 상품 목록'으로 정한 이유

선행 스펙은 이 화면을 "쇼핑몰 등록 상품 목록"으로 예고했으나, **'연동'으로 변경한다.**

이 화면은 등록에 성공한 데이터만이 아니라 실패한 데이터까지 전부 보여주고, 등록 성공한 상품의 수정 작업도 여기서 진행한다. '등록'은 전송 액션 한 순간을 가리키는 말이라 이 화면이 다루는 범위를 담지 못한다. 외부 쇼핑몰과 연결된 상태 전체를 가리키는 '연동'이 맞다.

## 핵심 정립 — 오리지널 데이터와 연동 데이터는 별개다

이번 라운드의 가장 중요한 결론이며, 앞으로 모든 쇼핑몰 연동 작업의 전제가 된다.

| 데이터 | 생성 위치 | 성격 |
|--------|----------|------|
| **오리지널 상품** (`Product`) | `/products/create` | 마스터 |
| **오리지널 쇼핑몰정보설정** (`ShoppingSetting`) | `/shopping/settings` | 마스터 |
| **쇼핑몰 연동 데이터** (`MallLinkedProduct`) | `/shopping/register` 전송 시점 | 위 둘에서 값을 복사해 만든 **독립 데이터** |

규칙:

1. `A-오리지널 상품`을 네이버·카카오에 전송하면 연동 데이터 **2건**이 생성된다 (`naver-A`, `kakao-A`).
2. **오리지널 상품을 수정해도 연동 데이터는 바뀌지 않는다.** 오리지널 쇼핑몰정보설정을 수정해도 마찬가지다.
3. 연동 데이터의 수정은 `naver-A`, `kakao-A` **각각을 고쳐서 그 몰로 전송**하는 방식이다.
4. **연동 데이터 1건 = 외부 쇼핑몰 상품 1개** (= 외부몰이 부여한 쇼핑몰 상품코드 1개).
5. 같은 마스터 상품을 같은 몰로 **여러 번 전송할 수 있고**, 그때마다 별도 연동 데이터가 생성된다. 외부몰이 중복이라 판단하면 실패 응답을 주고, 아니면 새 상품으로 등록되어 새 쇼핑몰 상품코드를 받는다.

### 선행 라운드에서 뒤집히는 결정

PR #36에서 `Product.registeredMalls`를 "몰+설정 조합당 1건 upsert"로 만들었다. 두 가지가 무너진다:

- **저장 위치:** `registeredMalls`는 상태 메타데이터만 갖고 있어(`status`/`registeredAt`/`externalId`/`errorMessage`) 상품 값도 설정 값도 자기 사본으로 보유하지 않는다. 위 규칙 2·3을 담을 수 없다.
- **upsert 시맨틱:** 규칙 5(중복 연동 허용)에 따라 조합당 1건 전제가 사라진다.

따라서 `Product.registeredMalls`와 `MallRegistration` 타입, `src/mocks/utils/registerProductsToMalls.ts`는 **폐기하고** 독립 엔티티로 대체한다. 남겨두면 같은 사실이 두 곳에 저장되어 반드시 어긋난다.

## 도메인 모델

```ts
// src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts

export type MallLinkStatus = 'success' | 'failed';

export interface MallLinkedProduct {
  // ── 불변 식별 정보 ──
  id: string;                         // 연동 데이터 고유 id (mlp_xxx). 외부몰 상품 1개와 1:1
  ownerId: string;                    // 테넌트 격리
  sourceProductId: string;            // 파생된 오리지널 상품 (값 동기화 없음, 추적용)
  sourceShoppingSettingId: string;    // 파생된 오리지널 설정 (값 동기화 없음, 추적용)
  mallCode: ShoppingMalls;

  // ── 연동 결과 ──
  status: MallLinkStatus;
  externalProductId?: string;         // 성공 시 외부몰이 부여한 쇼핑몰 상품코드
  errorMessage?: string;              // 실패 사유

  // ── 스냅샷 (이 연동 데이터의 실제 값) ──
  productSnapshot: Product;           // 전송 시점 상품 전체 사본
  settingSnapshot: ShoppingSetting;   // 전송 시점 설정 전체 사본

  // ── 감사 ──
  createdByEmail: string;
  updatedByEmail?: string;            // 다음 라운드(수정 기능) 전까지는 비어 있음
  createdAt: string;                  // 연동 데이터 최초 생성 시각
  lastSentAt: string;                 // 최종 전송(연동) 시각 — 화면의 '최종연동일시'
  updatedAt: string;                  // 마지막 수정 시각 (updatedByEmail과 짝)
}
```

**불변 식별 정보와 스냅샷을 나눈 이유:** 스냅샷은 다음 라운드에서 사용자가 고치는 **가변** 데이터다. "어느 상품·설정에서 나왔는가"는 고쳐지면 안 되는 **불변** 사실이라 top-level에 따로 뒀다. 섞어두면 다음 라운드의 수정 폼이 원본 추적 정보까지 건드릴 위험이 생긴다.

**시각 필드를 셋으로 나눈 이유:** `updatedAt` 하나에 "마지막 전송"과 "마지막 수정"을 겹쳐 담으면, 다음 라운드에서 "수정만 하고 전송은 나중에" 하는 순간 두 의미가 갈라져 깨진다. 이번 라운드는 생성 = 첫 전송이라 세 값이 같지만, 다음 라운드부터 갈라진다.

**등록자·수정자를 이메일로 저장하는 이유:** 스냅샷 성격과 일관되게, 전송 당시 누구였는지가 그대로 남는다. `AccountUser.id` 참조가 아니라 값 복사다.

**스냅샷 타입을 `Product`/`ShoppingSetting` 전체로 두는 이유:** 전송에 필요한 필드만 추리면 지금 그 목록을 정해야 하고, 몰마다 필요 필드가 달라지면 다시 손봐야 한다. 전체 사본이면 다음 라운드의 수정 화면이 기존 상품등록 폼·설정 폼 컴포넌트를 그대로 재사용할 수 있다. 스냅샷 안의 `ownerId` 등이 top-level과 중복되지만 무해하다.

## 데이터 & API (MSW)

### 새 파일

```
src/mocks/data/MockMallLinkedProductsData.ts      # 시드 데이터
src/mocks/utils/getMallLinkedProducts.ts          # 필터 + 페이징
src/mocks/utils/createMallLinkedProducts.ts       # 전송 시 생성 + 실패 시뮬레이션
src/mocks/handlers/mallLinkedProducts.ts          # 라우트 배선 (위임만)
```

`handlers.ts` 인덱스에 spread를 추가한다. `src/app/api/**/route.ts`는 만들지 않는다 (`msw-rules.md`).

### 엔드포인트

| 메서드 | 경로 | 용도 |
|--------|------|------|
| `POST` | `/api/shopping/linked-products/list` | 목록 조회 (필터를 body로 전달하므로 POST) |
| `POST` | `/api/shopping/linked-products` | 연동 데이터 생성 = 몰 전송 |

기존 `POST /api/products/mall-registration`은 이 경로로 **이관하고 폐기**한다. 하는 일이 "연동 데이터 생성"이라 새 도메인에 속한다. 응답 body는 기존과 동일하게 `{ totalCount, successCount, failCount }`를 유지해 `/shopping/register`의 알림 문구 코드를 손대지 않는다.

경로 등록 순서는 고정 경로(`/list`)를 먼저 둔다 (`msw-rules.md`).

### 검색 요청 타입

```ts
export type MallLinkedProductSearchType =
  | 'productName'          // productSnapshot.name
  | 'productCode'          // sourceProductId
  | 'externalProductCode'  // externalProductId
  | 'createdBy'            // createdByEmail
  | 'updatedBy';           // updatedByEmail

export interface MallLinkedProductSearch {
  dateType: 'lastSentAt' | 'updatedAt';  // 최종연동일 / 수정일
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  shoppingSettingId: string;             // 'ALL' 기본값 — 쇼핑몰 계정(설정)
  linkStatus: MallLinkStatus | 'ALL';    // 성공 / 실패
  saleState: ProductStateType | 'ALL';   // 판매상태 (productSnapshot.state 기준)
  searchType: MallLinkedProductSearchType; // 기본값 'productName'
  searchValue: string;
}

export interface GetMallLinkedProductsResponse {
  linkedProducts: MallLinkedProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

검색어는 `searchType`으로 고른 **한 대상만** 매칭한다 (전체 필드 동시 검색 아님). 페이지당 10건.

목록 조회는 반드시 `ownerId`로 필터링한다 (테넌트 격리 규칙, `domain-design.md`).

### 전송 시뮬레이션 (`createMallLinkedProducts`)

프론트는 `{ productId, mallCode, shoppingSettingId }[]`와 `ownerId`, `createdByEmail`만 보낸다. **스냅샷 복사는 MSW가 `MOCK_PRODUCT_DATA`·`MOCK_SHOPPING_SETTINGS_DATA`에서 읽어 수행**한다 — 실제 백엔드가 붙었을 때와 같은 책임 분담이다.

- 실패율: 건당 `Math.random() < 0.1`
- 실패 사유 결정 순서:
  1. 같은 `sourceProductId` × `mallCode` 조합에 **이미 성공한 연동 데이터가 있으면** → `'동일 상품이 이미 등록되어 있습니다'`
  2. 그 외에는 몰별 메시지 — `NSST`: `'카테고리 매핑 오류'`, `KAKAOS`: `'상품명 글자 수 초과'`, 나머지: `'외부 쇼핑몰 전송 실패'`
- 성공 시 `externalProductId`를 `ext_${mallCode}_${난수}` 형식으로 부여
- 생성 시 `createdAt` = `lastSentAt` = `updatedAt`, `updatedByEmail`은 비움
- 소유권 검증(403)은 기존 `mall-registration` 핸들러의 로직을 그대로 옮긴다
- `delay(800)` 유지

시뮬레이션 전용 상수(실패율·오류 메시지)는 `createMallLinkedProducts.ts` **파일 내부**에 둔다. 실제 백엔드가 붙으면 파일째 삭제될 코드라 `constant/`로 분리하지 않는다.

## 화면

**라우트:** `/shopping/linked-products`
**사이드바:** `쇼핑몰관리` 그룹에 **'쇼핑몰 연동상품'** 메뉴 추가 (계정관리 / 정보설정 / 상품등록 다음). 기존 메뉴가 모두 `쇼핑몰 XX` 형태라 이에 맞춘다.
**화면 헤더 제목:** `쇼핑몰 연동 상품 목록`

### feature 디렉토리

```
src/features/mallLinkedProduct/
├── api/          getMallLinkedProducts.ts, useGetMallLinkedProducts.ts
├── constant/     mallLinkedProduct.constants.ts   (테이블 헤더, 필터 옵션)
├── store/        search.store.ts                  (필터 atom)
├── types/        mallLinkedProduct.types.ts
└── ui/
    ├── MallLinkedProductLayout.tsx
    ├── MallLinkedProductHeaderSection.tsx
    ├── MallLinkedProductSearchFilterSection.tsx
    ├── MallLinkedProductTableSection.tsx
    └── components/MallLinkedProductTable.tsx
```

### 검색 필터 카드

`ui-conventions.md`의 검색 필터 섹션 패턴(`CardContent className="p-0"` + 행마다 `px-6 py-1`)을 따른다.

```
행1  [최종연동일 ▾] [오늘][1주일][1개월]  [2026-07-01] ~ [2026-08-01]
행2  [쇼핑몰 ▾] [쇼핑몰 계정 ▾] [연동상태 ▾] [판매상태 ▾]
행3  [검색어] [상품명 ▾] [검색어를 입력하세요...........] [🔍 검색]
```

행3의 검색 타입 Select는 주문목록의 `OrderSearchInput`(`ORDER_SEARCH_TYPE` Select) 패턴을 그대로 따른다.

쇼핑몰 계정 Select 옵션은 기존 `getActiveShoppingSettings` API를 재사용하고, 위에서 고른 쇼핑몰에 따라 좁힌다.

**한계(수용):** 비활성 설정으로 만들어진 과거 연동 데이터는 계정 필터로 거를 수 없다. 이번 라운드는 이 한계를 받아들이고, 문제가 되면 전체 설정 조회로 바꾼다.

### 테이블 컬럼 (9개)

| 컬럼 | 값 | 비고 |
|------|-----|------|
| 상품코드 | `sourceProductId` | |
| 상품명 | `productSnapshot.name` | **좌측 정렬** (긴 텍스트 컬럼 규칙) |
| 연동몰 | `mallCode` → 몰 이름 | `SHOPPING_MALLS`에서 조회 |
| 쇼핑몰계정 | `settingSnapshot.nickname` | |
| 쇼핑몰상품코드 | `externalProductId ?? '-'` | |
| 판매가 | `productSnapshot.price` | |
| 판매상태 | `productSnapshot.state` | 기존 `ProductStatusBadge` 재사용 |
| 연동상태 | `status` 배지 + 실패 시 `errorMessage` | 한 컬럼에 합침 |
| 최종연동일시 | `lastSentAt` | |

```
상품코드   상품명      연동몰  쇼핑몰계정  쇼핑몰상품코드   판매가    판매상태  연동상태          최종연동일시
p_001     티셔츠A     네이버  본계정      ext_NSST_a3f9k  29,000원  판매중    [성공]           2026-08-01 14:20
p_001     티셔츠A     카카오  서브계정    -               29,000원  판매중    [실패]           2026-08-01 14:20
                                                                            상품명 글자 수 초과
p_002     머그컵B     네이버  본계정      -               12,000원  품절      [실패]           2026-08-01 14:21
                                                                            동일 상품이 이미 등록되어 있습니다
```

- **실패 사유를 연동상태 컬럼에 합친 이유:** 별도 컬럼으로 빼면 테이블 폭이 감당이 안 되고, 실패 배지와 사유는 붙어 있는 게 읽기 좋다.
- **등록자·수정자 컬럼은 넣지 않는다.** 검색 대상으로는 남는다.
- **수정자·수정일 컬럼도 넣지 않는다.** 이번 라운드엔 수정 기능이 없어 항상 비어 있다. 데이터 필드와 필터(수정일 기준 기간, 수정자 검색)는 이번에 구현해두고 컬럼은 다음 라운드에 추가한다.
- **체크박스 없음.** 조회 전용이라 선택할 대상이 없다. 다음 라운드에서 재전송이 생길 때 추가한다.

### 상태 처리

기존 목록 화면 패턴을 그대로 따른다.

- 로딩: 카드 제목 `전체 -건` + `불러오는 중...`
- 조회 실패: `연동 상품 목록을 불러오는데 실패했습니다.` (destructive 텍스트)
- 빈 결과: 테이블 본문에 `조건에 맞는 연동 상품이 없습니다.`
- `enabled: !!workspaceOwnerId`로 로그아웃 상태 쿼리 차단
- 조회는 등급 제한 없이 전 등급 허용

## 기존 코드 변경

| 파일 | 변경 |
|------|------|
| `src/features/products/types/product.types.ts` | `MallRegistration`, `MallRegistrationStatus` 타입 및 `Product.registeredMalls` 필드 제거 |
| `src/mocks/utils/registerProductsToMalls.ts` + `.test.ts` | 삭제 |
| `src/mocks/handlers/products.ts` | `mall-registration` 라우트 제거 |
| `src/features/mallRegistration/api/registerProductsToMalls.ts` | 경로를 `/api/shopping/linked-products`로 변경, 요청 본문에 `createdByEmail` 추가 |
| `src/features/mallRegistration/ui/MallRegistrationActionSection.tsx` | `emailAtom`을 읽어 전송 본문에 포함. 알림 문구 로직은 그대로. 51번 줄 주석의 `registeredMalls` 언급을 새 엔티티명으로 수정 |
| `src/constant/sidebarMenu.constant.ts` | `쇼핑몰관리` 그룹에 '쇼핑몰 연동상품' 메뉴 추가 |
| `src/app/(authenticated)/shopping/linked-products/page.tsx` | 신규 — `MallLinkedProductLayout` 렌더 |
| `.claude/rules/domain-design.md` | "오리지널 데이터 vs 연동 데이터" 절 추가 |

`/shopping/register`의 "등록예정 쇼핑몰" 배지는 staging 상태(`stagedRegistrationsAtom`)라 영향받지 않는다.

## 시드 데이터

`MockMallLinkedProductsData.ts`는 기존 `MOCK_PRODUCT_DATA`·`MOCK_SHOPPING_SETTINGS_DATA`를 참조해 12건 내외로 만든다. 다음 케이스가 반드시 포함되어야 한다:

- 한 상품이 여러 몰에 연동된 케이스 (행 단위가 연동 건임을 화면에서 확인)
- 같은 상품 × 같은 몰 × 같은 설정 조합이 2건 (중복 연동 허용 모델 확인, 서로 다른 `externalProductId`)
- 실패 3건 — NSST 전용 사유 1종 + fallback 1종 + `동일 상품이 이미 등록되어 있습니다` 1건
  (`MOCK_SHOPPING_SETTINGS_DATA`에 KAKAOS 설정이 없어 `'상품명 글자 수 초과'`는 시드에 나타날 수 없다)
- 판매상태가 서로 다른 상품 (판매상태 필터 확인)

## 테스트

테스트는 `src/mocks/utils/`(순수 로직)에만 작성한다. UI 컴포넌트·API fetch 래퍼는 이 프로젝트의 테스트 범위 밖이다 (CLAUDE.md).

**`getMallLinkedProducts.test.ts`**
- `ownerId` 격리
- 몰 / 쇼핑몰 계정 / 연동상태 / 판매상태 필터
- `searchType`별 매칭 5종
- 기간 필터가 `dateType`에 따라 `lastSentAt`·`updatedAt`을 각각 본다
- 페이징

**`createMallLinkedProducts.test.ts`**
- **스냅샷 독립성** — 생성 후 원본 `MOCK_PRODUCT_DATA`를 수정해도 연동 데이터 값이 변하지 않는다 (이 라운드의 핵심 규칙)
- 같은 조합 재전송 시 별도 건이 생성되고 `externalProductId`가 서로 다르다
- 성공 시 `externalProductId` 부여, 실패 시 `errorMessage` 기록
- 이미 성공한 조합을 재전송해 실패하면 중복 메시지가 나온다
- 생성 시 `createdAt` = `lastSentAt` = `updatedAt`

`Math.random()` 스텁은 `mockReturnValueOnce` 체인 대신 `mockReturnValue`로 고정한다 (성공 경로가 `externalProductId` 생성에도 난수를 쓰므로 호출 횟수에 따라 결과가 어긋난다 — `docs/solutions/conventions/deterministic-random-stub-vacuous-test.md`).

## 영향받지 않는 것

- `Product`의 나머지 필드, `ShoppingSetting` 구조
- `/shopping/register`의 상품 조회·몰 선택 모달·staging 상태
- 기존 상품/주문/설정 목록 화면

## 다음 라운드로 넘기는 오픈 이슈

1. **연동 데이터 수정 + 재전송** — 연동 데이터 단건 수정 화면(상품 필드 + 몰 설정 필드), 목록 체크박스와 재전송 액션, 수정자·수정일 컬럼 추가
2. **연동 데이터 삭제(연동 해제)** — 외부몰에서도 내려야 하는지 포함해 미정
3. `sourceProductId` / `sourceShoppingSettingId`가 가리키는 오리지널이 삭제됐을 때의 정합성 처리 (선행 라운드부터 이월)
4. 브랜드/모델명/모델번호/제조업체 등 상품 공통 필드를 `Product`에 추가 (이월)
5. Excel 대량등록에 등록 액션 반영 여부 (이월)
6. 제외된 몰(쿠팡/지마켓·ESM/오늘의집/무신사 등) 재조사 (이월)
