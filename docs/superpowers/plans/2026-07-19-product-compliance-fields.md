# 상품 규정 정보 필드 추가 + ShoppingSetting 플레이스홀더 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Product 도메인에 원산지/부가세유형/성인상품여부 3개 규정 정보 필드를 추가해 상품 등록/수정 폼에 노출하고, 더 이상 채울 내용이 없어진 `ShoppingSetting`의 "쇼핑몰별 필드" 플레이스홀더 섹션을 제거한다.

**Architecture:** 기존 `Product` 타입에 optional 필드 3개 추가 → 전용 상수 파일(`compliance.constants.ts`) → 신규 폼 섹션 컴포넌트(`ProductComplianceSection`)를 기존 `ProductForm`에 조립 → `ShoppingSettingMallFieldSection` 삭제.

**Tech Stack:** Next.js 15 App Router, React Hook Form(`useFormContext`/`Controller`), Radix `RadioGroup`/`Select`, TypeScript strict mode.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-07-19-product-compliance-fields-design.md`
- 신규 필드(`originCountryCode`/`originCountryEtc`/`taxType`/`isAdultProduct`)는 전부 **optional** — 필수 검증(`rules.required`) 없음
- 원산지는 "국내/수입 라디오 + 조건부 국가 드롭다운" 대신, `대한민국`을 포함한 국가 드롭다운(`ORIGIN_COUNTRIES`) 하나만 항상 노출하는 구조로 단순화한다 (2026-07-19 설계 변경). `OriginType` 타입은 만들지 않는다.
- 인증정보(KC) 관련 필드는 추가하지 않음 (기존 `informationDisclosure.fields.kc`로 처리)
- `FilterOption` 타입은 `@/types/common.type`의 기존 타입을 재사용, 신규 타입 정의 금지
- **테스트 컨벤션(CLAUDE.md):** 이 프로젝트는 `src/mocks/utils/`의 순수 로직에만 Vitest 테스트를 작성하는 컨벤션이다. 이번 작업은 타입/상수/UI 컴포넌트만 다루고 순수 로직 함수를 추가하지 않으므로, 각 Task의 "테스트" 단계는 `npx tsc --noEmit`(타입 체크) + `npm run lint` + 수동 UI 확인으로 대체한다. 가짜 테스트 파일을 만들지 않는다.
- **Git 규칙(CLAUDE.md):** 각 Task의 "커밋" 단계는 문서상의 안내이며 자동 실행하지 않는다. 실제 git 명령은 사용자가 명시적으로 요청할 때만 실행한다. 이 프로젝트는 Task별 커밋 없이 전체 작업 완료 후 Task 단위로 분리된 커밋을 제안하는 방식을 선호한다.

---

### Task 1: Product 타입에 규정 정보 필드 추가

**Files:**
- Modify: `src/features/products/types/product.types.ts`

**Interfaces:**
- Produces: `TaxType`(`'TAXABLE' | 'TAX_FREE' | 'ZERO_RATED'`) 타입과 `Product.originCountryCode?: string`, `Product.originCountryEtc?: string`, `Product.taxType?: TaxType`, `Product.isAdultProduct?: boolean` 필드 — Task 3(컴포넌트)에서 소비

- [ ] **Step 1: Product 인터페이스에 필드 추가**

`src/features/products/types/product.types.ts`의 `export interface Product { ... }` 선언 바로 앞에 아래 타입을 추가하고, `Product` 인터페이스 내부에 4개 필드를 추가한다.

```ts
export type TaxType = 'TAXABLE' | 'TAX_FREE' | 'ZERO_RATED'; // 과세/면세/영세

