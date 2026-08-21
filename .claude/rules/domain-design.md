# 도메인 설계 규칙

## 이 서비스가 하는 일 — 아래 규칙들이 서 있는 전제

이 프로젝트는 **여러 외부 쇼핑몰에서 각각 관리해야 하는 모든 관리 포인트(상품·주문·클레임 등)를 한 곳에서 일괄로 처리하는** 서비스다. 판매자가 몰마다 따로 들어가 하던 일을 여기서 한 번에 한다.

상품 등록·수정은 그중 한 영역일 뿐이다. **"상품 연동 서비스"로 좁혀 이해하면 안 된다** — 신규 도메인을 설계할 때 상품 쪽 구조만 보고 판단하면 방향이 어긋난다.

영역마다 데이터가 흐르는 방향이 다르다.

| 영역 | 방향 | 현재 구현 |
|------|------|----------|
| 상품 | **내보내기** — 우리가 만든 데이터를 각 몰로 전송 | `/shopping/register` 전송, `/shopping/linked-products` 수정·재전송 |
| 주문 | **가져오기** — 각 몰의 데이터를 수집해 통합 | `/order/collect` 수집 작업, `/order/list` |
| 클레임 | **가져오기** — 주문에 딸려 조회 | `GET /api/orders/:orderId/claim` |

방향이 달라도 다루는 문제는 같다 — **몰마다 형식이 다르고, 겹치기도 하고 갈리기도 한다.** 그래서 공통 원칙도 같다.

### 공통 정보는 모으고, 몰 고유값만 분리한다

**공통되는 정보는 최대한 오리진 데이터에 모으고, 몰 고유값만 따로 뺀다.**

상품 영역에서는 이것이 오리진 상품(`Product`) / 쇼핑몰정보설정(`ShoppingSetting`)의 분리로 구체화돼 있다. 전송 시점에 둘이 결합해 하나의 상품 데이터가 되고, 각 몰이 요구하는 key에 value를 채워 보낸다.

주문·클레임처럼 가져오는 영역도 같은 사고를 따른다 — 몰별 응답 형식의 차이는 우리 도메인 타입 하나로 수렴시키고, 몰 고유 정보만 별도로 보관한다. **새 영역을 설계할 때 이 원칙을 먼저 적용하고, 그다음 그 영역 고유의 문제를 다룬다.**

### 이름이 다른 것은 고유값이 아니다

**의미가 같은데 몰마다 부르는 이름만 다른 값은 필드를 늘리지 않는다.** 프론트는 의미 단위로 하나만 갖고, 몰별 key 매핑과 payload 조립은 백엔드가 흡수한다.

- 예: 카카오의 `giftBrandId`는 다른 몰의 브랜드와 같은 값이다. 프론트는 `Product.brand` 하나만 가지면 되고, 카카오 전송 시 그 값을 `giftBrandId` 키에 담는 일은 백엔드가 한다.
- **주의:** 아래 "필드를 어느 엔티티에 둘 것인가" 기준(상품마다 다른가 / 설정 단위로 고정인가)만으로는 이 경우를 못 거른다. 브랜드는 상품마다 다른 값이라 그 기준을 그대로 적용하면 `brand`와 `giftBrandId`를 **둘 다** `Product`에 넣는 결론이 나온다. **먼저 "이미 있는 필드와 같은 의미인가"를 묻고, 그다음에 배치를 판단한다.**

### 검증 책임은 외부 쇼핑몰에 있다 (내보내기 방향)

전송값의 최종 판정은 각 외부몰이 한다. 프론트가 몰별 규칙을 미리 재현해 전송을 막지 않는다. 실패하면 연동 상품 목록에서 사유를 보고 → 수정 → 재전송하는 흐름으로 처리한다.

**단, 입력 단계의 필수 여부는 몰들 중 가장 엄격한 쪽을 따른다.** A몰에서 필수이고 B몰에서 선택인 값이면 이 프로젝트에서는 **필수**다. 사용자가 어느 몰로 보내든 전송이 막히지 않게 하기 위해서다.

