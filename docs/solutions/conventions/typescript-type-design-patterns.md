---
title: TypeScript 피처 모듈의 타입 설계 컨벤션
date: 2026-05-30
category: conventions
module: features/account, features/shoppingSetting
problem_type: convention
component: frontend_stimulus
severity: medium
applies_when:
  - API body 타입을 베이스 엔티티에서 파생할 때
  - 동일한 유니온 타입이 두 곳 이상에서 사용될 때
  - Zod 스키마로 form 타입을 생성하고 API body에 전달할 때
  - form의 optional 필드가 API body에서 non-optional일 때
  - Select 등 빈 초기값에서 시작하는 필드를 zod로 리터럴 유니온 검증할 때
  - react-hook-form 제출부에서 zod infer 타입에 as 캐스팅이 필요해질 때
  - react-hook-form의 useForm 제네릭으로 discriminated union 도메인 타입을 그대로 쓰려고 할 때
  - discriminated union 값을 객체 spread(`{ ...value }`)로 복사/병합해야 할 때
  - 여러 하위 타입에 공통되는 필드명들을 별도 리터럴 유니온으로 나열할지 고민될 때
tags:
  - typescript
  - interface-composition
  - zod
  - form-type
  - named-type
  - omit
  - convention
  - react-hook-form
  - refine
  - discriminated-union
  - keyof
  - type-narrowing
---

# TypeScript 피처 모듈의 타입 설계 컨벤션

## Context

사용자 등록 페이지(`features/account/ui/user/create`) 구현 중 코드 리뷰에서 네 가지 타입 설계 패턴이 식별되었다. 초기 구현에서 `CreateUserBody`가 `User` 필드를 수동으로 나열했고, 유니온 타입이 두 인터페이스에 중복되었으며, form 타입과 API body 타입이 명시적으로 분리되지 않았고, optional 필드 강제 변환이 잘못된 레이어에 위치했다.

## Guidance

### 1. `extends Omit<Base, 'excluded'>` 로 인터페이스 재사용

새 인터페이스가 기존 인터페이스의 필드를 대부분 공유하면 필드를 수동으로 나열하지 말고 `extends Omit`으로 파생한다. `Base` 인터페이스에 필드가 추가될 때 자동으로 전파된다.

**Before:**
```typescript
interface CreateUserBody {
  email: string;
  name: string;
  phone: string;
  grade: UserGrade;
  avatar: string;
  bio: string;
  password: string;
  status: UserStatus;
  // company, location 의도적 제외
}
```

**After:**
```typescript
interface CreateUserBody extends Omit<User, 'company' | 'location'> {
  password: string;
  status: UserStatus;
}
```

### 2. 유니온 타입이 2회 이상 등장하면 즉시 named type으로 추출

동일한 유니온 리터럴이 두 개 이상의 인터페이스에 나타나는 순간 named type으로 추출한다. 세 번째 등장을 기다리지 않는다.

**Before:**
```typescript
interface AccountUser extends User {
  status: 'active' | 'pending';
}
interface CreateUserBody {
  status: 'active' | 'pending';
}
```

**After:**
```typescript
export type UserStatus = 'active' | 'pending';

interface AccountUser extends User {
  status: UserStatus;
}
interface CreateUserBody extends Omit<User, 'company' | 'location'> {
  status: UserStatus;  // 또는 Omit 상속으로 자동 포함
}
```

### 3. Form 타입(Zod infer)과 API body 타입을 분리

Zod 스키마로 생성한 form 타입(`z.infer<typeof schema>`)에 서버 전용 필드(`status`, `createdAt` 등)를 포함하지 않는다. Layout이 form 데이터에 서버 전용 필드를 추가하여 완전한 API body를 조립한다.

```typescript
// UserCreateForm.tsx — form 타입: 사용자 입력만 포함
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  grade: z.enum(['admin', 'operator']), // SubUserGrade — super_admin은 가입 시에만 부여
  name: z.string().min(1),
  phone: z.string().min(1),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  // status 없음 — 서버 전용 필드
});
export type CreateUserFormData = z.infer<typeof createUserSchema>;

// UserCreateLayout.tsx — API body 조립 시 서버 전용 필드 추가
const body: CreateUserBody = {
  ...formData,
  status: isSuperAdmin ? 'active' : 'pending',
  avatar: formData.avatar ?? '',
  bio: formData.bio ?? '',
};
```

### 4. Optional → Required 강제 변환은 Layout 경계에서만