export interface Product {
  productId: string;
  customerCode?: string;
  name: string;
  categoryId: string;
  netPrice?: number;
  price: number;
  state: ProductStateType;
  deliveryType: string;
  deliveryPrice: number;
  mainImage: string | File;
  detailPage: string;
  option?: OptionCombination[];
  totalQuantity: number;
  subOption?: OptionCombination[];
  keyWords?: string[];
  createDate: Date;
  updateDate: Date;
  informationDisclosure: ProductInformationDisclosure;
  ownerId: string;
  originCountryCode?: string; // ORIGIN_COUNTRIES 코드('KR' 포함) 또는 'ETC'
  originCountryEtc?: string; // originCountryCode === 'ETC'일 때만 사용하는 자유텍스트
  taxType?: TaxType;
  isAdultProduct?: boolean;
}
```

(파일의 나머지 타입 선언 `ProductSaleState`, `ProductStateType` 등은 그대로 둔다.)

- [ ] **Step 2: 타입 체크로 검증**

Run: `npx tsc --noEmit`
Expected: 기존에 있던 에러 외에 새로운 타입 에러 없음 (0 errors 또는 이 변경과 무관한 기존 에러만 남음)

- [ ] **Step 3: 커밋 (문서 안내용 — 자동 실행 금지, 사용자 요청 시에만)**

```bash
git add src/features/products/types/product.types.ts
git commit -m "feat: Product에 원산지코드/부가세유형/성인상품여부 필드 추가"
```

---

### Task 2: 규정 정보 상수 파일 생성

**Files:**
- Create: `src/features/products/constant/compliance.constants.ts`

**Interfaces:**
- Consumes: `FilterOption` (`@/types/common.type`, 기존 타입 — `{ id: string; name: string }`)
- Produces: `ORIGIN_COUNTRIES`, `TAX_TYPE_OPTIONS`, `ADULT_PRODUCT_OPTIONS` (모두 `FilterOption[]`) — Task 3에서 소비

- [ ] **Step 1: 상수 파일 작성**

```ts
import { FilterOption } from '@/types/common.type';

export const ORIGIN_COUNTRIES: FilterOption[] = [
  { id: 'KR', name: '대한민국' },
  { id: 'CN', name: '중국' },
  { id: 'VN', name: '베트남' },
  { id: 'US', name: '미국' },
  { id: 'JP', name: '일본' },
  { id: 'IT', name: '이탈리아' },
  { id: 'FR', name: '프랑스' },
  { id: 'DE', name: '독일' },
  { id: 'GB', name: '영국' },
  { id: 'TH', name: '태국' },
  { id: 'ID', name: '인도네시아' },
  { id: 'IN', name: '인도' },
  { id: 'ETC', name: '기타' },
];

export const TAX_TYPE_OPTIONS: FilterOption[] = [
  { id: 'TAXABLE', name: '과세' },
  { id: 'TAX_FREE', name: '면세' },
  { id: 'ZERO_RATED', name: '영세' },
];

