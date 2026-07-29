# 몰 등록 전송 결과 영속화 설계

- 작성일: 2026-07-29
- 선행 스펙: `2026-07-28-mall-registration-action-ui-design.md` (PR #35로 구현 완료)
- 목적: 전송 API를 외부 쇼핑몰 게이트웨이 모델에 맞춰 개편하고, 전송 결과(성공/실패)를 `Product.registeredMalls`에 영속화한다.

## 배경

PR #35로 `/shopping/register` 화면(상품 선택 → 몰·설정 스테이징 → 전송)은 완성됐다. 그러나 전송 API는 "우리 DB에 등록 이력을 저장한다"는 초기 오해에 기반해 `{ success, count }`만 반환하고 **전부 성공 처리**하고 있다.

이후 `docs/solutions/architecture-patterns/mall-registration-external-api-gateway.md`에서 도메인을 재정의했다 — **"몰 등록"은 내부 저장이 아니라 외부 쇼핑몰 API로의 전송이며, 실패가 정상적으로 발생하는 작업이다.** 이 스펙은 그 결정을 코드에 반영한다.

### 실패 UI를 이번 라운드에서 제외하는 이유

전송 직후 실패 목록을 보여주는 UI(별도 라우트 / 모달 / 인라인)를 검토했으나, **다음 라운드에서 만들 "쇼핑몰 등록 상품 목록" 화면이 그 역할을 맡는 것이 더 자연스럽다**고 결정했다. 실패는 "전송 순간의 알림"이 아니라 "등록 상품이 가진 상태"이고, 사용자는 그 화면에서 실패 사유를 보고 → 수정 → 재전송하는 흐름을 밟는다.

따라서 이번 라운드는 **실패를 만들어내고 데이터로 남기는 것까지**만 담당한다. 이렇게 해야 다음 라운드 화면이 렌더링할 데이터가 존재한다.

## 스코프

**하는 것:**
- `MallRegistration` 타입에 `status`/`externalId`/`errorMessage` 추가
- `registeredMalls`를 append 이력 → **조합 단위 upsert(현재 상태)**로 전환
- MSW 전송 시뮬레이션에 랜덤 실패·몰별 오류 메시지·응답 지연 반영
- 전송 API 응답을 집계 결과(`totalCount`/`successCount`/`failCount`)로 변경
- 전송 완료 알림 문구에 성공/실패 건수 반영

**하지 않는 것 (다음 라운드로 이관):**
- 실패 항목 목록 UI 및 재전송 액션 → "쇼핑몰 등록 상품 목록" 화면에서 처리
- `MOCK_PRODUCT_DATA`에 `registeredMalls` 시드 데이터 추가 → 위 화면 작업 시 함께 처리
- 브랜드/모델명/모델번호/제조업체 등 상품 공통 필드를 `Product`에 추가
- `registeredMalls`가 참조하는 `shoppingSettingId` 삭제 시 정합성 처리
- Excel 대량등록에 등록 액션 반영 여부
- 제외된 몰(쿠팡/지마켓·ESM/오늘의집/무신사 등) 재조사

## 선행 스펙 대비 변경점

`2026-07-28-mall-registration-action-ui-design.md`의 세 가지 결정을 뒤집는다.

### 1. `registeredMalls`: append 이력 → 조합 단위 upsert

선행 스펙은 "같은 몰-설정 조합으로 여러 번 등록 가능(재입고·재노출)"을 근거로 매 전송마다 append하고 중복을 제거하지 않기로 했다.

그러나 이 배열이 다음 라운드 화면의 데이터 소스가 되면서 전제가 무너진다. "실패건을 보고 수정 후 재전송"하는 시나리오에서 append를 유지하면 같은 상품+몰 조합이 `실패` 행과 `성공` 행으로 **두 줄 쌓인다.** 사용자가 기대하는 것은 조합당 한 줄이 상태만 바뀌는 모습이다.

외부 몰 API의 실제 의미와도 upsert가 맞다 — 이미 등록된 상품의 재전송은 신규 등록이 아니라 수정(update)이고, `externalId`도 조합당 하나만 유효하다.

전송 이력("언제 몇 번 보냈는가")은 필요해지는 시점에 `Product` 안의 배열이 아니라 별도 엔티티(전송 단위 job + 진행률)로 분리한다. 현재 이를 소비할 화면이 없다.

### 2. 응답에서 per-item `results` 배열 제거

게이트웨이 문서와 선행 스펙은 응답에 `results: { productId, mallCode, shoppingSettingId, status, externalId?, errorMessage? }[]`를 포함시켰다.

실패 상세가 `registeredMalls`에 저장되고 다음 라운드 화면이 그것을 조회하므로, **프론트에서 아무도 읽지 않는 배열**이 된다. 실제 백엔드가 `results`를 반환하더라도 프론트가 무시하면 되고, 필요해지는 시점에 타입만 추가하면 된다.

### 3. staging 초기화: 3분기 → 항상 전체 초기화

선행 스펙은 전체성공·부분실패 시 초기화, **전체실패 시 유지(재시도용)**로 정했다.

"전체실패 시 유지"는 "이 화면에서 바로 재시도한다"는 전제였는데, 실패건이 `registeredMalls`에 남아 다음 화면에서 처리되므로 근거가 사라진다. 오히려 staging을 남기면 같은 건이 두 화면에서 동시에 재전송 대기 상태로 보여 혼란스럽다.

## 데이터 모델

```ts
// src/features/products/types/product.types.ts
export type MallRegistrationStatus = 'success' | 'failed';

export interface MallRegistration {
  id: string;
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  status: MallRegistrationStatus;
  registeredAt: string;    // 마지막 전송 시각
  externalId?: string;     // 성공 시 외부몰이 부여한 상품 ID
  errorMessage?: string;   // 실패 시 사유
}
```

**upsert 키:** `mallCode + shoppingSettingId`. 배열이 이미 상품 단위로 존재하므로 `productId`는 키에 포함하지 않는다.

**`id`:** 배열에 없는 조합일 때만 새로 생성하고(기존 형식 `mr_${Date.now()}_${index}` 유지), 이미 있는 조합을 갱신할 때는 기존 값을 그대로 둔다. 다음 라운드 화면에서 행 key로 쓸 안정적인 식별자가 필요하기 때문이다.

**필드 전이 규칙:**

| 전이 | `errorMessage` | `externalId` |
|------|----------------|--------------|
| (신규) → 성공 | 없음 | 새로 발급 |
| 실패 → 성공 | **삭제** | 새로 발급 (실패 항목엔 기존 값이 없다) |
| 성공 → 성공 (재전송) | 없음 | **보존 — 재발급하지 않는다** |
| 성공 → 실패 | 새 사유로 설정 | **보존** |

- 실패 → 성공에서 `errorMessage`를 지우지 않으면 다음 화면에서 성공 행에 옛 오류가 붙어 보인다.
- 성공 → 실패에서 `externalId`를 지우지 않는 이유: 외부몰에 이미 올라간 상품의 수정 전송이 실패한 것이므로 외부 ID 자체는 여전히 유효하다.
- 성공 → 성공에서 재발급하지 않는 이유: 위 §1의 upsert 근거와 같다 — 이미 등록된 상품의 재전송은 신규 등록이 아니라 수정(update)이고, 외부몰은 같은 상품 ID를 그대로 돌려준다. 조합당 `externalId`는 하나만 유효하다. **구현상 `existing.externalId ??= ...`로 "없을 때만 발급"이어야 하며, 무조건 대입하면 재전송마다 ID가 바뀐다.**

## API

### 요청 (변경 없음)

`POST /api/products/mall-registration`

```ts
{ ownerId: string; items: { productId: string; mallCode: ShoppingMalls; shoppingSettingId: string }[] }
```

### 응답 (변경)

```ts
// src/features/mallRegistration/api/registerProductsToMalls.ts
export interface RegisterProductsToMallsResponse {
  totalCount: number;
  successCount: number;
  failCount: number;
}
```

기존 `{ success: boolean; count: number }`를 대체한다. `registerMockProductsToMalls`는 존재하지 않는 `productId`를 방어적으로 건너뛰고 집계에서 제외한다. 다만 핸들러(`src/mocks/handlers/products.ts`)가 요청에 포함된 `productId` 중 하나라도 소유권 확인에 실패하면 요청 전체를 403으로 거부하므로, 실제로 200 응답이 온 경우 `totalCount`는 항상 요청 `items` 길이와 같다.

소유권 검증(`isOwnerMatch` 기반 403)은 현행 유지한다.

## MSW 시뮬레이션

로직은 `src/mocks/utils/registerProductsToMalls.ts`가 담당하고, 핸들러(`src/mocks/handlers/products.ts`)는 위임만 한다.

- **실패율 약 10%**: 항목별로 독립 판정한다 (`Math.random() < 0.1` → 실패)
- **몰별 고정 오류 메시지**: `NSST` → `"카테고리 매핑 오류"`, `KAKAOS` → `"상품명 글자 수 초과"`, 그 외 몰은 공통 fallback 메시지. `Partial<Record<ShoppingMalls, string>>` + fallback 형태로 두어 몰 추가 시 컴파일 에러가 나지 않도록 한다
- **상수 위치**: 이 오류 메시지 맵은 `registerProductsToMalls.ts` **파일 내부**에 둔다. 실제 백엔드가 붙으면 파일째 삭제될 시뮬레이션 전용 코드라, `constant/`로 분리하면 삭제 시점에 누락되어 남는다
- **`externalId`**: 성공 시 `ext_{mallCode}_{6자리 랜덤 영숫자}` 형식으로 생성
- **`delay`**: 500 → **800** (외부 몰 API 응답 지연 시뮬레이션)
- 성공·실패 **양쪽 모두** `registeredMalls`에 upsert한다 (선행 스펙 및 게이트웨이 문서의 "성공 항목만 append"에서 변경)

## 화면 동작

`src/features/mallRegistration/ui/MallRegistrationActionSection.tsx`의 `handleSend` → `onSuccess`만 변경한다.

- staging은 결과와 무관하게 항상 `resetState()`로 전체 초기화
- 알림 문구:

| 조건 | 문구 | type |
|------|------|------|
| `failCount === 0` | `"N건이 쇼핑몰로 전송되었습니다."` | `success` |
| `failCount > 0` | `"총 N건 중 M건 전송 성공, K건 실패했습니다."` | `warning` |

- 네트워크/403 등 요청 자체 실패(`onError`)는 현행 유지: `"전송 중 오류가 발생했습니다. 다시 시도해주세요."` (`error`)
- 실패 항목 목록은 표시하지 않는다. 사용자는 실패 발생 사실과 건수만 알고, 상세는 다음 라운드 화면에서 확인한다

## 테스트

`src/mocks/utils/registerProductsToMalls.test.ts`를 수정한다. 랜덤 실패가 들어가므로 `vi.spyOn(Math, 'random')`으로 결정론을 확보한다 — 프로덕션 코드에 난수 주입 파라미터를 뚫지 않는다.

- **기존 "같은 조합 반복 시 별도 이력으로 누적" 테스트는 반전된다** — 1건을 유지하고 상태만 갱신되는지 검증
- 실패 판정 시 `status: 'failed'` + 몰별 `errorMessage`가 기록되는지
- `totalCount`/`successCount`/`failCount` 집계 정확성
- 실패 → 성공 재전송 시 `errorMessage` 제거 + `externalId` 설정
- 성공 → 실패 재전송 시 `externalId` 보존
- **성공 → 성공 재전송 시 `externalId` 재발급 안 함** — 이 테스트는 두 번의 전송에 **서로 다른** 난수를 스텁해야 한다. 단일 `mockReturnValue`로는 매번 같은 문자열이 생성되어 재발급 여부와 무관하게 통과하는 공허한 테스트가 된다
- 존재하지 않는 `productId`는 건너뛰고 집계에 포함하지 않음 (기존 테스트 유지)

## 영향받지 않는 것

- `MallRegistrationTable`의 "등록예정 쇼핑몰" 배지 컬럼 — staging 표시 용도 그대로
- `MallSelectModal`, `mallRegistration.store.ts`, 활성 `ShoppingSetting` 조회 API
- `Product`의 기존 필드, `ShoppingSetting` 구조
- 소유권 검증 로직

## 다음 라운드로 넘기는 오픈 이슈

1. **쇼핑몰 등록 상품 목록 화면** — `registeredMalls` 조회, 실패 사유 표시, 수정 후 재전송. `MOCK_PRODUCT_DATA` 시드 데이터도 여기서 함께 추가
2. 브랜드/모델명/모델번호/제조업체 등 상품 공통 필드를 `Product`에 추가
3. `registeredMalls`가 참조하는 `shoppingSettingId` 삭제 시 정합성 처리
4. Excel 대량등록에 등록 액션 반영 여부
5. 제외된 몰(쿠팡/지마켓·ESM/오늘의집/무신사 등) 재조사