- 이 둘은 층이 다르다 — **필수 규칙은 입력 폼(Zod 스키마)의 문제**이고, **검증 책임은 전송 결과의 문제**다. 프론트가 필수로 받아둔다고 해서 전송 성공이 보장되지는 않으며, 그 판정은 여전히 외부몰 몫이다.
- **감수하는 비용:** B몰에만 파는 사용자도 A몰 때문에 그 값을 채워야 한다. 몰이 늘어 새 필수 필드가 생기면 기존 상품들이 그 값을 갖고 있지 않은 상태가 되므로, 몰 추가 라운드에서 기존 데이터 처리 방침을 함께 정해야 한다.

관련: [`docs/solutions/architecture-patterns/product-vs-shoppingsetting-compliance-field-boundary.md`](../../docs/solutions/architecture-patterns/product-vs-shoppingsetting-compliance-field-boundary.md) — 필드를 어느 엔티티에 둘지의 하위 판단 기준

### 값을 요구하는 주체가 사용자면 위 규칙이 적용되지 않는다 — `skuCode`

위 "가장 엄격한 몰을 따른다"는 **외부몰이 요구하는 값**에 대한 규칙이다. 어느 몰도 요구하지 않고 **사용자가 자기 업무를 위해 관리하는 값**은 여기에 해당하지 않는다.

`OptionCombination.skuCode`가 그런 필드다.

- **선택값이다.** SKU를 관리하는 사용자와 관리하지 않는 사용자가 함께 존재하므로 필수로 둘 수 없다.
- **중복 검증을 하지 않는다.** 중복 판정은 프로그램이 아니라 사용자가 직접 한다.
- **연동 대상 판정과 무관하다.** 값이 비어 있어도 외부몰 연동에서 제외되지 않는다 — 연동 가능 여부는 사용자가 정하고 결과는 외부몰 응답이 판정한다.

**Why:** 코드만 보면 "필수도 아니고 유니크 검증도 없다"가 **빠뜨린 것**으로 읽힌다. 2026-08-21 실제로 그렇게 읽고 필수·유니크·중복 검증 추가를 제안했다가 전부 기각됐다. 빠진 게 아니라 그렇게 설계된 것이다.

**판별 질문:** 이 값을 요구하는 주체가 외부몰인가, 사용자 자신인가. 후자면 필수 여부와 검증 강도는 **사용자의 업무 방식**을 따르지, 몰 규칙을 따르지 않는다.

관련: `docs/superpowers/specs/2026-08-22-product-option-id-field-reduction.md`

## 유저 계층 구조

### 핵심 원칙

가입으로 생성된 계정만 `super_admin`이며, 사용자 관리에서 등록된 계정은 슈퍼계정에 종속된다.

### 타입 구조

- `AccountUser.ownerId: string | null`
  - 슈퍼계정(`super_admin`)은 가입 시 `ownerId`에 **자기 자신의 `id`를 동일하게 저장** (`ownerId === id`) — 2026-07-08부터 적용, 그 이전 가입 계정은 `null`이었으나 실 DB의 기존 계정도 함께 마이그레이션 완료
  - 종속 유저는 `ownerId`에 슈퍼계정의 `id`를 저장
  - `string | null` 타입은 하위호환(과거 `null` 데이터, 로그아웃 시 클라이언트 초기화 상태)을 위해 유지하지만, 신규 생성되는 모든 계정은 항상 non-null 값을 갖는다
- `SubUserGrade = Exclude<UserGrade, 'super_admin'>` — 사용자 등록 폼에서는 `super_admin` 옵션 없음
- `CreateUserBody.grade: SubUserGrade` — 타입 레벨에서 `super_admin` 부여 불가

### 동작 규칙

- 로그인한 슈퍼계정은 자신의 `id === ownerId`인 유저만 사용자 관리에서 조회/수정 가능 (슈퍼계정 자신도 이 조건을 만족)
- `super_admin`은 가입(회원가입) 플로우에서만 생성됨
- `workspaceOwnerIdAtom`(`ownerId ?? id`)은 과거 `null` 데이터에 대한 하위호환 fallback이다. 신규 가입 계정은 `ownerId`가 항상 채워지므로 이 fallback 없이도 동작하지만, 안전을 위해 유지한다.