Zod에서 `.optional()`로 선언된 필드가 베이스 인터페이스에서 `string`이면, `?? ''` 강제 변환을 form 컴포넌트나 API 함수가 아닌 Layout 경계에서만 처리한다.

```typescript
// ✅ 올바른 위치 — UserCreateLayout.tsx
const body: CreateUserBody = {
  ...formData,
  status: 'pending',
  avatar: formData.avatar ?? '',  // optional(string | undefined) → string
  bio: formData.bio ?? '',
};

// ❌ 잘못된 위치 — UserCreateForm.tsx (form 컴포넌트)
// ❌ 잘못된 위치 — createUser.ts (API fetch 함수)
```

### 5. `Exclude<>` 로 용도 제한 서브타입 분리

유니온 타입의 일부 값이 특정 컨텍스트에서 허용되면 안 될 때, UI 레벨 제어만으로는 부족하다. `Exclude<>`로 서브타입을 분리하면 타입 레벨에서 잘못된 값 부여를 차단한다.

**Before:**
```typescript
// UserGrade 전체가 CreateUserBody에 그대로 흘러들어옴
interface CreateUserBody extends Omit<User, 'company' | 'location'> {
  password: string;
  status: UserStatus;
  // grade: UserGrade → super_admin 부여 가능 (의도하지 않은 허용)
}
```

**After:**
```typescript
// Auth.ts — 원본 유니온은 유지, 제한 서브타입만 추가
export type UserGrade = 'super_admin' | 'admin' | 'operator';
export type SubUserGrade = Exclude<UserGrade, 'super_admin'>; // 'admin' | 'operator'

// user.types.ts — grade 필드를 명시적으로 재정의
export interface CreateUserBody extends Omit<User, 'company' | 'location' | 'grade'> {
  password: string;
  status: UserStatus;
  grade: SubUserGrade; // 컴파일 타임에 super_admin 차단
}
```

원본 `UserGrade`는 세션·프로필 표시 등 전체 값이 필요한 곳에서 그대로 사용하고, 등록 폼처럼 제한이 필요한 경계에서만 `SubUserGrade`를 쓴다.

### 6. Zod `refine` 타입가드 + react-hook-form 3-제네릭으로 폼 제출부 `as` 캐스팅 제거

Select 같은 "미선택 초기값(빈 문자열)"이 있는 필드를 특정 리터럴 유니온(`ShoppingMalls` 등)으로 검증할 때, `z.string().min(1, ...)`만 쓰면 스키마 출력 타입이 `string`으로 느슨해져서 제출부(API body 조립 시점)에서 `as SomeUnion` 강제 캐스팅이 필요해진다.

**Before:**
```typescript
const schema = z.object({
  mallCode: z.string().min(1, '쇼핑몰을 선택해주세요.'),
});
export type FormData = z.infer<typeof schema>; // mallCode: string

// 제출부
const body: CreateBody = {
  mallCode: data.mallCode as CreateBody['mallCode'], // 강제 캐스팅
};
```

`z.string().refine()`에 **타입가드 시그니처**(`(val): val is X => ...`)를 주면, zod가 해당 필드의 `z.output` 타입을 `X`로 좁혀준다(zod 3.x의 `refine<RefinedOutput extends Output>(check: (arg: Output) => arg is RefinedOutput, ...)` 오버로드). 다만 그러면 `z.infer`(= `z.output`)의 `mallCode`가 `X`가 되어, Select의 빈 문자열 초기값(`''`)을 `defaultValues`에 넣을 수 없게 된다. 이때 `z.input`(변환 전 타입, 여전히 `string`)과 `z.output`(좁혀진 타입)을 분리하고, react-hook-form의 3-제네릭 `useForm<TFieldValues, TContext, TTransformedValues>`로 "폼 내부 상태 타입"과 "제출 시 받는 타입"을 다르게 지정한다.

**After:**
```typescript
const MALL_CODES: string[] = SHOPPING_MALLS.map((mall) => mall.code);

const schema = z.object({
  mallCode: z
    .string()
    .min(1, '쇼핑몰을 선택해주세요.')
    .refine((val): val is ShoppingMalls => MALL_CODES.includes(val), {
      message: '유효하지 않은 쇼핑몰입니다.',
    }),
});

export type FormInput = z.input<typeof schema>;   // mallCode: string (Select 초기값 '' 허용)
export type FormData = z.output<typeof schema>;   // mallCode: ShoppingMalls (제출 시 타입)

const form = useForm<FormInput, unknown, FormData>({
  resolver: zodResolver(schema),
  defaultValues: { mallCode: '', /* ... */ },
});

// onSubmit(data: FormData)에서 data.mallCode는 이미 ShoppingMalls — 캐스팅 불필요
const body: CreateBody = { mallCode: data.mallCode };
```

