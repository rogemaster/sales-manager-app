# ShoppingSetting 몰 고유 정보 필드 구현 설계

- 작성일: 2026-07-22
- 목적: `2026-07-21-mall-specific-registration-fields-design.md`(타입/구조 모델링 라운드)에서 확정된 설계를 실제 구현으로 옮기는 라운드.
- **이번 라운드 범위: `ShoppingSetting` 쪽만.** `Product.registeredMalls`(상품↔ShoppingSetting 결합/등록 액션 UI)는 스펙 원문에도 "별도 라운드"로 명시되어 있고, 아직 등록 화면 자체가 없어 이번 라운드에서 제외한다(YAGNI — 쓸 곳이 없는 타입을 미리 추가하지 않음).

## 배경

`2026-07-21-mall-specific-registration-fields-design.md`에서 네이버 스마트스토어(NSST)·카카오스토어(KAKAOS) 2개 몰만 공식 Open API 문서 기반으로 필드를 확정했고, 몰 고유 항목 대부분이 `Product`가 아니라 `ShoppingSetting`(판매자 계정/설정 단위)에 귀속된다는 결론을 냈다. 이번 라운드는 그 타입을 실제 코드에 반영하고, `ShoppingSetting` 등록/수정 폼에 몰별 입력 섹션을 추가한다.

## 데이터 모델

`ShoppingSetting`을 `mallCode` 기준 discriminated union으로 전환한다.

```typescript
// src/features/shoppingSetting/types/shoppingSetting.types.ts

interface ShoppingSettingBase {
  id: string;
  mallAccountId: string;
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

export interface NaverSettingAttributes {
  afterServiceContact?: string; // A/S 전화번호
  afterServiceGuide?: string; // A/S 안내문구
  purchaseReviewExposure?: boolean; // 구매평 노출 설정
  logisticsCompanyId?: string; // 풀필먼트 물류사 ID (사용 시만)
  logisticsCenterId?: string; // 풀필먼트 물류센터 ID (사용 시만)
  certificationInfo?: string; // 인증정보
  certificationExcludeReason?: string; // 인증 예외처리 사유
}

export interface KakaoSettingAttributes {
  certs?: string; // 인증정보
  additionalInfo?: string; // 부가정보 (선물포장/맞춤제작/반품가능여부)
  shoppingHowDisplayable?: boolean; // 쇼핑하우 전시여부
  storeboardDisplayStatus?: string; // 스토어보드 전시상태
}

export type ShoppingSetting =
  | (ShoppingSettingBase & { mallCode: 'NSST'; mallSettings?: NaverSettingAttributes })
  | (ShoppingSettingBase & { mallCode: 'KAKAOS'; mallSettings?: KakaoSettingAttributes })
  | (ShoppingSettingBase & { mallCode: Exclude<ShoppingMalls, 'NSST' | 'KAKAOS'>; mallSettings?: never });

export type CreateShoppingSettingBody = Omit<ShoppingSetting, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdateShoppingSettingBody = Partial<CreateShoppingSettingBody>;
```

`CreateShoppingSettingBody`/`UpdateShoppingSettingBody`는 기존처럼 `Omit`/`Partial`로 파생되므로 discriminated union을 자동으로 상속한다 — 별도 정의 불필요.

### Mock 데이터 영향

- `MOCK_SHOPPING_SETTINGS_DATA`의 기존 엔트리들은 `mallSettings`가 optional이라 그대로 유효하다(마이그레이션 불필요).
- 네이버/카카오 mock 데이터 1~2건에 예시 `mallSettings` 값을 채워 화면에서 바로 확인 가능하게 한다.
- `ShoppingSettingTable.tsx`는 `mallSettings`를 표시하지 않으므로 영향 없음.