export const ADULT_PRODUCT_OPTIONS: FilterOption[] = [
  { id: 'false', name: '일반상품' },
  { id: 'true', name: '성인상품' },
];
```

- [ ] **Step 2: 타입 체크 + 린트로 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 커밋 (문서 안내용 — 자동 실행 금지)**

```bash
git add src/features/products/constant/compliance.constants.ts
git commit -m "feat: 상품 규정 정보 옵션 상수 추가"
```

---

### Task 3: ProductComplianceSection 컴포넌트 생성

**Files:**
- Create: `src/features/products/ui/components/form/ProductComplianceSection.tsx`

**Interfaces:**
- Consumes:
  - `Product` 타입 (Task 1) — `useFormContext<Product>()`로 폼 컨텍스트 접근
  - `ORIGIN_COUNTRIES`, `TAX_TYPE_OPTIONS`, `ADULT_PRODUCT_OPTIONS` (Task 2)
  - `FilterSelect` (`@/components/common/FilterSelect`, 기존 컴포넌트, props: `label/value/onValueChange/options/placeholder/divClassName/triggerClassName`)
  - `RadioGroup`/`RadioGroupItem` (`@/components/ui/radio-group`), `Input`/`Label`/`Card*` (`@/components/ui/*`)
- Produces: `ProductComplianceSection` 컴포넌트 (named export) — Task 4에서 `ProductForm.tsx`에 조립

- [ ] **Step 1: 컴포넌트 작성**

```tsx
'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Product } from '@/features/products/types/product.types';
import {
  ORIGIN_COUNTRIES,
  TAX_TYPE_OPTIONS,
  ADULT_PRODUCT_OPTIONS,
} from '@/features/products/constant/compliance.constants';

export const ProductComplianceSection = () => {
  const { register, control, watch } = useFormContext<Product>();

  const originCountryCode = watch('originCountryCode');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">규정 정보</CardTitle>
            <CardDescription className="mt-0.5">원산지, 부가세유형, 성인상품여부를 입력하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="originCountryCode"
            control={control}
            render={({ field }) => (
              <FilterSelect
                label="원산지"
                divClassName="space-y-2"
                triggerClassName="w-full"
                value={field.value ?? ''}
                onValueChange={field.onChange}
                options={ORIGIN_COUNTRIES}
                placeholder="원산지를 선택하세요."
              />
            )}
          />

          {originCountryCode === 'ETC' && (
            <div className="space-y-2">
              <Label htmlFor="originCountryEtc">원산지 (기타)</Label>
              <Input id="originCountryEtc" placeholder="원산지를 입력하세요." {...register('originCountryEtc')} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>부가세유형</Label>
          <Controller
            name="taxType"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className="flex gap-6">
                {TAX_TYPE_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`taxType-${option.id}`} />
                    <Label htmlFor={`taxType-${option.id}`}>{option.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>성인상품여부</Label>
          <Controller
            name="isAdultProduct"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value === undefined ? '' : String(field.value)}
                onValueChange={(value) => field.onChange(value === 'true')}
                className="flex gap-6"
              >
                {ADULT_PRODUCT_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`isAdultProduct-${option.id}`} />
                    <Label htmlFor={`isAdultProduct-${option.id}`}>{option.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: 타입 체크 + 린트로 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 (이 시점에는 아직 어디에서도 import되지 않으므로 미사용 경고만 없으면 됨)

- [ ] **Step 3: 커밋 (문서 안내용 — 자동 실행 금지)**

```bash
git add src/features/products/ui/components/form/ProductComplianceSection.tsx
git commit -m "feat: ProductComplianceSection 컴포넌트 추가"
```

---

### Task 4: ProductForm에 조립 + 수동 검증

**Files:**
- Modify: `src/features/products/ui/components/ProductForm.tsx`

**Interfaces:**
- Consumes: `ProductComplianceSection` (Task 3)

- [ ] **Step 1: import 및 렌더링 추가**

`src/features/products/ui/components/ProductForm.tsx` 수정:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { ProductBasicinfo } from './form/ProductBasicInfo';
import { ProductPriceAndQuantityInfo } from './form/ProductPriceAndQuantityInfo';
import { ProductOptionSection } from './options/ProductOptionSection';
import { ProductMainImageInfo } from './form/ProductMainImageInfo';
import { ProductDetailInfo } from './form/ProductDetailInfo';
import { ProductInformationDisclosureSection } from './productDisclosure/ProductInformationDisclosureSection';
import { ProductComplianceSection } from './form/ProductComplianceSection';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export const ProductForm = () => {
  const router = useRouter();

  const onBack = () => {
    router.back();
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 기본 정보 */}
        <ProductBasicinfo />
        {/* 가격 및 수량 정보 */}
        <ProductPriceAndQuantityInfo />
      </div>

      {/* 옵션 정보 및 옵션 조합 관리 (섹션 내부 포함) */}
      <ProductOptionSection />

      {/* 이미지 및 상세 정보 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 메인 이미지 */}
        <ProductMainImageInfo />
        {/* 상품 상세 설명 */}
        <ProductDetailInfo />
      </div>

      {/* 상품정보고시 */}
      <ProductInformationDisclosureSection />

      {/* 규정 정보 (원산지/부가세유형/성인상품여부) */}
      <ProductComplianceSection />

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onBack}>
          취소
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          상품 등록
        </Button>
      </div>
    </>
  );
};
```

- [ ] **Step 2: 타입 체크 + 린트로 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 수동 UI 검증**

Run: `npm run dev` 후 브라우저에서 확인:
1. `/products/create` 접속 → 상품정보고시 섹션 아래에 "규정 정보" 카드가 보이는지 확인
2. 원산지 드롭다운에 "대한민국"이 첫 번째 옵션으로 보이는지, 그 외 국가 목록도 정상 노출되는지 확인
3. 원산지에서 "기타" 선택 → 자유텍스트 Input이 추가로 나타나는지 확인, 다른 국가로 바꾸면 사라지는지 확인
4. 부가세유형(과세/면세/영세), 성인상품여부(일반상품/성인상품) 라디오가 정상 동작하는지 확인
5. 폼 제출 후 (MSW mock) 정상 등록되는지 확인 — 필드가 optional이므로 아무것도 선택하지 않아도 제출이 막히지 않아야 함
6. 기존 상품 수정 화면(`/products/[id]`)에서도 크래시 없이 정상 렌더링되는지 확인(신규 필드가 없는 기존 mock 데이터 대응)

Expected: 위 6개 항목 모두 정상 동작

- [ ] **Step 4: 커밋 (문서 안내용 — 자동 실행 금지)**

```bash
git add src/features/products/ui/components/ProductForm.tsx
git commit -m "feat: 상품 폼에 규정 정보 섹션 조립"
```

---

### Task 5: ShoppingSettingMallFieldSection 제거 + 수동 검증

**Files:**
- Delete: `src/features/shoppingSetting/ui/components/form/ShoppingSettingMallFieldSection.tsx`
- Modify: `src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx`

**Interfaces:**
- 없음 (제거 작업, 신규 인터페이스 없음)

- [ ] **Step 1: 플레이스홀더 컴포넌트 파일 삭제**

`src/features/shoppingSetting/ui/components/form/ShoppingSettingMallFieldSection.tsx` 파일을 삭제한다.

- [ ] **Step 2: ShoppingSettingForm에서 import/렌더링 제거**

`src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx`를 아래 내용으로 수정한다.

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingSettingBasicInfoSection } from './form/ShoppingSettingBasicInfoSection';
import { ShoppingSettingAddressSection } from './form/ShoppingSettingAddressSection';

interface ShoppingSettingFormProps {
  submitLabel: string;
  isSubmitting?: boolean;
}

export const ShoppingSettingForm = ({ submitLabel, isSubmitting }: ShoppingSettingFormProps) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <ShoppingSettingBasicInfoSection />
      <ShoppingSettingAddressSection />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/shopping/settings')}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: 타입 체크 + 린트로 검증**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음 (삭제된 파일을 참조하는 곳이 없어야 함)

- [ ] **Step 4: 수동 UI 검증**

Run: `npm run dev` 후 브라우저에서 확인:
1. `/shopping/settings/create` (몰 계정 선택 경로 통해 접근) 및 `/shopping/settings/[id]` 접속
2. "쇼핑몰별 필드" 카드/"준비 중입니다" 문구가 더 이상 보이지 않는지 확인
3. 공통 정보 섹션 + 출고지/반품지 섹션 + 저장/취소 버튼은 정상 노출되는지 확인
4. 등록/수정 제출이 정상 동작하는지 확인 (기존 동작에 회귀 없음)

Expected: 위 4개 항목 모두 정상 동작

- [ ] **Step 5: 커밋 (문서 안내용 — 자동 실행 금지)**

```bash
git add src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx
git rm src/features/shoppingSetting/ui/components/form/ShoppingSettingMallFieldSection.tsx
git commit -m "refactor: ShoppingSetting 쇼핑몰별 필드 플레이스홀더 제거"
```

---

## Self-Review 결과

- **스펙 커버리지:** 스펙의 1~6번 섹션 모두 Task 1~5로 매핑됨 (원산지/부가세유형/성인상품여부 → Task 1~4, ShoppingSetting 정리 → Task 5). 스펙 섹션 7(중복 점검 요약)은 별도 태스크 없이 Global Constraints에 반영, 섹션 8(비고: 테스트 컨벤션)도 Global Constraints에 반영됨.
- **Placeholder 스캔:** "TBD"/"나중에" 등 표현 없음. 모든 코드 블록이 완전한 실행 가능 코드임.
- **타입 일관성:** `TaxType`(Task 1) → `Product` 필드(Task 1, `originCountryCode`는 자유 `string`이라 `ORIGIN_COUNTRIES`의 `id` 값과 `'ETC'`를 그대로 담을 수 있음) → 상수 옵션 `id` 값(Task 2, `'TAXABLE'/'TAX_FREE'/'ZERO_RATED'`, `'true'/'false'`가 타입과 일치) → 컴포넌트에서 `field.value`/`onValueChange` 사용법(Task 3) 모두 일치 확인. `ProductComplianceSection` export 이름이 Task 3 정의와 Task 4 import 구문에서 동일함 확인. (2026-07-19: 원산지 라디오+조건부 드롭다운 구조를 단일 드롭다운(`대한민국` 포함)으로 단순화하며 `OriginType` 타입/`ORIGIN_TYPE_OPTIONS` 상수는 계획에서 제거됨 — 스펙과 동기화 완료.)