`MALL_CODES`를 `string[]`이 아니라 `ShoppingMalls[]`로 타입 지정하지 않아도 된다 — `refine`의 반환 타입 시그니처(`val is ShoppingMalls`) 자체가 좁히는 근거이고, `.includes(val)` 비교는 `string`끼리라 타입 불일치가 없다.

### 7. react-hook-form과 discriminated union 도메인 타입을 함께 쓸 때는 별도 flat FormValues 타입을 둔다

도메인 타입을 `mallCode` 같은 판별 필드 기준 discriminated union으로 설계했다고 해서, 그 타입을 그대로 `useForm<T>()`의 제네릭으로 쓰면 안 된다. react-hook-form의 `register`/`Controller`/`watch`의 필드 경로 타입(`Path<T>`)은 union 타입 전체에 걸쳐 안전하게 추론되도록 설계되지 않았고, 특히 `reset()`/제출 시점의 객체 생성에서 실제로 타입 에러가 난다(아래 Pattern 8 참고).

**Before (컴파일 에러 유발):**
```typescript
export type ShoppingSetting =
  | (ShoppingSettingBase & { mallCode: 'NSST'; mallSettings?: NaverSettingAttributes })
  | (ShoppingSettingBase & { mallCode: 'KAKAOS'; mallSettings?: KakaoSettingAttributes })
  | (ShoppingSettingBase & { mallCode: Exclude<ShoppingMalls, 'NSST' | 'KAKAOS'>; mallSettings?: never });

const formData = useForm<ShoppingSetting>(); // reset()/onSubmit 구성에서 타입 에러
```

**After:** 폼 전용 flat 타입을 별도로 두고, `mallSettings`는 두 몰 속성 타입의 `Partial` 인터섹션으로 느슨하게 받는다. 제출 시점에만 판별 필드로 분기해 실제 discriminated union 바디를 구성한다.

```typescript
export interface ShoppingSettingFormValues extends ShoppingSettingBase {
  mallCode: ShoppingMalls;
  mallSettings?: Partial<NaverSettingAttributes & KakaoSettingAttributes>;
}

const formData = useForm<ShoppingSettingFormValues>(); // 정상 동작

// 제출부 — mallCode 리터럴 분기로 discriminated union 바디 구성 (as 캐스팅 없음)
let body: CreateShoppingSettingBody;
if (matchedAccount.mallCode === 'NSST') {
  body = { ...common, mallCode: 'NSST', mallSettings: buildMallSettingsPayload('NSST', data.mallSettings) };
} else if (matchedAccount.mallCode === 'KAKAOS') {
  body = { ...common, mallCode: 'KAKAOS', mallSettings: buildMallSettingsPayload('KAKAOS', data.mallSettings) };
} else {
  body = { ...common, mallCode: matchedAccount.mallCode };
}
```

`if/else`로 리터럴 값을 직접 나열해 분기하면(narrowing된 변수를 그대로 넘기지 않고 `'NSST'`/`'KAKAOS'` 리터럴을 직접 씀) 각 분기의 객체 리터럴이 discriminated union의 정확히 한 멤버와 구조적으로 일치해, `as` 캐스팅 없이 타입 체크를 통과한다.

### 8. discriminated union 값을 spread할 때는 상관관계가 소실된다 — 경계에서만 문서화된 as 캐스팅을 허용한다

`{ ...unionTypedValue, otherField }` 처럼 discriminated union 값을 객체 spread로 복사/병합하면, TypeScript는 결과 타입을 "각 필드 타입의 union"으로 납작하게 만들어버린다 — 판별 필드와 나머지 필드 사이의 상관관계(`mallCode: 'NSST'`일 때만 `mallSettings: NaverSettingAttributes`)가 사라진다. 그 결과 원래 유효한 값인데도 discriminated union 타입에 재할당할 수 없는 것처럼 에러가 난다.

