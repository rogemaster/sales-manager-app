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