### 확장 적용 방침

매입처, 매출처 등 향후 추가되는 등록 엔티티도 동일한 `ownerId` 종속 패턴을 따른다. 새 도메인 설계 시 `ownerId` 필드로 슈퍼계정 종속 처리하고, 목록 조회 API는 반드시 로그인 계정의 `id`로 필터링한다.

## API·타입은 엔드포인트가 속한 도메인에 둔다

`api/` 함수, `useGetX` 훅, 응답 타입은 **그 API가 다루는 리소스의 도메인**에 배치한다. 그것을 소비하는 화면의 도메인이 아니다.

판정 기준은 **엔드포인트 경로**다. `/api/shopping/settings/active` 는 `shoppingSetting` 도메인이므로, 그 화면이 `mallRegistration`이든 `mallLinkedProduct`든 관계없이 `shoppingSetting/api/`에 둔다.

- **Why:** 2026-08-06 정리 전, `getActiveShoppingSettings`는 MSW 핸들러(`handlers/shoppingSettings.ts`)와 mock util은 shoppingSetting 쪽에 있는데 클라이언트 api/훅/타입만 `mallRegistration`에 있었다. 처음 그 화면을 만들면서 그 자리에 둔 것뿐인데, 결과적으로 두 개의 역방향 의존이 생겼다:
  - `mallLinkedProduct`의 필터가 `mallRegistration`의 훅을 import — 의미상 `shoppingSetting`을 봐야 할 의존이 엉뚱한 형제 도메인으로 향함
  - `mocks/utils/getActiveShoppingSettings.ts`(shoppingSetting 데이터 처리)가 `mallRegistration`의 타입을 import
- **징후:** "이 훅을 두 번째 화면에서도 쓰게 됐다"면 배치를 의심할 시점이다. 첫 소비처가 정본 위치라는 보장은 없다.
- 두 도메인에서 같은 리소스를 요청하는데 응답 형태만 다르면, 타입을 복제하지 말고 리소스 도메인의 타입 파일에 **둘 다** 둔다 (예: `shoppingSetting.types.ts`의 `AvailableMallAccount`와 `ActiveShoppingSettingOption`은 나란히 있어야 관계가 드러난다).

### 요청/응답 타입은 구조가 같아도 함부로 합치지 않는다 — 단, 같은 호출 경로면 반드시 하나여야 한다

- **합쳐야 하는 경우:** 같은 API 호출 경로를 지나는 타입. `MallRegistrationRequestItem`과 `MallLinkedProductRequestItem`은 필드가 같은 채로 한쪽은 호출부, 한쪽은 api 함수 시그니처에 쓰이고 있었다. 구조가 같아 타입 체커가 통과시킬 뿐, 한쪽만 바뀌면 조용히 깨진다. 이런 건 즉시 하나로 합친다.
- **합치면 안 되는 경우:** 구조만 같고 의미가 다르며 독립적으로 변할 수 있는 것. `CreateMallLinkedProductsResult`와 `ResendMallLinkedProductsResult`가 그 예로, 분리 유지가 맞다 — 이런 판단은 **타입 주석에 근거를 남긴다.**

## 오리지널 데이터와 쇼핑몰 연동 데이터

`/products/create`로 만든 **오리지널 상품**(`Product`), `/shopping/settings`로 만든 **오리지널 쇼핑몰정보설정**(`ShoppingSetting`), 그리고 `/shopping/register` 전송으로 만들어지는 **쇼핑몰 연동 데이터**(`MallLinkedProduct`)는 서로 별개의 데이터다.