**정정(writing-plans 단계에서 실제 `npx tsc --noEmit`으로 검증 후 발견):** 애초 "body를 그대로 spread하는 구조라 코드 변경 없이 타입만 통과한다"고 예상했던 `createShoppingSetting.ts`/`updateShoppingSetting.ts`(mocks/utils)와 `getShoppingSettings.test.ts`의 `makeSetting` 헬퍼는 실제로는 **수정이 필요하다.** TypeScript는 discriminated union 값을 객체 spread(`{ ...body }`)하면 `mallCode`↔`mallSettings`의 상관관계를 구조적으로 잃어버리는 한계가 있어, 결과 객체가 `ShoppingSetting` 타입에 그대로 할당되지 않는다. 이 세 파일은 그 경계에서 `as ShoppingSetting` 캐스팅(주석으로 이유 명시)을 추가해야 한다 — 자세한 코드는 구현 계획(`docs/superpowers/plans/2026-07-22-shopping-setting-mall-info-fields.md`) Task 1 참고. `getShoppingSetting.ts`(단건 조회, `Array.find` 반환)는 spread가 없어 예상대로 영향 없음.

## 폼 타입 & 컴포넌트 구조

### 폼 전용 Flat 타입

RHF의 `register`/`Controller` `name` 타입 추론이 discriminated union과 결합할 때 깨지는 문제를 피하기 위해, 폼 전용 flat 타입을 별도로 둔다(PR #29에서 `mallCode as` 캐스팅을 zod 스키마 강화로 제거한 전례와 방향을 맞춤 — 이 프로젝트는 `as` 캐스팅을 지양).

```typescript
export interface ShoppingSettingFormValues extends ShoppingSettingBase {
  mallCode: ShoppingMalls;
  mallSettings?: Partial<NaverSettingAttributes & KakaoSettingAttributes>;
}
```

- `ShoppingSettingCreateLayout`/`ShoppingSettingModifyLayout`은 `useForm<ShoppingSettingFormValues>()`로 폼을 관리한다.
- 제출 시점에만 `mallCode`에 따라 필요한 서브셋을 골라 실제 discriminated union 바디로 변환한다(아래 "제출 변환 로직" 참고).
- `ShoppingSettingModifyLayout`의 `formData.reset(setting)`은 `ShoppingSetting`(discriminated union) → `ShoppingSettingFormValues`(flat)로 그대로 spread 가능 — `mallSettings`가 optional이라 없는 몰(`mallSettings: never`)도 `reset`에 문제없다.

### 컴포넌트 구조

```
ShoppingSettingForm.tsx
├── ShoppingSettingBasicInfoSection   (기존, 변경 없음)
├── ShoppingSettingAddressSection     (기존, 변경 없음)
└── ShoppingSettingMallInfoSection    (신규)
      - useFormContext<ShoppingSettingFormValues>()로 mallCode watch
      - mallCode === 'NSST' → 네이버 서브필드 렌더 (Card 안 내부 블록)
      - mallCode === 'KAKAOS' → 카카오 서브필드 렌더 (Card 안 내부 블록)
      - 그 외 → 컴포넌트가 null을 반환, 카드 자체를 렌더링하지 않음
```

- 네이버(7필드)/카카오(4필드)는 필드 수가 많지 않아 **별도 파일로 쪼개지 않고 `ShoppingSettingMallInfoSection.tsx` 한 파일 안에서 두 개의 내부 렌더 블록**으로 처리한다(과도한 파일 분리 방지).
- 카드 스타일은 `.claude/rules/ui-conventions.md`의 Card 패턴(`accent 바 + CardTitle`)을 그대로 따른다.
- Boolean 필드(`purchaseReviewExposure`, `shoppingHowDisplayable`)는 기존 `ShoppingSettingBasicInfoSection`과 동일한 `RadioGroup` 패턴을 재사용한다. 공용 `YES_NO_OPTIONS` 상수를 `shoppingSetting.constants.ts`에 추가한다.
- 텍스트 필드(A/S 연락처·안내문구, 인증정보, 인증 예외처리 사유, 물류사/물류센터ID, 부가정보, 스토어보드 전시상태)는 `Input`(단문)/`Textarea`(안내문구류) — 스펙상 전 필드 optional이므로 `required` validation 없음.

## 제출 시 변환 로직

`src/features/shoppingSetting/util/buildMallSettingsPayload.ts` (신규):

```typescript
export const buildMallSettingsPayload = (
  mallCode: ShoppingMalls,
  values?: Partial<NaverSettingAttributes & KakaoSettingAttributes>,
): NaverSettingAttributes | KakaoSettingAttributes | undefined => {
  if (mallCode === 'NSST') {
    return values ? pickDefined(values, NAVER_SETTING_KEYS) : undefined;
  }
  if (mallCode === 'KAKAOS') {
    return values ? pickDefined(values, KAKAO_SETTING_KEYS) : undefined;
  }
  return undefined;
};
```

- 외부 라이브러리(lodash 등) 없이 순수 함수로 구현한다(현재 프로젝트에 lodash 미사용).
- `ShoppingSettingCreateLayout.tsx`/`ShoppingSettingModifyLayout.tsx`의 `onSubmit`에서 이 유틸로 `mallSettings`를 구성한 뒤 `CreateShoppingSettingBody`/`UpdateShoppingSettingBody`에 포함한다.

## 영향 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `shoppingSetting.types.ts` | `ShoppingSetting` discriminated union, `NaverSettingAttributes`/`KakaoSettingAttributes`, `ShoppingSettingFormValues` 추가 |
| `shoppingSetting.constants.ts` | `YES_NO_OPTIONS`, 네이버/카카오 필드 라벨 상수 추가 |
| `ShoppingSettingMallInfoSection.tsx` (신규) | 몰별 서브폼 |
| `ShoppingSettingForm.tsx` | 신규 섹션 추가 |
| `ShoppingSettingCreateLayout.tsx` | `useForm<ShoppingSettingFormValues>`로 전환, 변환 유틸 적용 |
| `ShoppingSettingModifyLayout.tsx` | 동일 + `reset(setting)` flat 변환 |
| `util/buildMallSettingsPayload.ts` (신규) | flat 폼 값 → 몰별 discriminated union 페이로드 변환 |
| `MockShoppingSettingsData.ts` | 네이버/카카오 예시 1~2건에 `mallSettings` 값 채움 |

**영향 없음(타입 통과만 확인, 코드 변경 불필요):** `getShoppingSetting.ts`, `ShoppingSettingTable.tsx`, 관련 API 함수/훅 6개(`useCreateShoppingSetting`, `useUpdateShoppingSetting` 등).

**정정 — 경계 캐스팅 필요(위 "정정" 단락 참고):** `createShoppingSetting.ts`, `updateShoppingSetting.ts`, `getShoppingSettings.test.ts`는 `as ShoppingSetting` 한 줄 캐스팅이 각각 필요하다.

## 테스트 & 에러 처리

- 이 프로젝트 컨벤션상 Vitest 커버리지는 `src/mocks/utils/`로 한정된다(`CLAUDE.md` 명시). `buildMallSettingsPayload`는 `features/shoppingSetting/util/`에 위치하므로 UI 유틸 컨벤션을 따라 별도 테스트 파일 없이 진행한다.
- 기존 `mocks/utils/*.test.ts`(createShoppingSetting, updateShoppingSetting 등)는 로직 변경이 없어 그대로 통과 예상 — 타입 정합성은 빌드(`tsc`)로 확인한다.
- 에러 처리: `mallSettings` 필드가 전부 optional이라 별도 유효성 검증/에러 메시지가 없다. 기존 폼의 필수 필드(별칭/상품상태/판매기간) 검증 로직은 변경하지 않는다.

## 이번 라운드에서 하지 않는 것

- `Product.registeredMalls` 타입 추가 및 상품↔ShoppingSetting 결합(등록) 액션 UI — 다음 라운드.
- `shoppingSettingId` 삭제 시 정합성 처리 — `registeredMalls` 자체가 아직 없으므로 해당 없음, 다음 라운드에서 함께 다룸.
- Excel 대량등록에 `mallSettings` 반영 — 별도 판단 필요, 이번 라운드 제외.
- 제외된 몰(쿠팡/지마켓·ESM/오늘의집/무신사 등) 재조사 — 공식 Open API 문서 확보 시 별도 라운드.

## 영향받지 않는 것

- `ShoppingSettingBasicInfoSection`, `ShoppingSettingAddressSection`, 출고지/반품지 관련 코드(주소록 API 등) — 변경 없음.
- 기존 `Product` 필드(원산지/부가세유형/성인상품여부) — 변경 없음.
- 네이버/카카오가 아닌 몰의 기존 `ShoppingSetting` 데이터 — `mallSettings` optional이라 마이그레이션 불필요.
