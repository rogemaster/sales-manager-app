# 도메인 설계 규칙

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