- 연동 데이터는 생성 시점의 상품·설정 값을 **스냅샷으로 복사해 보유**한다 (`productSnapshot`, `settingSnapshot`).
- **오리지널을 수정해도 연동 데이터는 바뀌지 않는다.** 연동 데이터의 수정은 각 연동 건을 직접 고쳐서 해당 몰로 전송하는 방식이다.
- **오리지널을 삭제해도 연동 데이터는 삭제되지 않는다.** 수정이 전파되지 않는 것과 같은 이유다 — `sourceProductId`·`sourceShoppingSettingId`는 값을 동기화하는 참조가 아니라 **출처 표시(추적용)**일 뿐이다. 오리지널이 사라져 추적 링크가 끊기는 것은 버그가 아니라 **설계상 정상 동작**이며, 연동 데이터는 스냅샷을 갖고 있어 그대로 조회·수정·재전송할 수 있다.
  - 따라서 연동 데이터가 있다고 해서 삭제를 **차단하지 않는다.** 대신 삭제 확인 창에 연동 건수와 "연동 상품은 유지된다"는 안내를 띄워 사용자가 결과를 알고 진행하게 한다 (`ShoppingSettingActionSection`의 `handleDelete`, 건수는 `POST /api/shopping/settings/linked-count`).
  - 현재 이 규칙이 실제로 적용되는 대상은 **쇼핑몰 정보설정 삭제뿐**이다. 상품 삭제 기능은 존재하지 않는다.
- **연동 데이터 1건 = 외부 쇼핑몰 상품 1개** (외부몰이 부여한 `externalProductId` 1개).
- 같은 상품을 같은 몰로 **여러 번 전송할 수 있고**, 그때마다 별도 연동 데이터가 생성된다. 외부몰이 중복이라 판단하면 실패 응답을 준다.
- 스냅샷은 반드시 **깊은 복사**(`structuredClone`)로 만든다. 얕은 복사는 중첩 객체가 오리지널과 공유되어 위 원칙이 깨진다.
- `MallLinkedProduct`는 **불변 식별 정보**(`sourceProductId`, `sourceShoppingSettingId`, `mallCode`)와 **가변 스냅샷**을 분리해 둔다. 수정 기능이 스냅샷만 건드리고 원본 추적 정보는 못 건드리게 하기 위해서다.
- 시각 필드는 셋으로 나뉜다 — `createdAt`(최초 생성) / `lastSentAt`(최종 전송, 화면의 '최종연동일시') / `updatedAt`(마지막 수정). 하나로 합치면 "수정만 하고 전송은 나중에" 하는 순간 의미가 갈라져 깨진다.

설계 근거: `docs/superpowers/specs/2026-08-01-mall-linked-product-list-design.md`

### 연동 데이터의 저장과 재전송

연동 데이터를 고치는 것과 그것을 외부몰로 보내는 것은 **별개 액션**이다.

- **저장** — 스냅샷(`productSnapshot`·`settingSnapshot`)만 교체하고 `updatedAt`·`updatedByEmail`을 갱신한다. `status`·`lastSentAt`·`externalProductId`는 건드리지 않는다.
- **재전송** — 현재 스냅샷을 외부몰로 보내고 `status`·`lastSentAt`을 갱신한다. 스냅샷과 `updatedAt`은 건드리지 않는다.

`externalProductId`의 유무가 **"외부몰에 이 상품이 존재하는가"의 단일 판정 기준**이다.

- 값이 있으면 그 전송은 신규 등록이 아니라 **기존 외부몰 상품의 수정**이다. 코드를 유지하고, 중복 판정을 하지 않는다.
- 값이 없으면 신규 등록이므로 중복 판정(같은 상품 × 같은 몰에 성공 이력이 있으면 중복)을 적용한다.
- **재전송이 실패해도 이 값은 지우지 않는다.** 외부몰 상품은 이전 값으로 살아있기 때문이다. 이때 `status`는 `failed`가 되는데, `status`는 "외부몰에 상품이 있는가"가 아니라 **"마지막 전송이 성공했는가"**를 뜻하기 때문이다.

설계 근거: `docs/superpowers/specs/2026-08-03-mall-linked-product-edit-resend-design.md`

### 연동 데이터에서 수정할 수 없는 것 — 쇼핑몰과 쇼핑몰계정

이미 연동된 데이터의 **쇼핑몰(`mallCode`)과 쇼핑몰계정(`mallAccountId`·`mallId`)은 수정 대상이 아니다.** 연동 1건 = **특정 계정으로** 등록된 외부몰 상품 1개이므로, 계정이 바뀌면 그건 같은 상품의 수정이 아니라 **다른 상품**이다. 수정 화면에서 고칠 수 있는 것은 상품 값과 설정 값뿐이다.