```typescript
// mocks/utils/createShoppingSetting.ts
// spread는 discriminated union의 mallCode/mallSettings 상관관계를 지워버리므로 단언이 필요
const newSetting = {
  id: `ss_${Date.now()}`,
  ownerId,
  ...body, // body: CreateShoppingSettingBody (discriminated union)
  createdAt: now,
  updatedAt: now,
} as ShoppingSetting;
```

이런 지점에서는 `as` 캐스팅을 금지하지 않는다 — 대신 **spread 경계에 정확히 1회**, 이유를 설명하는 주석과 함께 적용한다. Pattern 6/7의 "as 캐스팅 제거" 원칙과 모순되지 않는다: 그 패턴들이 없애려는 건 "타입을 제대로 안 좁혀서 필드 접근마다 반복되는 캐스팅"이고, 여기서는 spread라는 언어 차원의 정보 손실 지점 딱 한 곳에 캐스팅을 격리한 것이다. 비즈니스 로직(폼 제출부 등)에서 같은 이유로 캐스팅이 필요하다면, 먼저 Pattern 7처럼 리터럴 분기로 재구성할 수 없는지 검토한다 — spread 캐스팅은 mock 유틸처럼 "이미 유효한 값을 그대로 복사"하는 경우로 한정한다.

### 9. 필드명 리터럴 유니온은 새로 나열하지 말고 기존 타입에서 keyof로 파생시킨다

여러 하위 컴포넌트가 공유하는 "필드명" prop을 타입 안전하게 만들고 싶을 때, 대상이 될 필드명들을 다시 나열해 별도 유니온을 만들면 원본 타입이 확장될 때마다 두 곳을 동시에 고쳐야 하는 유지보수 지점이 생긴다. 이미 그 필드들을 포함하는 타입이 존재한다면 `keyof`로 파생시켜 단일 진실 공급원을 유지한다.

**Before (유지보수 지점이 두 곳):**
```typescript
// 새 몰이 추가돼 NaverSettingAttributes & KakaoSettingAttributes & CoupangSettingAttributes로
// 확장되면, 아래 타입도 별도로 고쳐야 한다
const BooleanField = ({ name }: { name: keyof (NaverSettingAttributes & KakaoSettingAttributes) }) => { ... };
```

**After:** 이미 존재하는 폼 타입(`ShoppingSettingFormValues.mallSettings`)에서 파생시킨다. 원본 타입이 확장되면 자동으로 같이 넓어진다.
```typescript
type MallSettingsFieldName = keyof NonNullable<ShoppingSettingFormValues['mallSettings']>;

const BooleanField = ({ name, label }: { name: MallSettingsFieldName; label: string }) => { ... };
const TextField = ({ name, label }: { name: MallSettingsFieldName; label: string }) => { ... };
```

부수 효과로, 이 타입을 쓰는 컴포넌트의 JSX 호출부(`<TextField name="afterServiceContact" .../>`)에서 오타가 나면 컴파일 타임에 잡힌다 — 이전에는 `name: string`으로 느슨하게 열어뒀다면 잡히지 않았을 오류다.

## Why This Matters

- **Pattern 1 미적용**: `User`에 필드가 추가되어도 `CreateUserBody`가 자동으로 수신하지 못해 조용한 타입 불일치 발생. 컴파일러가 감지하지 못한다.
- **Pattern 2 미적용**: 새 상태 값이 추가될 때 한 인터페이스만 업데이트하면 다른 곳은 구형 유니온을 유지해 런타임에서 잘못된 값이 허용된다.
- **Pattern 3 미적용**: `status` 같은 서버 전용 필드가 form 스키마에 포함되면 UI 컴포넌트가 서버 할당 규칙을 알아야 하는 불필요한 결합이 생긴다.
- **Pattern 4 미적용**: `undefined → ''` 강제 변환이 여러 레이어에 분산되어 동작 추적이 불가능해지고, 각 레이어의 책임 경계가 흐려진다.
- **Pattern 6 미적용**: Select/드롭다운처럼 "빈 값에서 시작해 유효한 리터럴 유니온 중 하나로 확정되는" 필드의 zod 검증을 느슨하게(`z.string()`) 두면, 폼 제출부마다 `as Union` 캐스팅이 반복된다. 캐스팅은 컴파일러가 실제로는 검증하지 않는 "믿어달라"는 표시라, 필드가 늘어날수록 위험이 누적된다.
- **Pattern 7 미적용**: discriminated union 도메인 타입을 그대로 `useForm<T>()`에 넘기면 `reset()`/제출부 객체 구성에서 타입 에러가 나고, 이를 회피하려고 `as`를 남발하게 된다.
- **Pattern 8 미적용**: spread 지점에서 발생하는 타입 에러를 "원인을 모른 채" 임기응변으로 넓은 `any`/과도한 캐스팅으로 덮으면, discriminated union이 원래 보장하던 타입 안전성이 그 지점부터 새어나간다. 반대로 캐스팅을 무조건 금지하면 spread처럼 언어 차원에서 불가피한 지점까지 억지로 리터럴 분기로 풀어써야 해서 코드가 불필요하게 장황해진다.
- **Pattern 9 미적용**: 필드명 유니온을 손으로 다시 나열하면, 원본 타입(`ShoppingSettingFormValues.mallSettings` 등)이 확장될 때 그 나열도 별도로 갱신해야 한다는 걸 잊기 쉽다 — 두 타입이 조용히 어긋나도 컴파일러가 잡아주지 못한다.

