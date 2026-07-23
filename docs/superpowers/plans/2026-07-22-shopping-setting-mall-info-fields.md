# ShoppingSetting 몰 고유 정보 필드 구현 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ShoppingSetting`을 `mallCode` 기준 discriminated union으로 전환하고, 네이버 스마트스토어(NSST)·카카오스토어(KAKAOS) 계정으로 등록/수정하는 화면에 "몰 고유 정보" 입력 섹션을 추가한다.

**Architecture:** `ShoppingSetting` 도메인 타입을 discriminated union으로 전환하되, RHF 폼은 별도의 flat `ShoppingSettingFormValues` 타입으로 관리하고 제출 시점에만 `mallCode`로 분기해 discriminated union 바디를 구성한다(`as` 캐스팅 없이). 몰별 서브폼은 `mallCode`에 따라 조건 렌더링되는 신규 `ShoppingSettingMallInfoSection` 컴포넌트로 구현한다.

**Tech Stack:** Next.js 15 App Router, React Hook Form(`useFormContext`/`Controller`/`register`), TypeScript strict mode, Radix `RadioGroup`.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-07-22-shopping-setting-mall-info-fields-design.md`
- 이번 라운드 범위는 `ShoppingSetting`뿐이다. `Product.registeredMalls`, 상품↔ShoppingSetting 등록 액션 UI, Excel 반영은 다루지 않는다.
- 신규 필드(`mallSettings` 하위 전체)는 모두 **optional** — `required` validation 없음.
- **`as` 캐스팅 정책:** 비즈니스 로직(폼 제출, 레이아웃 컴포넌트)에서는 `mallCode` 리터럴 분기(`if/else`)로 discriminated union을 구성하여 `as` 캐스팅을 쓰지 않는다. 단, mock 유틸의 객체 spread(`{ ...body }`)는 discriminated union의 `mallCode`↔`mallSettings` 상관관계를 구조적으로 지워버리는 TypeScript의 알려진 한계이므로, 그 경계에서만 `as ShoppingSetting` 캐스팅을 허용한다(주석으로 이유 명시). 이 설계는 본 계획 작성 전 실제 `npx tsc --noEmit`으로 검증 완료했다.
- **테스트 컨벤션(CLAUDE.md):** Vitest 커버리지는 `src/mocks/utils/`의 순수 로직에만 작성하는 컨벤션이다. 이번 작업은 타입/상수/UI 컴포넌트 + 신규 순수 유틸(`buildMallSettingsPayload`, `features/shoppingSetting/util/`에 위치 — `mocks/utils/` 밖)을 다루므로, 각 Task의 "테스트" 단계는 `npx tsc --noEmit`(타입 체크) + `npm run lint` + 수동 UI 확인으로 대체한다. 기존 `mocks/utils/*.test.ts`는 회귀 확인용으로 `npm run test`를 돌린다.
- **Git 규칙(CLAUDE.md):** 각 Task의 "커밋" 단계는 문서상의 안내이며 자동 실행하지 않는다. 실제 git 명령은 사용자가 명시적으로 요청할 때만 실행한다. 이 프로젝트는 Task별 커밋 없이 전체 작업 완료 후 Task 단위로 분리된 커밋을 제안하는 방식을 선호한다.

---

### Task 1: ShoppingSetting discriminated union 전환 (타입 + 기존 폼/목업 마이그레이션)

**Files:**
- Modify: `src/features/shoppingSetting/types/shoppingSetting.types.ts`
- Modify: `src/features/shoppingSetting/ui/components/form/ShoppingSettingBasicInfoSection.tsx`
- Modify: `src/features/shoppingSetting/ui/components/form/ShoppingSettingAddressSection.tsx`
- Modify: `src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx`
- Modify: `src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx`
- Modify: `src/mocks/utils/createShoppingSetting.ts`
- Modify: `src/mocks/utils/updateShoppingSetting.ts`
- Modify: `src/mocks/utils/getShoppingSettings.test.ts`

**Interfaces:**
- Produces: `ShoppingSetting`(discriminated union, `mallCode: 'NSST' | 'KAKAOS' | Exclude<ShoppingMalls, 'NSST'|'KAKAOS'>`), `NaverSettingAttributes`, `KakaoSettingAttributes`, `ShoppingSettingFormValues`(flat, `mallSettings?: Partial<NaverSettingAttributes & KakaoSettingAttributes>`) — Task 2~4에서 소비
- 이 Task는 새 UI 동작을 추가하지 않는다. 목표는 타입 전환 후에도 기존 화면이 그대로 동작하는 것(회귀 없음).

- [ ] **Step 1: 타입 파일 수정**

`src/features/shoppingSetting/types/shoppingSetting.types.ts`에서 기존 `export interface ShoppingSetting { ... }` 블록을 아래로 교체한다(`MallAddress` 인터페이스 등 그 외 내용은 그대로 둔다):

```typescript
interface ShoppingSettingBase {
  id: string;
  mallAccountId: string; // 참조: ShoppingAccount.id
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

export interface ShoppingSettingFormValues extends ShoppingSettingBase {
  mallCode: ShoppingMalls;
  mallSettings?: Partial<NaverSettingAttributes & KakaoSettingAttributes>;
}
```

`CreateShoppingSettingBody`/`UpdateShoppingSettingBody` 선언부(`export type CreateShoppingSettingBody = Omit<ShoppingSetting, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;` 등)는 수정하지 않는다 — union을 자동으로 상속한다.

- [ ] **Step 2: ShoppingSettingBasicInfoSection.tsx 타입 마이그레이션**

`src/features/shoppingSetting/ui/components/form/ShoppingSettingBasicInfoSection.tsx`에서:

```typescript
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
```
를
```typescript
import { ShoppingSettingFormValues } from '@/features/shoppingSetting/types/shoppingSetting.types';
```
로, 그리고
```typescript
  } = useFormContext<ShoppingSetting>();
```
를
```typescript
  } = useFormContext<ShoppingSettingFormValues>();
```
로 바꾼다.

- [ ] **Step 3: ShoppingSettingAddressSection.tsx 타입 마이그레이션**

`src/features/shoppingSetting/ui/components/form/ShoppingSettingAddressSection.tsx`에서:

```typescript
import { ShoppingSetting, MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';

interface AddressPickerFieldProps {
  name: 'shippingAddress' | 'returnAddress';
  label: string;
  mallCode: ShoppingSetting['mallCode'];
  mallId: string;
}
```
를
```typescript
import { ShoppingSettingFormValues, MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';

interface AddressPickerFieldProps {
  name: 'shippingAddress' | 'returnAddress';
  label: string;
  mallCode: ShoppingSettingFormValues['mallCode'];
  mallId: string;
}
```
로 바꾸고, 파일 내 두 곳의 `useFormContext<ShoppingSetting>()`(`AddressPickerField` 내부, `ShoppingSettingAddressSection` 내부)을 모두 `useFormContext<ShoppingSettingFormValues>()`로 바꾼다.

- [ ] **Step 4: ShoppingSettingCreateLayout.tsx 마이그레이션**

`src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx`에서 import를:

```typescript
import { ShoppingSetting, CreateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';
```
→
```typescript
import {
  ShoppingSettingFormValues,
  CreateShoppingSettingBody,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
```

`const formData = useForm<ShoppingSetting>();`를 `const formData = useForm<ShoppingSettingFormValues>();`로 바꾼다.

`onSubmit` 함수 전체를 아래로 교체한다:

```typescript
  const onSubmit = (data: ShoppingSettingFormValues) => {
    if (!matchedAccount) return;
    const common = {
      mallAccountId: matchedAccount.id,
      mallId: matchedAccount.mallId,
      nickname: data.nickname,
      isActive: true as const,
      productCondition: data.productCondition,
      salesPeriod: data.salesPeriod,
      shippingAddress: data.shippingAddress,
      returnAddress: data.returnAddress,
    };
    let body: CreateShoppingSettingBody;
    if (matchedAccount.mallCode === 'NSST') {
      body = { ...common, mallCode: 'NSST' };
    } else if (matchedAccount.mallCode === 'KAKAOS') {
      body = { ...common, mallCode: 'KAKAOS' };
    } else {
      body = { ...common, mallCode: matchedAccount.mallCode };
    }
    createSetting(body, {
      onSuccess: () => {
        showAlert({
          message: '설정이 등록되었습니다.',
          type: 'success',
          onConfirm: () => router.push('/shopping/settings'),
        });
      },
    });
  };
```

(`mallSettings` 페이로드 구성은 Task 4에서 이어서 추가한다 — 이 Task에서는 타입 마이그레이션만 완료한다.)

- [ ] **Step 5: ShoppingSettingModifyLayout.tsx 마이그레이션**

`src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx`에서 import를:

```typescript
import { ShoppingSetting, UpdateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';
```
→
```typescript
import {
  ShoppingSettingFormValues,
  UpdateShoppingSettingBody,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
```

`const formData = useForm<ShoppingSetting>();`를 `const formData = useForm<ShoppingSettingFormValues>();`로, `const onSubmit = (data: ShoppingSetting) => {`를 `const onSubmit = (data: ShoppingSettingFormValues) => {`로 바꾼다. `onSubmit` 내부의 `body` 구성 로직은 그대로 둔다(이 Task에서는 변경 없음, Task 4에서 `mallSettings` 추가).

- [ ] **Step 6: mock 유틸 3개 파일에 `as ShoppingSetting` 경계 캐스팅 추가**

`src/mocks/utils/createShoppingSetting.ts`에서:

```typescript
  const newSetting: ShoppingSetting = {
    id: `ss_${Date.now()}`,
    ownerId,
    ...body,
    createdAt: now,
    updatedAt: now,
  };
```
를
```typescript
  // spread는 discriminated union의 mallCode/mallSettings 상관관계를 지워버리므로 단언이 필요
  const newSetting = {
    id: `ss_${Date.now()}`,
    ownerId,
    ...body,
    createdAt: now,
    updatedAt: now,
  } as ShoppingSetting;
```
로 바꾼다.

`src/mocks/utils/updateShoppingSetting.ts`에서:

```typescript
  MOCK_SHOPPING_SETTINGS_DATA[index] = {
    ...MOCK_SHOPPING_SETTINGS_DATA[index],
    ...body,
    ownerId: MOCK_SHOPPING_SETTINGS_DATA[index].ownerId,
    updatedAt: dayjs().format('YYYY-MM-DD'),
  };
```
를
```typescript
  // spread는 discriminated union의 mallCode/mallSettings 상관관계를 지워버리므로 단언이 필요
  MOCK_SHOPPING_SETTINGS_DATA[index] = {
    ...MOCK_SHOPPING_SETTINGS_DATA[index],
    ...body,
    ownerId: MOCK_SHOPPING_SETTINGS_DATA[index].ownerId,
    updatedAt: dayjs().format('YYYY-MM-DD'),
  } as ShoppingSetting;
```
로 바꾼다.

`src/mocks/utils/getShoppingSettings.test.ts`에서:

```typescript
  const makeSetting = (overrides: Partial<ShoppingSetting>): ShoppingSetting => ({
    id: 'ss_001',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '기본 설정',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 30,
    shippingAddress: null,
    returnAddress: null,
    ownerId: 'usr_001',
    createdAt: '2025-05-01',
    updatedAt: '2025-05-01',
    ...overrides,
  });
```
를
```typescript
  // spread는 discriminated union의 mallCode/mallSettings 상관관계를 지워버리므로 단언이 필요
  const makeSetting = (overrides: Partial<ShoppingSetting>): ShoppingSetting =>
    ({
      id: 'ss_001',
      mallAccountId: 'sa_001',
      mallCode: 'COUP',
      mallId: 'coupang_seller_001',
      nickname: '기본 설정',
      isActive: true,
      productCondition: 'NEW',
      salesPeriod: 30,
      shippingAddress: null,
      returnAddress: null,
      ownerId: 'usr_001',
      createdAt: '2025-05-01',
      updatedAt: '2025-05-01',
      ...overrides,
    }) as ShoppingSetting;
```
로 바꾼다.

- [ ] **Step 7: 타입 체크 + 린트 + mocks 테스트로 검증**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: 에러 없음, 기존 `mocks/utils/*.test.ts`(특히 `getShoppingSettings.test.ts`, `createShoppingSetting.test.ts`, `updateShoppingSetting.test.ts`) 전부 PASS.

- [ ] **Step 8: 수동 UI 확인**

`npm run dev`로 개발 서버를 띄우고 `/shopping/settings`에서 임의의 기존 설정(예: 쿠팡 설정) "수정" 버튼과, "설정 추가" 모달에서 임의 계정으로 등록 화면을 열어 기존과 동일하게 동작하는지(별칭/상품상태/판매기간/출고지/반품지 입력·저장) 확인한다. 이 Task는 화면 변화가 없어야 정상이다.

- [ ] **Step 9: 커밋 (문서 안내용 — 자동 실행 금지, 사용자 요청 시에만)**

```bash
git add src/features/shoppingSetting/types/shoppingSetting.types.ts \
  src/features/shoppingSetting/ui/components/form/ShoppingSettingBasicInfoSection.tsx \
  src/features/shoppingSetting/ui/components/form/ShoppingSettingAddressSection.tsx \
  src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx \
  "src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx" \
  src/mocks/utils/createShoppingSetting.ts \
  src/mocks/utils/updateShoppingSetting.ts \
  src/mocks/utils/getShoppingSettings.test.ts
git commit -m "refactor: ShoppingSetting을 mallCode 기준 discriminated union으로 전환"
```

---

### Task 2: YES_NO_OPTIONS 상수 + buildMallSettingsPayload 유틸 생성

**Files:**
- Modify: `src/features/shoppingSetting/constant/shoppingSetting.constants.ts`
- Create: `src/features/shoppingSetting/util/buildMallSettingsPayload.ts`

**Interfaces:**
- Consumes: `NaverSettingAttributes`, `KakaoSettingAttributes`(Task 1), `ShoppingMalls`(`@/types/common.type`, 기존)
- Produces: `YES_NO_OPTIONS: FilterOption[]` — Task 3에서 소비. `buildMallSettingsPayload(mallCode, values?)` — Task 4에서 소비. 오버로드로 `mallCode: 'NSST'` → `NaverSettingAttributes | undefined`, `mallCode: 'KAKAOS'` → `KakaoSettingAttributes | undefined`, 그 외 → `undefined`를 반환한다.

- [ ] **Step 1: YES_NO_OPTIONS 상수 추가**

`src/features/shoppingSetting/constant/shoppingSetting.constants.ts`의 `SALES_PERIOD_OPTIONS` 선언 바로 뒤에 추가:

```typescript
export const YES_NO_OPTIONS: FilterOption[] = [
  { id: 'true', name: '예' },
  { id: 'false', name: '아니오' },
];
```

- [ ] **Step 2: buildMallSettingsPayload 유틸 작성**

`src/features/shoppingSetting/util/buildMallSettingsPayload.ts` 신규 생성:

```typescript
import {
  NaverSettingAttributes,
  KakaoSettingAttributes,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';

const NAVER_SETTING_KEYS: (keyof NaverSettingAttributes)[] = [
  'afterServiceContact',
  'afterServiceGuide',
  'purchaseReviewExposure',
  'logisticsCompanyId',
  'logisticsCenterId',
  'certificationInfo',
  'certificationExcludeReason',
];

const KAKAO_SETTING_KEYS: (keyof KakaoSettingAttributes)[] = [
  'certs',
  'additionalInfo',
  'shoppingHowDisplayable',
  'storeboardDisplayStatus',
];

type MallSettingsSource = Partial<NaverSettingAttributes & KakaoSettingAttributes>;

const pickDefined = <T extends MallSettingsSource, K extends keyof T>(source: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (source[key] !== undefined && source[key] !== '') {
      result[key] = source[key];
    }
  });
  return result;
};

export function buildMallSettingsPayload(
  mallCode: 'NSST',
  values?: MallSettingsSource,
): NaverSettingAttributes | undefined;
export function buildMallSettingsPayload(
  mallCode: 'KAKAOS',
  values?: MallSettingsSource,
): KakaoSettingAttributes | undefined;
export function buildMallSettingsPayload(
  mallCode: Exclude<ShoppingMalls, 'NSST' | 'KAKAOS'>,
  values?: MallSettingsSource,
): undefined;
export function buildMallSettingsPayload(
  mallCode: ShoppingMalls,
  values?: MallSettingsSource,
): NaverSettingAttributes | KakaoSettingAttributes | undefined {
  if (!values) return undefined;
  if (mallCode === 'NSST') return pickDefined(values, NAVER_SETTING_KEYS);
  if (mallCode === 'KAKAOS') return pickDefined(values, KAKAO_SETTING_KEYS);
  return undefined;
}
```

- [ ] **Step 3: 타입 체크 + 린트로 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 (이 Task는 아직 아무 파일에서도 `buildMallSettingsPayload`/`YES_NO_OPTIONS`를 사용하지 않으므로 미사용 export 경고는 없음 — export된 함수/상수는 lint의 no-unused-vars 대상이 아니다)

- [ ] **Step 4: 커밋 (문서 안내용 — 자동 실행 금지)**

```bash
git add src/features/shoppingSetting/constant/shoppingSetting.constants.ts \
  src/features/shoppingSetting/util/buildMallSettingsPayload.ts
git commit -m "feat: 몰별 설정 페이로드 변환 유틸 및 YES_NO_OPTIONS 상수 추가"
```

---

### Task 3: ShoppingSettingMallInfoSection 컴포넌트 생성 + 폼 조립

**Files:**
- Create: `src/features/shoppingSetting/ui/components/form/ShoppingSettingMallInfoSection.tsx`
- Modify: `src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx`

**Interfaces:**
- Consumes: `ShoppingSettingFormValues`(Task 1), `YES_NO_OPTIONS`(Task 2)
- Produces: `ShoppingSettingMallInfoSection` 컴포넌트(named export) — `ShoppingSettingForm.tsx`에 조립. `mallCode`가 `'NSST'`/`'KAKAOS'`가 아니면 `null`을 반환해 카드 자체를 렌더링하지 않는다.

- [ ] **Step 1: ShoppingSettingMallInfoSection.tsx 작성**

```typescript
'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShoppingSettingFormValues } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { YES_NO_OPTIONS } from '@/features/shoppingSetting/constant/shoppingSetting.constants';

type MallSettingsFieldName = keyof NonNullable<ShoppingSettingFormValues['mallSettings']>;

const BooleanField = ({ name, label }: { name: MallSettingsFieldName; label: string }) => {
  const { control } = useFormContext<ShoppingSettingFormValues>();

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        name={`mallSettings.${name}` as 'mallSettings.purchaseReviewExposure'}
        control={control}
        render={({ field }) => (
          <RadioGroup
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            onValueChange={(val) => field.onChange(val === 'true')}
            className="flex gap-6"
          >
            {YES_NO_OPTIONS.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <RadioGroupItem value={option.id} id={`${name}-${option.id}`} />
                <Label htmlFor={`${name}-${option.id}`}>{option.name}</Label>
              </div>
            ))}
          </RadioGroup>
        )}
      />
    </div>
  );
};

const TextField = ({ name, label }: { name: MallSettingsFieldName; label: string }) => {
  const { register } = useFormContext<ShoppingSettingFormValues>();

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        placeholder={`${label}을(를) 입력하세요.`}
        {...register(`mallSettings.${name}` as 'mallSettings.certs')}
      />
    </div>
  );
};

const TextareaField = ({ name, label }: { name: MallSettingsFieldName; label: string }) => {
  const { register } = useFormContext<ShoppingSettingFormValues>();

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        placeholder={`${label}을(를) 입력하세요.`}
        {...register(`mallSettings.${name}` as 'mallSettings.afterServiceGuide')}
      />
    </div>
  );
};

const NaverMallSettingsFields = () => (
  <>
    <TextField name="afterServiceContact" label="A/S 전화번호" />
    <TextareaField name="afterServiceGuide" label="A/S 안내문구" />
    <BooleanField name="purchaseReviewExposure" label="구매평 노출" />
    <TextField name="logisticsCompanyId" label="풀필먼트 물류사 ID" />
    <TextField name="logisticsCenterId" label="풀필먼트 물류센터 ID" />
    <TextField name="certificationInfo" label="인증정보" />
    <TextField name="certificationExcludeReason" label="인증 예외처리 사유" />
  </>
);

const KakaoMallSettingsFields = () => (
  <>
    <TextField name="certs" label="인증정보" />
    <TextField name="additionalInfo" label="부가정보" />
    <BooleanField name="shoppingHowDisplayable" label="쇼핑하우 전시여부" />
    <TextField name="storeboardDisplayStatus" label="스토어보드 전시상태" />
  </>
);

export const ShoppingSettingMallInfoSection = () => {
  const { watch } = useFormContext<ShoppingSettingFormValues>();
  const mallCode = watch('mallCode');

  if (mallCode !== 'NSST' && mallCode !== 'KAKAOS') {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">몰 고유 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {mallCode === 'NSST' ? <NaverMallSettingsFields /> : <KakaoMallSettingsFields />}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: ShoppingSettingForm.tsx에 조립**

`src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx`에서 import 추가:

```typescript
import { ShoppingSettingMallInfoSection } from './form/ShoppingSettingMallInfoSection';
```

`<ShoppingSettingAddressSection />` 바로 아래에 추가:

```tsx
      <ShoppingSettingBasicInfoSection />
      <ShoppingSettingAddressSection />
      <ShoppingSettingMallInfoSection />
```

- [ ] **Step 3: 타입 체크 + 린트로 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 수동 UI 확인**

`npm run dev`로 개발 서버를 띄우고:
1. `/shopping/settings`에서 네이버 계정으로 신규 등록 화면(`/shopping/settings/create?mallCode=NSST&mallId=...`)을 열어 "몰 고유 정보" 카드가 보이고 7개 필드(A/S 전화번호·안내문구·구매평 노출·물류사 ID·물류센터 ID·인증정보·인증 예외처리 사유)가 입력 가능한지 확인.
2. 카카오 계정으로 동일하게 열어 4개 필드(인증정보·부가정보·쇼핑하우 전시여부·스토어보드 전시상태)가 보이는지 확인.
3. 쿠팡 등 다른 몰 계정으로 열어 "몰 고유 정보" 카드 자체가 보이지 않는지 확인.

(이 시점에서는 입력한 값이 제출 시 저장되지 않는다 — Task 4에서 연결한다.)

- [ ] **Step 5: 커밋 (문서 안내용 — 자동 실행 금지)**

```bash
git add src/features/shoppingSetting/ui/components/form/ShoppingSettingMallInfoSection.tsx \
  src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx
git commit -m "feat: ShoppingSetting 폼에 몰 고유 정보 섹션 추가"
```

---

### Task 4: 제출 로직에 mallSettings 페이로드 연결

**Files:**
- Modify: `src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx`
- Modify: `src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx`

**Interfaces:**
- Consumes: `buildMallSettingsPayload`(Task 2)
- Produces: 등록/수정 API 바디에 `mallSettings`가 포함됨(네이버/카카오 계정인 경우)

- [ ] **Step 1: ShoppingSettingCreateLayout.tsx onSubmit에 mallSettings 추가**

`src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx`에서 import 추가:

```typescript
import { buildMallSettingsPayload } from '@/features/shoppingSetting/util/buildMallSettingsPayload';
```

`onSubmit`의 분기 로직을 아래로 교체한다:

```typescript
    let body: CreateShoppingSettingBody;
    if (matchedAccount.mallCode === 'NSST') {
      body = { ...common, mallCode: 'NSST', mallSettings: buildMallSettingsPayload('NSST', data.mallSettings) };
    } else if (matchedAccount.mallCode === 'KAKAOS') {
      body = { ...common, mallCode: 'KAKAOS', mallSettings: buildMallSettingsPayload('KAKAOS', data.mallSettings) };
    } else {
      body = { ...common, mallCode: matchedAccount.mallCode };
    }
```

- [ ] **Step 2: ShoppingSettingModifyLayout.tsx onSubmit에 mallSettings 추가**

`src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx`에서 import 추가:

```typescript
import { buildMallSettingsPayload } from '@/features/shoppingSetting/util/buildMallSettingsPayload';
```

`onSubmit` 함수 전체를 아래로 교체한다:

```typescript
  const onSubmit = (data: ShoppingSettingFormValues) => {
    const common = {
      nickname: data.nickname,
      productCondition: data.productCondition,
      salesPeriod: data.salesPeriod,
      shippingAddress: data.shippingAddress,
      returnAddress: data.returnAddress,
    };
    let body: UpdateShoppingSettingBody;
    if (data.mallCode === 'NSST') {
      body = { ...common, mallSettings: buildMallSettingsPayload('NSST', data.mallSettings) };
    } else if (data.mallCode === 'KAKAOS') {
      body = { ...common, mallSettings: buildMallSettingsPayload('KAKAOS', data.mallSettings) };
    } else {
      body = common;
    }
    updateSetting(body, {
      onSuccess: () => {
        showAlert({
          message: '설정이 수정되었습니다.',
          type: 'success',
          onConfirm: () => router.push('/shopping/settings'),
        });
      },
    });
  };
```

- [ ] **Step 3: 타입 체크 + 린트로 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 수동 UI 확인**

`npm run dev`로 개발 서버를 띄우고:
1. 네이버 계정으로 신규 등록 → "몰 고유 정보" 필드 일부 입력 → 등록 → 목록에서 방금 등록한 설정의 "수정" 화면을 다시 열어 입력한 값이 그대로 채워져 있는지 확인.
2. 카카오 계정도 동일하게 확인.
3. 값을 비운 채(전부 optional) 등록/수정해도 에러 없이 저장되는지 확인.

- [ ] **Step 5: 커밋 (문서 안내용 — 자동 실행 금지)**

```bash
git add src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx \
  "src/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout.tsx"
git commit -m "feat: ShoppingSetting 등록/수정 제출 시 몰 고유 정보 저장"
```

---

### Task 5: Mock 데이터에 예시 mallSettings 채우기 + 최종 QA

**Files:**
- Modify: `src/mocks/data/MockShoppingSettingsData.ts`

**Interfaces:**
- Consumes: `NaverSettingAttributes`, `KakaoSettingAttributes`(Task 1) — 직접 import는 불필요, 기존 `ShoppingSetting[]` 배열 리터럴에 필드만 추가

- [ ] **Step 1: 네이버 mock 엔트리에 mallSettings 값 채우기**

`src/mocks/data/MockShoppingSettingsData.ts`를 확인한 결과 `mallCode: 'NSST'` 엔트리는 `id: 'ss_003'` 하나뿐이고, `mallCode: 'KAKAOS'` 엔트리는 존재하지 않는다(현재 4건: `ss_001`/`ss_002`는 `COUP`, `ss_003`은 `NSST`, `ss_004`는 `GMK`). 이번 Step은 `ss_003`에만 `mallSettings`를 추가한다(카카오 mock 데이터 신규 추가는 범위 밖).

`ss_003` 엔트리를:

```typescript
  {
    id: 'ss_003',
    mallAccountId: 'sa_002',
    mallCode: 'NSST',
    mallId: 'naver_store_002',
    nickname: '네이버 기본 설정',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 60,
    shippingAddress: null,
    returnAddress: null,
    ownerId: 'usr_2f20748f',
    createdAt: '2025-05-15',
    updatedAt: '2025-05-15',
  },
```

아래로 교체한다:

```typescript
  {
    id: 'ss_003',
    mallAccountId: 'sa_002',
    mallCode: 'NSST',
    mallId: 'naver_store_002',
    nickname: '네이버 기본 설정',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 60,
    shippingAddress: null,
    returnAddress: null,
    mallSettings: {
      afterServiceContact: '1588-0000',
      purchaseReviewExposure: true,
      certificationInfo: 'KC-2026-001',
    },
    ownerId: 'usr_2f20748f',
    createdAt: '2025-05-15',
    updatedAt: '2025-05-15',
  },
```

- [ ] **Step 2: 타입 체크 + 린트 + 전체 테스트로 검증**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: 에러 없음, 전체 테스트 PASS

- [ ] **Step 3: 최종 수동 QA**

`npm run dev`로 개발 서버를 띄우고 `/shopping/settings`에서 `ss_003`(네이버 기본 설정) "수정" 화면을 열어 "몰 고유 정보" 카드에 A/S 전화번호(`1588-0000`)/구매평 노출(예)/인증정보(`KC-2026-001`)가 미리 채워져 있는지 확인한다.

- [ ] **Step 4: 커밋 (문서 안내용 — 자동 실행 금지)**

```bash
git add src/mocks/data/MockShoppingSettingsData.ts
git commit -m "test: ShoppingSetting mock 데이터에 몰 고유 정보 예시 추가"
```
