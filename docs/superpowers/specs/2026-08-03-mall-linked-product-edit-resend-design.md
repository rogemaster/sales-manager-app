# 쇼핑몰 연동 데이터 수정·재전송 설계

- 날짜: 2026-08-03
- 목적: `/shopping/linked-products` 목록의 연동 데이터를 **수정하고 외부 쇼핑몰로 다시 보내는** 기능을 만든다. 선행 라운드가 필드(`updatedByEmail`/`updatedAt`)와 목록 체크박스를 미리 깔아뒀고, 이번 라운드가 그것을 실제로 쓰는 쪽이다.
- 선행 라운드: `2026-08-01-mall-linked-product-list-design.md` (PR #37, #38)
- **이번 라운드 산출물:** 단건 수정 화면 + 단건/일괄 재전송 + 목록 액션·수정일 컬럼
- **이번 라운드에서 다루지 않는 것:** 연동 해제(삭제), 오리지널 삭제 시 참조 정합성

## 전제 — 백엔드는 있다고 가정한다

이 프로젝트는 개발 환경에서 MSW가 모든 API 요청을 가로챈다. 따라서:

- `src/features/mallLinkedProduct/api/`의 fetch 래퍼는 **실제 백엔드를 호출하는 코드 그대로** 작성한다.
- `src/mocks/handlers/` + `src/mocks/utils/`가 그 백엔드 역할을 대신한다.
- `src/app/api/.../route.ts`는 만들지 않는다 (`.claude/rules/msw-rules.md`).

**외부 쇼핑몰과의 통신도 백엔드 몫으로 가정한다.** 프론트는 우리 백엔드의 재전송 엔드포인트 하나만 호출하고, "외부몰에 실제로 보내고 성공·실패를 받아오는" 부분은 백엔드 안에 있는 것으로 본다. 실패율·몰별 오류 메시지·`externalProductId` 발급 같은 시뮬레이션은 전부 `mallLinkSimulation.ts` 한 파일에 모으고, 실제 백엔드가 붙으면 **그 파일과 mock 유틸만 지우면 되고 feature 코드는 바뀌지 않는다.**

스냅샷도 같은 가정을 따른다 — 서버가 변경된 필드만 골라내는 게 아니라, **클라이언트가 완성된 스냅샷을 보내고 서버는 불변 필드를 지켜내는** 방식이다.

## 핵심 결정 — 저장과 재전송은 별개 액션이다

| 액션 | 하는 일 | 건드리는 시각 필드 |
|---|---|---|
| **저장** | 스냅샷(상품·설정)을 고친다. 외부몰과 통신하지 않는다 | `updatedAt` |
| **재전송** | 현재 스냅샷을 외부몰로 보낸다. 스냅샷을 고치지 않는다 | `lastSentAt` |

선행 라운드가 `createdAt` / `lastSentAt` / `updatedAt`을 셋으로 나눠둔 이유가 여기서 실현된다. 두 액션을 하나로 합치면 "수정만 하고 전송은 나중에" 하는 순간 두 시각의 의미가 갈라져 깨진다.

수정 화면에는 버튼이 셋이다 — `[취소] [저장] [저장 후 재전송]`. "저장 후 재전송"은 PATCH → POST를 **순차 호출**하는 것이지 별도 엔드포인트가 아니다.

**대가:** 저장은 성공했는데 전송만 실패하는 상태가 실제로 생긴다. 이 경우 사용자가 "저장이 안 된 건가?"라고 오해하면 같은 수정을 반복하게 되므로, 알림 문구에서 두 결과를 분리해 명시한다(아래 "사용자 피드백" 참고).

## 재전송의 의미 — 외부몰 상품 수정

이미 성공한 연동 건을 재전송하면 **기존 외부몰 상품을 수정**하는 것으로 본다. `externalProductId`를 유지한 채 값만 덮어쓴다. "연동 데이터 1건 = 외부몰 상품 1개"라는 도메인 규칙과 맞고, 재전송할 때마다 새 코드를 받으면 이전 코드가 외부몰에 남은 채 추적 불가능해진다.

**재전송이 실패해도 `externalProductId`는 유지한다.** 외부몰 상품은 이전 값으로 살아있기 때문이다. 대신 `status`는 `failed`로 바뀐다 — `status`는 "외부몰에 상품이 존재하는가"가 아니라 **"마지막 전송이 성공했는가"**를 뜻한다. 목록에서는 실패 배지와 사유가 뜨면서 쇼핑몰상품코드 컬럼은 그대로 보이는데, 이 조합이 곧 "외부몰엔 있지만 내 최근 수정은 아직 반영 안 됨"을 나타낸다.

### 중복 판정 기준을 바꾼다

현재 `resolveErrorMessage`는 "같은 상품 × 같은 몰에 성공 이력이 있으면 중복"으로 판정한다. 이대로 재전송하면 **성공 건이 자기 자신의 성공 이력 때문에 항상 중복 실패**로 판정된다.

자기 id를 예외로 넘기는 대신 판정 기준 자체를 바꾼다:

> **`externalProductId`가 있으면 중복 검사를 하지 않는다.**

이 값이 있다는 건 외부몰에 내 상품이 이미 있다는 뜻이고, 그 상태의 전송은 신규 등록이 아니라 수정이라 중복이라는 개념이 성립하지 않는다. 값이 없으면 신규 등록이므로 기존 판정을 그대로 쓴다. 그리고 **성공은 항상 `externalProductId`를 남기므로 값이 없는 건은 자기 성공 이력을 가질 수 없다** — 예외 처리가 애초에 필요 없다.

결과적으로 `externalProductId`의 유무가 "외부몰에 이 상품이 존재하는가"의 단일 판정 기준이 되고, 위의 "실패해도 유지" 규칙과 일관된다.

## 필드 갱신 규칙

이 표가 이번 설계의 계약이다.

| 필드 | 저장 (PATCH) | 재전송 (POST resend) |
|---|---|---|
| `productSnapshot` · `settingSnapshot` | 덮어씀 (`structuredClone`) | 안 건드림 |
| `updatedAt` · `updatedByEmail` | 갱신 | **안 건드림** |
| `status` · `errorMessage` | **안 건드림** | 전송 결과로 갱신 |
| `lastSentAt` | **안 건드림** | 갱신 |
| `externalProductId` | 안 건드림 | 있으면 유지 / 없으면 성공 시 발급 |
| `id` · `ownerId` · `sourceProductId` · `sourceShoppingSettingId` · `mallCode` · `createdAt` · `createdByEmail` | 불변 | 불변 |

저장이 `lastSentAt`을, 재전송이 `updatedAt`을 서로 건드리지 않는 것이 두 액션을 분리한 의미의 전부다.

### mallCode 방어

저장 시 mock 핸들러는 `settingSnapshot.mallCode`를 **레코드의 `mallCode`로 강제 고정**한다. 폼에 몰 선택 필드가 없어 정상 경로에선 바뀌지 않지만, 이 둘이 갈라지면 몰 필터와 쇼핑몰계정 필터가 서로 다른 답을 낸다. 생성 유틸이 이미 같은 이유로 방어하고 있다(`createMallLinkedProducts.ts` 내 주석).

## API

| 메서드·경로 | 용도 | 요청 |
|---|---|---|
| `GET /api/shopping/linked-products/:id` | 수정 화면 진입 시 단건 조회 | `X-Owner-Id` 헤더 |
| `PATCH /api/shopping/linked-products/:id` | 저장 | `X-Owner-Id` 헤더 + body `{ updatedByEmail, productSnapshot, settingSnapshot }` |
| `POST /api/shopping/linked-products/resend` | 재전송 (단건·일괄 공용) | body `{ ownerId, ids: string[] }` |

**재전송을 `ids` 배열로 통일하는 이유:** 수정 화면의 단건 재전송과 목록의 일괄 재전송이 완전히 같은 계약을 쓴다. 단건은 원소가 하나인 배열일 뿐이다.

**응답:** 재전송은 `ResendMallLinkedProductsResult = { totalCount, successCount, failCount }`를 반환한다. 생성의 `CreateMallLinkedProductsResult`와 구조가 같지만 **재사용하지 않고 별도 선언**한다 — 의미가 다르고 한쪽만 바뀔 수 있다.

**소유자 전달 방식이 엔드포인트마다 다른 이유:** 기존 코드의 컨벤션을 그대로 따른다. 단건 리소스를 다루는 `GET`/`PATCH`는 `X-Owner-Id` 헤더(`getProduct.ts`, `updateProduct.ts`), body를 가진 `POST`는 body에 `ownerId`를 싣는다(연동 데이터 목록 조회·생성). 새 규칙을 만들지 않는다.

### 소유권 검증

- `GET` / `PATCH` (단건): 대상이 없거나 소유자가 아니면 **둘 다 404**. 기존 단건 핸들러(`handlers/products.ts`)와 같다 — 남의 데이터가 존재한다는 사실 자체를 응답으로 알리지 않기 위해 403과 404를 구분하지 않는다.
- `POST resend` (일괄): `allOwnedBy(ids, ownerId, MOCK_MALL_LINKED_PRODUCT_DATA)` — 하나라도 남의 것이면 **전체 403**(fail-closed). 기존 bulk 액션 컨벤션과 동일하다.

단건이 404, 일괄이 403으로 갈리는 건 의도적이다. 단건은 "네가 접근할 수 있는 그 리소스는 없다"는 응답이고, 일괄은 "요청 자체가 부적격이라 하나도 처리하지 않았다"는 응답이다.

기존 제네릭 `allOwnedBy<T extends { id: string; ownerId: string }>`가 `MallLinkedProduct`에 **그대로 적용된다**(`Product`는 식별자가 `productId`라 별도 헬퍼가 필요했던 것과 대비된다). 다만 핸들러가 mock 데이터를 직접 import하지 않도록, `verifyOwnership.ts`에 얇은 래퍼 `areLinkedProductsOwnedBy(ids, ownerId)`를 두고 핸들러는 그것만 호출한다 — `areMallLinkRequestsOwnedBy`와 같은 형태다.

### 핸들러 등록 순서

고정 경로 `/list`, `/resend`를 동적 경로 `/:id`보다 **먼저** 등록한다 (`.claude/rules/msw-rules.md` 경로 충돌 규칙).

## 수정 화면

라우트는 `/shopping/linked-products/[id]`.

```
src/app/(authenticated)/shopping/linked-products/[id]/page.tsx
src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx
```

### 폼 구성 — 폼 2개 + 섹션 직접 조립

`useForm<Product>`와 `useForm<ShoppingSettingFormValues>` **두 개의 폼**을 각각 `FormProvider`로 감싸고, 기존 래퍼(`ProductForm` / `ShoppingSettingForm`)를 건너뛰고 그 안의 섹션 컴포넌트를 직접 나열한다.

**래퍼를 쓰지 않는 이유:** 두 래퍼 모두 자체 제출·취소 버튼과 이동 경로를 내장하고 있다. 특히 `ProductForm`은 "상품 등록" 라벨과 `router.back()`이 하드코딩이라, 이 화면(버튼 3개)에서 재사용하려면 prop을 여러 개 뚫어야 하고 기존 4개 화면(상품 등록·수정, 설정 등록·수정)이 전부 영향권에 들어간다. 섹션을 직접 나열하면 **기존 컴포넌트를 한 줄도 고치지 않는다.**

이는 이 코드베이스가 이미 세운 원칙과 같은 논리다 — "화면은 자기 테이블 헤더 상수를 소유한다"(`docs/solutions/architecture-patterns/screen-owned-table-header-constants.md`). 연동 데이터 수정 화면은 상품 등록 화면과 다른 화면이므로 레이아웃을 스스로 소유한다.

**대가:** 섹션 나열이 래퍼와 중복된다. 나중에 상품 폼에 섹션이 추가되면 이 화면에도 같이 넣어야 한다. 이 중복을 감수하는 대신 기존 화면의 회귀 위험을 0으로 만든다.

**단일 폼 + 중첩 경로(`useForm<{ product, setting }>`)를 택하지 않은 이유:** 모든 하위 섹션이 `register('name')` 같은 flat 경로를 쓰고 있어 전 섹션에 prefix를 주입해야 한다. 상품 쪽만 7개 섹션에 옵션·이미지 같은 배열 필드까지 얽혀 있어 침습도가 가장 크다.

### 레이아웃

1. **헤더** — 제목 + `몰명 · 쇼핑몰계정` 부제 (`ShoppingSettingModifyLayout` 패턴)
2. **연동 정보 카드 (읽기 전용)** — 상품코드 · 쇼핑몰상품코드 · 연동상태 · 최종연동일시 · 등록자
3. **상품 정보 폼** — `FormProvider #1` + 기존 상품 섹션들
4. **쇼핑몰 설정 폼** — `FormProvider #2` + 기존 설정 섹션들
5. **버튼** — `[취소] [저장] [저장 후 재전송]`

**불변 식별 정보를 폼 바깥 읽기 전용 카드에 두는 이유:** 스냅샷과 섞이면 수정 폼이 원본 추적 정보를 건드릴 수 있다. 선행 라운드가 `MallLinkedProduct`를 불변 식별 정보와 가변 스냅샷으로 나눈 이유가 이것이다.

### 제출 흐름

1. 두 폼에 각각 `trigger()`를 돌린다.
2. **둘 다 유효할 때만** 진행한다 — 한쪽만 통과하면 저장하지 않는다. 상품은 저장됐는데 설정은 안 된 반쪽 상태를 막는다.
3. `getValues()` 두 개를 합쳐 PATCH 본문을 만든다. 설정 쪽은 기존 `buildMallSettingsPayload`로 `mallSettings`를 변환한 뒤, 원본 스냅샷의 불변 필드(`id`, `mallCode`, `mallAccountId`, `mallId`, `ownerId`)를 덮어씌워 `ShoppingSetting` 모양을 복원한다.
4. "저장 후 재전송"이면 PATCH 성공 후에만 재전송을 호출한다. PATCH가 실패하면 재전송하지 않는다.

**스냅샷 내부의 시각 필드는 건드리지 않는다.** `productSnapshot.createDate`/`updateDate`, `settingSnapshot.createdAt`/`updatedAt`은 **오리지널이 언제 만들어지고 수정됐는지**를 기록한 스냅샷의 일부이지 연동 데이터의 시각이 아니다. 연동 데이터의 시각은 top-level의 `createdAt`/`lastSentAt`/`updatedAt` 셋뿐이다. 폼이 이 필드들을 편집하지 않으므로 `reset()` → `getValues()` 왕복에서 원본 값이 그대로 실려 나간다.

## 목록 화면 변경

### 1. 액션 컬럼 추가

헤더 상수에 `{ id: 'action', title: '관리', width: 'w-24' }`, 바디에 `[수정]` 버튼 `TableCell`을 추가한다. 클릭 시 `/shopping/linked-products/{id}`로 이동한다.

**상품명 링크가 아니라 액션 버튼인 이유:** 상품명을 링크로 만들면 "오리지널 상품 상세로 간다"는 인상을 주는데 실제 도착지는 연동 데이터 수정 화면이라 의미가 갈린다. 쇼핑몰 정보설정 목록(`ShoppingSettingTable`)이 쓰는 패턴과 같다.

**헤더 상수와 바디 셀을 반드시 같은 커밋에서 짝으로 추가한다** — 2026-08-03에 `products/list`에서 정확히 이 유형(헤더 8개 / 셀 7개)의 밀림 버그를 고쳤다.

### 2. 수정일 컬럼 추가

`{ id: 'updatedAt', title: '수정일', width: 'w-36' }`를 최종연동일시 옆에 둔다. 두 값을 나란히 보여주면 "고쳐놓고 아직 안 보낸" 건을 사용자가 대조할 수 있다.

**'미전송 변경' 배지는 넣지 않는다.** 컬럼 두 개를 나란히 보여주는 것으로 충분하다고 판단했다.

**수정자 컬럼은 넣지 않는다.** 선행 라운드에서 "등록자·수정자는 컬럼 없이 검색 대상으로만 남긴다"고 결정했고(`2026-08-01` 스펙), 그 결정을 뒤집을 이유가 이번에 생기지 않았다. 수정자 검색 필터는 이미 동작한다.

### 3. 일괄 재전송 버튼

테이블 섹션의 `CardHeader`를 `justify-between`으로 나눠 좌측 "전체 N건", 우측 `[선택 재전송]`을 배치한다. `.claude/rules/ui-conventions.md`의 "헤더에 버튼이 필요하면 제목 좌측·버튼 우측" 규칙 그대로라 **새 섹션 파일이 필요 없다.** 선택 0건이면 비활성화하고, 전송 중(`isPending`)에도 비활성화한다.

### 4. 선택 초기화 지점이 하나 늘어난다

기존 2곳(페이지 이동 `MallLinkedProductLayout.tsx`, 재검색)에 **재전송 완료 후**가 추가된다. 재전송하면 목록을 다시 불러오는데 선택이 남아 있으면 이미 처리된 행이 계속 체크된 채로 보인다. 성공·실패와 무관하게 초기화한다.

**초기화 주체는 재전송 버튼을 가진 컴포넌트다.** 버튼이 `MallLinkedProductTableSection`의 `CardHeader`에 있으므로, 그 컴포넌트가 mutation의 `onSuccess`에서 `selectedLinkedIdsAtom`을 직접 비운다. 페이지 이동 초기화가 `MallLinkedProductLayout`에 있는 것과 대칭이다 — 각 액션을 소유한 쪽이 자기 초기화를 책임진다.

근거: `docs/solutions/architecture-patterns/page-scoped-selection-state-reset.md`

## 사용자 피드백

알림 문구는 `MallRegistrationActionSection`의 기존 전송 결과 패턴을 그대로 쓴다 — 같은 "외부몰 전송" 행위라 문구가 갈리면 안 된다.

### 수정 화면

| 상황 | 처리 |
|---|---|
| 단건 조회 실패·404 | "연동 데이터를 찾을 수 없습니다" 안내 (`ShoppingSettingModifyLayout` 패턴) |
| 저장 성공 | `success` 알림 → 확인 시 목록으로 이동 |
| 저장 실패 | `error` 알림, **화면에 머무름**. 재전송하지 않음 |
| 저장 + 재전송 둘 다 성공 | "저장 후 쇼핑몰로 전송되었습니다." → 목록 이동 |
| 저장 성공, 전송만 실패 | `warning` — **"저장은 완료되었으나 전송에 실패했습니다"**를 명시 → 목록 이동 |

### 목록 화면 (일괄 재전송)

- 선택 0건 → `warning` "재전송할 연동 상품을 선택해주세요." (버튼은 이미 비활성이지만 방어)
- 전부 성공 → `success` "N건이 쇼핑몰로 전송되었습니다."
- 일부 실패 → `warning` "총 N건 중 M건 전송 성공, K건 실패했습니다."
- 통신 오류·403 → `error` "전송 중 오류가 발생했습니다. 다시 시도해주세요."
- 결과와 무관하게 **선택 초기화 + 목록 refetch**. 실패 건은 목록에 사유와 함께 남으므로 사용자가 거기서 다시 조치한다 — 등록 화면이 결과와 무관하게 staging을 비우는 것과 같은 판단이다.

### 지연 시뮬레이션

재전송 핸들러에도 생성과 같은 `delay(800)`을 적용한다.

## 파일 구성

### 신규

| 파일 | 역할 |
|---|---|
| `src/app/(authenticated)/shopping/linked-products/[id]/page.tsx` | 수정 화면 라우트 |
| `src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx` | 수정 화면 레이아웃 (폼 2개 소유, 제출 흐름) |
| `src/features/mallLinkedProduct/ui/[id]/MallLinkedProductInfoCard.tsx` | 불변 식별 정보 읽기 전용 카드 |
| `src/features/mallLinkedProduct/api/getMallLinkedProduct.ts` | 단건 조회 fetch |
| `src/features/mallLinkedProduct/api/useGetMallLinkedProduct.ts` | 단건 조회 훅 |
| `src/features/mallLinkedProduct/api/updateMallLinkedProduct.ts` | 저장 fetch |
| `src/features/mallLinkedProduct/api/useUpdateMallLinkedProduct.ts` | 저장 훅 |
| `src/features/mallLinkedProduct/api/resendMallLinkedProducts.ts` | 재전송 fetch |
| `src/features/mallLinkedProduct/api/useResendMallLinkedProducts.ts` | 재전송 훅 |
| `src/mocks/utils/mallLinkSimulation.ts` | 외부몰 시뮬레이션 공용 (실패율·오류 메시지·`externalProductId` 발급·시퀀스) |
| `src/mocks/utils/getMallLinkedProduct.ts` | 단건 조회 + 소유권 판정 |
| `src/mocks/utils/updateMallLinkedProduct.ts` | 스냅샷 저장 |
| `src/mocks/utils/resendMallLinkedProducts.ts` | 재전송 |

### 수정

| 파일 | 변경 |
|---|---|
| `src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts` | `UpdateMallLinkedProductBody`, `ResendMallLinkedProductsBody`, `ResendMallLinkedProductsResult` 추가. **`MallLinkedProduct` 자체는 변경 없음** |
| `src/features/mallLinkedProduct/constant/mallLinkedProduct.constants.ts` | 테이블 헤더에 `updatedAt`·`action` 추가 |
| `src/features/mallLinkedProduct/ui/components/MallLinkedProductTable.tsx` | 수정일 셀 + 수정 버튼 셀 추가 |
| `src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx` | `CardHeader`에 선택 재전송 버튼 + 완료 후 선택 초기화 |
| `src/mocks/utils/createMallLinkedProducts.ts` | 시뮬레이션 상수를 공용 모듈에서 import |
| `src/mocks/handlers/mallLinkedProducts.ts` | 핸들러 3개 추가 (등록 순서 주의) |

## 테스트

테스트는 `src/mocks/utils/`(순수 로직)에만 작성한다. UI 컴포넌트·API fetch 래퍼·store는 이 프로젝트의 테스트 범위 밖이다(CLAUDE.md). 성공·실패 분기는 기존 생성 테스트와 동일하게 `vi.spyOn(Math, 'random')`으로 고정한다.

**`getMallLinkedProduct.test.ts`** — 소유자면 반환 / 타 소유자면 `null` / 없는 id면 `null`

**`updateMallLinkedProduct.test.ts`**

1. 스냅샷 두 개가 새 값으로 교체된다
2. `updatedAt`·`updatedByEmail`이 갱신된다
3. **`status`·`lastSentAt`·`externalProductId`가 그대로다**
4. `sourceProductId`·`sourceShoppingSettingId`·`createdAt`·`createdByEmail`이 그대로다
5. 저장 후 호출자가 넘긴 객체를 변형해도 저장된 스냅샷이 안 바뀐다 (깊은 복사)
6. `settingSnapshot.mallCode`에 다른 몰 코드가 실려 와도 레코드의 `mallCode`로 고정된다
7. 타 소유자·없는 id면 아무것도 수정하지 않는다

**`resendMallLinkedProducts.test.ts`**

1. 성공 시 `externalProductId` 유지 · `lastSentAt` 갱신 · `errorMessage` 제거
2. **실패해도 `externalProductId`가 유지된다**
3. **`updatedAt`·`updatedByEmail`을 건드리지 않는다**
4. 스냅샷을 건드리지 않는다
5. `externalProductId`가 있는 건은 같은 상품 × 몰에 다른 성공 이력이 있어도 중복 사유로 실패하지 않는다
6. `externalProductId`가 없는 건은 기존대로 중복 판정을 받는다
7. `externalProductId`가 없던 건이 성공하면 새로 발급된다
8. 여러 건 처리 시 `{ totalCount, successCount, failCount }` 집계가 맞는다

3번과 5번이 이번 라운드에서 가장 깨지기 쉬운 규칙이라 테스트로 못 박는다.

**회귀 확인:** 시뮬레이션 상수를 `mallLinkSimulation.ts`로 옮기면 기존 `createMallLinkedProducts.test.ts`의 모듈 모킹 경로가 영향받을 수 있다. 해당 테스트가 그대로 통과하는지 확인하고, 필요하면 모킹 대상을 새 모듈로 조정한다.

## 영향받지 않는 것

- `MallLinkedProduct` 타입 자체 (새 필드 없음)
- 목록 조회 API·검색 필터·페이지네이션
- 오리지널 상품(`/products/*`)·쇼핑몰 정보설정(`/shopping/settings/*`) 화면 및 폼 컴포넌트
- `/shopping/register` 전송 화면
- 시드 데이터

## 다음 라운드로 넘기는 오픈 이슈

1. **연동 해제(삭제)** — 외부몰 상품도 내릴 것인가 / 우리 데이터만 지울 것인가 / 외부몰은 판매중지 처리할 것인가. 정책부터 정해야 한다.
2. **오리지널 삭제 시 참조 정합성** — 상품·설정을 지우면 `sourceProductId`/`sourceShoppingSettingId`가 끊긴다. 스냅샷 덕에 표시는 되지만 추적 링크가 사라진다. 3개 라운드째 이월 중.
3. **상품 공통 필드 추가** (브랜드/모델명/모델번호/제조업체)
4. **Excel 대량등록 반영 여부**
5. **제외된 몰 재조사** (쿠팡/지마켓·ESM/오늘의집/무신사) — 공식 Open API 문서 확보 시