## When to Apply

- API body 타입을 베이스 엔티티에서 파생할 때
- 동일한 유니온 타입이 두 곳 이상에서 사용될 때
- Zod 스키마로 form 타입을 생성하고 API body에 전달할 때
- form의 optional 필드가 API body에서 non-optional일 때
- Select 등 "빈 초기값 → 리터럴 유니온" 형태의 필드를 zod로 검증하면서 제출부의 `as` 캐스팅을 없애고 싶을 때
- react-hook-form으로 discriminated union 도메인 타입을 다루는 폼을 만들 때 (Pattern 7)
- discriminated union 값을 spread로 복사/병합해야 하는데 타입 에러가 날 때 — 무작정 캐스팅을 늘리기 전에 경계를 좁힐 수 있는지부터 확인 (Pattern 8)
- 여러 컴포넌트가 공유하는 "필드명" 타입을 만들 때 (Pattern 9)

## Examples

실제 코드 위치:
- `src/features/account/types/user.types.ts` — `UserStatus` 명명 타입, `CreateUserBody extends Omit<User, 'company' | 'location'>`
- `src/features/account/ui/user/create/UserCreateForm.tsx` — `createUserSchema`, `CreateUserFormData`
- `src/features/account/ui/user/create/UserCreateLayout.tsx` — `?? ''` 강제 변환 경계, API body 조립
- `src/features/shoppingAccount/ui/form/ShoppingAccountForm.tsx` — Pattern 6 실제 적용 (`ShoppingAccountFormInput`/`ShoppingAccountFormData`, `refine` 타입가드)
- `src/features/shoppingSetting/types/shoppingSetting.types.ts` — `ShoppingSetting` discriminated union, `ShoppingSettingFormValues`(Pattern 7)
- `src/features/shoppingSetting/ui/create/ShoppingSettingCreateLayout.tsx`, `.../[id]/ShoppingSettingModifyLayout.tsx` — Pattern 7 리터럴 분기 제출부
- `src/mocks/utils/createShoppingSetting.ts`, `src/mocks/utils/updateShoppingSetting.ts`, `src/mocks/utils/getShoppingSettings.test.ts` — Pattern 8 경계 캐스팅 실제 적용(각 파일 1회, 주석 포함)
- `src/features/shoppingSetting/ui/components/form/ShoppingSettingMallInfoSection.tsx` — Pattern 9 `MallSettingsFieldName` 실제 적용
- `src/features/shoppingAccount/ui/create/ShoppingAccountCreateLayout.tsx`, `.../modify/ShoppingAccountModifyLayout.tsx` — Pattern 6 적용으로 `as` 캐스팅 제거된 제출부

## Related

- `docs/solutions/logic-errors/selected-job-ids-not-cleared-on-search.md` — features/account 모듈의 다른 사례 (Jotai 상태 초기화)
- `docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md` — Pattern 5가 실제 적용된 사례 (SubUserGrade, ownerId 계층 구조), Pattern 6과 같은 라운드에서 처리된 `AccountUser.ownerId` non-null화
- `docs/solutions/conventions/stale-ide-diagnostics-verify-with-tsc.md` — Pattern 7~9 적용 작업(ShoppingSetting discriminated union 전환) 중에도 같은 stale diagnostic 패턴이 반복 관찰됨
- `docs/superpowers/specs/2026-07-22-shopping-setting-mall-info-fields-design.md`, `docs/superpowers/plans/2026-07-22-shopping-setting-mall-info-fields.md` — Pattern 7~9가 도출된 원 스펙/계획 문서