이 규칙은 문서만으로 지켜지지 않는다. 집행 지점이 두 곳이고, 둘 다 **폼이 돌려준 값에서 불변 필드(`id`·`ownerId`·`mallAccountId`·`mallId`·`mallCode`)를 원본 값으로 되돌리는** 방식이다.

| 위치 | 역할 |
|------|------|
| `buildSnapshots` (`MallLinkedProductEditLayout`) | 폼 값에서 되돌린다. `mallCode`는 레코드, 나머지 넷은 원본 `settingSnapshot`이 정본 |
| `updateMockMallLinkedProduct` (MSW) | 같은 필드를 기존 스냅샷 값으로 고정한다. **최종 방어선은 이쪽** |

**왜 수정에만 이 장치가 필요한가 — 생성과 책임 분담이 다르다.** 생성(`createMockMallLinkedProducts`)은 클라이언트가 `{ productId, mallCode, shoppingSettingId }`만 보내고 **서버가 원본에서 읽어 스냅샷을 복사**하므로 어긋날 여지가 없다. 반면 수정은 **클라이언트가 완성된 스냅샷을 보내고 서버가 불변 필드를 지켜내는** 방식이라, 지켜내는 범위가 곧 이 규칙의 실효 범위다.

**어긋나면 목록이 아니라 다른 곳이 깨진다.** 목록 검색은 전부 top-level(`ownerId`·`mallCode`·`sourceShoppingSettingId`·`status`)과 `productSnapshot`만 읽으므로 `settingSnapshot`이 틀어져도 화면상 증상이 없다. 실제 파급은 **재전송 payload가 다른 계정을 향하는 것**과 **수정 화면 주소록 조회(`watch('mallId')` 기준)가 틀어지는 것**이라, 늦게 발견되는 종류다.

**주의 — 설정 폼 섹션 3개는 세 화면이 공유한다.** `ShoppingSettingBasicInfoSection`·`ShoppingSettingAddressSection`·`ShoppingSettingMallInfoSection`을 설정 등록/수정 화면(`ShoppingSettingForm` 경유)과 연동상품 수정 화면(래퍼 없이 직접 나열)이 함께 쓴다. 설정 화면 사정으로 이 섹션에 쇼핑몰계정 Select를 붙이면 **연동상품 수정 화면에도 그대로 딸려 들어간다.** 컴포넌트를 공유하면 의도하지 않은 화면까지 따라오는 전례는 [`ui-conventions.md`](ui-conventions.md)의 "검색 필터는 화면이 소유한다" 절 참고.

## 몰(mallCode)별 고유 필드 컴포넌트 분리 기준

`ShoppingSettingMallInfoSection.tsx`는 현재 네이버·카카오 2개 몰의 필드 컴포넌트(`NaverMallSettingsFields`, `KakaoMallSettingsFields`)를 파일 내부에 함께 정의한다(공식 Open API 문서 근거가 확인된 몰만 우선 구현했고, 나머지 몰은 근거 확보 시 추가 예정). 몰 고유 필드 컴포넌트가 3개 이상으로 늘어나면 Excel 전략 패턴(`src/components/excel/strategies/`, `.claude/rules/excel.md` 참고)과 동일하게 `ui/components/form/mallFields/` 디렉토리로 분리하고, `ShoppingSettingMallInfoSection`은 `mallCode`에 맞는 컴포넌트를 선택하는 역할만 담당하도록 얇게 유지한다.

### 새 몰에 고유 속성 추가 시 체크리스트

`ShoppingSetting`의 `mallCode` discriminated union은 세 번째 arm(`Exclude<ShoppingMalls, 'NSST' | 'KAKAOS'>; mallSettings?: never`)이 나머지 몰 전체를 흡수하는 캐치올이라, 새 몰의 `Exclude`에 추가하는 걸 빠뜨려도 **컴파일 에러가 나지 않는다.** 새 몰(예: `COUP`)에 고유 속성을 추가할 때는 아래 5곳을 함께 수정해야 한다:

1. `shoppingSetting.types.ts` — `CoupangSettingAttributes` 인터페이스 추가
2. `shoppingSetting.types.ts` — `ShoppingSetting`에 새 union arm 추가 + 캐치올 `Exclude<...>`에 새 mallCode 추가
3. `shoppingSetting.types.ts` — `ShoppingSettingFormValues.mallSettings`의 `Partial<...>` 인터섹션에 새 속성 추가
4. `buildMallSettingsPayload.ts` — 오버로드 시그니처 + KEYS 배열 + `case` 분기 추가
5. `ShoppingSettingMallInfoSection.tsx`(또는 분리된 `mallFields/`) — 조건 분기 + Fields 컴포넌트 추가

캐치올 arm 때문에 타입 체커가 강제하지 않으므로, 이 체크리스트를 수동으로 따라야 한다.

### 몰 3개 이상 시 `MallAttributesMap` 파생 구조 전환 검토

몰이 3개 이상으로 늘어나면, 위 체크리스트의 하드코딩 방식(union arm과 `Exclude`에 몰 코드를 따로 나열) 대신 단일 소스(`MallAttributesMap`)에서 파생하는 구조로 전환을 검토한다.

```ts
export interface MallAttributesMap {
  NSST: NaverSettingAttributes;
  KAKAOS: KakaoSettingAttributes;
  // COUP: CoupangSettingAttributes;  ← 몰 추가 시 한 줄만
}

type MallSpecificSetting = {
  [K in keyof MallAttributesMap]: ShoppingSettingBase & { mallCode: K; mallSettings?: MallAttributesMap[K] };
}[keyof MallAttributesMap];

type GenericMallSetting = ShoppingSettingBase & {
  mallCode: Exclude<ShoppingMalls, keyof MallAttributesMap>;
  mallSettings?: never;
};

export type ShoppingSetting = MallSpecificSetting | GenericMallSetting;
```

`buildMallSettingsPayload.ts`의 KEYS 배열, `mallFields/`의 Fields 컴포넌트 레지스트리도 같은 방식(`{ [K in keyof MallAttributesMap]: ... }`)으로 맞춘다 — 이 형태는 몰 하나를 통째로 빠뜨리면 **컴파일 에러가 나므로**, 현재의 "사람이 체크리스트를 기억해야 하는" 위험을 줄여준다.

**도입 시점을 미루는 이유:** 타입 복잡도 자체는 크리티컬한 반대 근거가 아니다(파생 로직은 `shoppingSetting.types.ts` 한 곳에 국한되고, 소비하는 쪽은 지금과 동일한 평범한 discriminated union으로 보인다). 진짜 이유는 YAGNI — 몰 2개(n=2)만으로 일반화된 모양을 확정하면 3번째 몰의 실제 속성 구조가 다를 경우(필드 타입이 다르거나 중첩 구조가 필요한 경우 등) 추측에 기반한 설계라 다시 손봐야 할 수 있다. 3번째 몰의 실제 데이터를 본 뒤 전환하는 게 더 안전하다.

## Documented Solutions

`docs/solutions/` — 과거 버그·베스트 프랙티스 문서 모음. 카테고리별(`logic-errors/`, `ui-bugs/` 등) 디렉토리로 정리되며 YAML frontmatter(`module`, `tags`, `problem_type`)로 검색 가능. 관련 기능 구현 또는 디버깅 시 참고.

### 작업 완료 후 solutions 기록 제안 규칙

작업이 완료된 후, 해당 내용이 `docs/solutions/`에 기록할 만한지 판단하여 사용자에게 먼저 제안한다. 사용자가 확인 후 기록 여부를 결정한다.

- **타이밍:** 작업 완료(git pull 또는 사용자의 마무리 신호) 직후 Claude가 먼저 제안한다. 사용자가 먼저 물어볼 때까지 기다리지 않는다.
- **판단 기준:** "이 내용이 코드만으로는 알기 어려운 맥락을 담고 있는가?" — 버그 수정·기능 추가·설계 결정 등에서 해당하면 제안, 단순 작업이면 생략.
- **제안 형식:** 문서화 가치 있는 항목을 목록으로 제시하고 기록 여부를 묻는다.
