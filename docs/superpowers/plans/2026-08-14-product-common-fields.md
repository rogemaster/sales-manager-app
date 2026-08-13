# 상품 공통 필드 추가 (브랜드·모델명·모델번호·제조업체) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Product`에 브랜드·모델명·모델번호·제조업체 4개 공통 필드를 추가하고, 상품 등록/수정과 쇼핑몰 연동상품 수정 3개 화면에서 입력받는다.

**Architecture:** 규정 정보 필드가 추가됐던 선례(`ProductComplianceSection`)를 그대로 따른다 — 타입에 optional 필드를 추가하고, 전용 폼 섹션 컴포넌트 1개를 만들어 `useFormContext<Product>()`로 바인딩한 뒤, 섹션을 나열하는 화면 2곳(`ProductForm`, `MallLinkedProductEditLayout`)에 끼워 넣는다. API·MSW 핸들러는 `Product` 전체를 spread로 다루므로 변경하지 않는다.

**Tech Stack:** Next.js 15 App Router, React Hook Form(zod 미사용), Tailwind CSS 4, shadcn/ui Card·Input·Label, MSW, faker

## Global Constraints

- **git 명령 금지.** `git add`·`git commit`·브랜치 생성 등 모든 git 작업은 사용자가 그 시점에 명시적으로 요청할 때만 실행한다. 각 Task 끝의 커밋 안내는 **문서상 안내일 뿐 자동 실행하지 않는다** (CLAUDE.md Git/PR 규칙).
- **신규 테스트 파일 없음.** 이 프로젝트는 `src/mocks/utils/`(순수 비즈니스 로직)에만 테스트를 둔다. 이번 변경은 그 디렉토리를 건드리지 않으므로 테스트 파일을 만들지 않는다. 각 Task의 검증은 `npx tsc --noEmit` → `npm run lint` → `npm run test`(기존 회귀 없음) → dev 서버 수동 확인 순서로 한다.
- **폰트 크기·폰트 색상 변경 금지** (CLAUDE.md 스타일 수정 규칙). 에러 문구의 `text-red-500 text-sm`은 기존 컴포넌트에서 그대로 복사하는 것이라 예외가 아니다.
- **타입은 4개 모두 optional(`?:`)로 선언한다.** 필수는 폼(RHF `required` rule)에서만 강제한다. non-optional로 좁히는 것은 엑셀 라운드 이후다.
- **필드 한글 라벨 고정:** `brand`→"브랜드", `manufacturer`→"제조업체", `modelName`→"모델명", `modelId`→"모델번호".
- **필수 표기:** 필수 필드 라벨은 기존 폼과 동일하게 뒤에 ` *`를 붙인다 (예: `브랜드 *`).

---

### Task 1: `Product` 타입에 4개 필드 추가 + mock 상품 데이터 채우기

**Files:**
- Modify: `src/features/products/types/product.types.ts:4-28`
- Modify: `src/mocks/data/MockProductsData.ts` (RAW_PRODUCTS 20개 객체 전부)

**Interfaces:**
- Consumes: 없음 (첫 Task)
- Produces: `Product` 인터페이스의 `brand?: string`, `manufacturer?: string`, `modelName?: string`, `modelId?: string` — Task 2·3의 폼 컴포넌트가 `register('brand')` 등으로 참조한다.

- [ ] **Step 1: `Product` 인터페이스에 필드 4개 추가**

`src/features/products/types/product.types.ts`의 `Product` 인터페이스에서 `adultProductType?: AdultProductType;` 바로 다음 줄에 추가한다.

```ts
export interface Product {
  // ...기존 필드 (productId ~ adultProductType) 그대로 유지
  taxType?: TaxType;
  adultProductType?: AdultProductType;

  /** 몰 카탈로그 매칭·검색 노출에 쓰이는 상품 공통 정보 */
  brand?: string; // 폼 필수. 카카오는 giftBrandId 키로 전송하지만 프론트는 이 필드 하나만 갖는다
  manufacturer?: string; // 폼 필수
  modelName?: string;
  modelId?: string;
}
```

`modelId`는 네이버가 숫자 ID를 쓰지만 `string`으로 둔다. 계산에 쓰지 않고 그대로 전달만 하는 값이라 앞자리 0이나 자릿수 손실 위험이 없는 쪽이 안전하다.

`CreateProductRequest`(`Omit<Product, 'productId' | 'ownerId' | 'createDate' | 'updateDate'>`)는 파생 타입이므로 **수정하지 않는다** — 자동 반영된다.

- [ ] **Step 2: 타입 추가만으로 컴파일이 깨지지 않는지 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 종료. (4개 모두 optional이라 기존 `Product` 리터럴 전부가 그대로 통과한다. 여기서 에러가 난다면 optional 표기 `?`를 빠뜨린 것이다.)

- [ ] **Step 3: mock 상품 20건에 `brand`·`manufacturer` 추가**

`src/mocks/data/MockProductsData.ts`의 `RAW_PRODUCTS` 배열에 있는 **20개 객체 전부**에 대해, 각 객체의 `updateDate: new Date(),` 다음 줄이자 `informationDisclosure: {` 앞에 두 줄을 넣는다.

```ts
    createDate: new Date(),
    updateDate: new Date(),
    brand: fakerKO.company.name(),
    manufacturer: fakerKO.company.name(),
    informationDisclosure: {
      key: '',
      id: '',
      name: '',
      fields: {},
    },
```

`fakerKO`는 파일 1행에서 이미 import돼 있으므로 import 문을 건드리지 않는다.

- [ ] **Step 4: 앞 10건에만 `modelName`·`modelId` 추가**

`productId`가 `smp000001` ~ `smp000010`인 객체 **10개에만** 아래 두 줄을 `manufacturer` 다음에 추가한다. 나머지 10건(`smp000011`~`smp000020`)은 비워 둔다 — 선택 필드가 빈 값일 때 화면이 어떻게 보이는지 확인하기 위해서다.

값은 `productId` 뒤 숫자와 맞춘 고정 문자열을 쓴다 (랜덤이면 화면에서 어느 상품인지 대조할 수 없다).

| productId | modelName | modelId |
|---|---|---|
| smp000001 | `'MD-0001'` | `'10000001'` |
| smp000002 | `'MD-0002'` | `'10000002'` |
| smp000003 | `'MD-0003'` | `'10000003'` |
| smp000004 | `'MD-0004'` | `'10000004'` |
| smp000005 | `'MD-0005'` | `'10000005'` |
| smp000006 | `'MD-0006'` | `'10000006'` |
| smp000007 | `'MD-0007'` | `'10000007'` |
| smp000008 | `'MD-0008'` | `'10000008'` |
| smp000009 | `'MD-0009'` | `'10000009'` |
| smp000010 | `'MD-0010'` | `'10000010'` |

`smp000001` 객체의 최종 형태 예시:

```ts
  {
    productId: 'smp000001',
    name: fakerKO.commerce.productName(),
    categoryId: 'c00001',
    netPrice: 5000,
    price: Number(faker.commerce.price({ min: 1000, max: 100000, dec: 0 })),
    state: 'SALE_DIS',
    deliveryType: 'FREE',
    deliveryPrice: 0,
    mainImage: faker.image.urlLoremFlickr({ width: 700, height: 700, category: 'cat' }),
    option: [],
    totalQuantity: 100,
    detailPage: '',
    keyWords: [],
    createDate: new Date(),
    updateDate: new Date(),
    brand: fakerKO.company.name(),
    manufacturer: fakerKO.company.name(),
    modelName: 'MD-0001',
    modelId: '10000001',
    informationDisclosure: {
      key: '',
      id: '',
      name: '',
      fields: {},
    },
  },
```

- [ ] **Step 5: 타입·린트·기존 테스트 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `npm run lint`
Expected: 에러 없음

Run: `npm run test`
Expected: 기존 테스트 전부 PASS (이번 변경은 `src/mocks/utils/`를 건드리지 않으므로 결과가 달라지면 안 된다)

- [ ] **Step 6: 커밋 — 사용자가 명시적으로 요청한 경우에만**

자동 실행 금지. 요청이 있을 때 쓸 메시지:

```
feat: Product에 브랜드·모델명·모델번호·제조업체 공통 필드 추가
```

---

### Task 2: `ProductBrandModelSection` 컴포넌트 신설 + 상품 등록/수정 폼에 배치

**Files:**
- Create: `src/features/products/ui/components/form/ProductBrandModelSection.tsx`
- Modify: `src/features/products/ui/components/ProductForm.tsx:10`(import), `:30-31`(배치)

**Interfaces:**
- Consumes: Task 1의 `Product.brand` / `Product.manufacturer` / `Product.modelName` / `Product.modelId`
- Produces: `export const ProductBrandModelSection = () => JSX.Element` — Task 3의 연동상품 수정 화면이 같은 컴포넌트를 import한다. props 없음(부모의 `FormProvider`에서 `useFormContext<Product>()`로 폼을 받는다).

- [ ] **Step 1: 컴포넌트 파일 생성**

`src/features/products/ui/components/form/ProductBrandModelSection.tsx`

```tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const ProductBrandModelSection = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<Product>();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">브랜드 및 모델 정보</CardTitle>
            <CardDescription className="mt-0.5">브랜드, 제조업체, 모델 정보를 입력하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brand">브랜드 *</Label>
            <Input
              id="brand"
              placeholder="브랜드를 입력하세요."
              {...register('brand', { required: '브랜드를 입력해 주세요.' })}
            />
            {errors.brand && <p className="text-red-500 text-sm">{errors.brand.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="manufacturer">제조업체 *</Label>
            <Input
              id="manufacturer"
              placeholder="제조업체를 입력하세요."
              {...register('manufacturer', { required: '제조업체를 입력해 주세요.' })}
            />
            {errors.manufacturer && <p className="text-red-500 text-sm">{errors.manufacturer.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="modelName">모델명</Label>
            <Input id="modelName" placeholder="모델명을 입력하세요." {...register('modelName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modelId">모델번호</Label>
            <Input id="modelId" placeholder="모델번호를 입력하세요." {...register('modelId')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

Card 구조·클래스는 `ProductPriceAndQuantityInfo.tsx:24-34`에서, 에러 문구 패턴은 `ProductBasicInfo.tsx:66-67`에서 그대로 가져온 것이다. 새 클래스나 새 색상을 만들지 않는다.

- [ ] **Step 2: `ProductForm`에 import 추가**

`src/features/products/ui/components/ProductForm.tsx`의 import 블록에서 `ProductComplianceSection` import 다음 줄에 추가한다.

```tsx
import { ProductComplianceSection } from './form/ProductComplianceSection';
import { ProductBrandModelSection } from './form/ProductBrandModelSection';
```

- [ ] **Step 3: 규정 정보를 2열 행으로 바꾸고 새 섹션을 좌측에 배치**

같은 파일의 아래 두 줄을

```tsx
      {/* 규정 정보 (원산지/부가세유형/성인상품여부) */}
      <ProductComplianceSection />
```

이렇게 교체한다.

```tsx
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 브랜드 및 모델 정보 */}
        <ProductBrandModelSection />
        {/* 규정 정보 (원산지/부가세유형/성인상품여부) */}
        <ProductComplianceSection />
      </div>
```

`grid gap-6 lg:grid-cols-2`는 같은 파일 23행의 기존 2열 행과 동일한 클래스다.

- [ ] **Step 4: 타입·린트 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 5: dev 서버에서 등록 화면 수동 확인**

Run: `npm run dev`

`/products/create` 접속 후 확인할 것:

1. "브랜드 및 모델 정보" 카드가 **좌측**, "규정 정보" 카드가 **우측**에 나란히 보인다 (창 너비가 좁으면 세로로 쌓이는 것이 정상 — `lg:` 브레이크포인트)
2. 브랜드·제조업체를 비운 채 "상품 등록" 클릭 → 각각 아래에 빨간 문구 "브랜드를 입력해 주세요." / "제조업체를 입력해 주세요."가 뜨고 저장되지 않는다
3. 모델명·모델번호는 비워도 저장이 막히지 않는다
4. 필수값을 모두 채우고 저장 → "상품등록 완료" alert 후 `/products/list`로 이동

- [ ] **Step 6: dev 서버에서 수정 화면 수동 확인**

`/products/list`에서 `smp000001` 상품을 열어(`/products/[id]`) 확인할 것:

1. 브랜드·제조업체에 Task 1에서 넣은 mock 값이 채워져 있다
2. 모델명 `MD-0001`, 모델번호 `10000001`이 보인다
3. `smp000011` 이후 상품을 열면 모델명·모델번호는 **빈 칸**이고, 그 상태로도 저장이 된다

- [ ] **Step 7: 커밋 — 사용자가 명시적으로 요청한 경우에만**

자동 실행 금지. 요청이 있을 때 쓸 메시지:

```
feat: 브랜드 및 모델 정보 폼 섹션 추가
```

---

### Task 3: 쇼핑몰 연동상품 수정 화면에 섹션 반영

**Files:**
- Modify: `src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx:14`(import), `:160`(배치)

**Interfaces:**
- Consumes: Task 2의 `ProductBrandModelSection`
- Produces: 없음 (마지막 코드 Task)

**왜 별도 Task인가:** 이 화면은 `ProductForm` 래퍼를 쓰지 않고 섹션 컴포넌트를 직접 나열한다(2026-08-03 설계 결정). Task 2만 하고 여기를 빠뜨리면 **에러 없이 조용히 깨진다** — `productForm.trigger()`는 `register`가 호출된 필드만 검증하므로, 섹션이 없으면 브랜드가 빈 채로 저장된다.

- [ ] **Step 1: import 추가**

`src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx`의 `ProductComplianceSection` import 다음 줄에 추가한다.

```tsx
import { ProductComplianceSection } from '@/features/products/ui/components/form/ProductComplianceSection';
import { ProductBrandModelSection } from '@/features/products/ui/components/form/ProductBrandModelSection';
```

- [ ] **Step 2: 규정 정보를 2열 행으로 바꾸고 새 섹션을 좌측에 배치**

같은 파일의 아래 한 줄을

```tsx
          <ProductComplianceSection />
```

이렇게 교체한다. (`ProductBasicinfo`/`ProductPriceAndQuantityInfo` 2열 행과 `ProductOptionSection` 사이에 있는 줄이다.)

```tsx
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductBrandModelSection />
            <ProductComplianceSection />
          </div>
```

들여쓰기는 주변 줄과 같은 10칸이다. `buildSnapshots`·`validateBothForms`·저장/재전송 핸들러는 **수정하지 않는다** — `productSnapshot: productForm.getValues()`라 새 필드가 자동으로 스냅샷에 들어간다.

- [ ] **Step 3: 타입·린트 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 4: dev 서버에서 연동상품 수정 화면 수동 확인**

`/shopping/linked-products`에서 아무 연동 건의 수정 화면(`/shopping/linked-products/[id]`)을 열어 확인할 것:

1. "브랜드 및 모델 정보" 카드가 좌측, "규정 정보"가 우측에 나란히 보인다
2. 브랜드·제조업체에 값이 채워져 있다 (연동 mock은 `structuredClone(product)`로 Task 1의 상품 mock에서 파생되므로 값이 따라온다)
3. 브랜드를 지우고 "저장" 클릭 → 저장이 막히고 에러 문구가 뜬다. **여기가 이 Task의 핵심 검증 지점이다** — 섹션을 안 넣었다면 아무 일 없이 저장됐을 것이다
4. 브랜드를 되돌리고 "저장 후 재전송" → 정상 동작

- [ ] **Step 5: 전체 회귀 확인**

Run: `npm run test`
Expected: 기존 테스트 전부 PASS

- [ ] **Step 6: 커밋 — 사용자가 명시적으로 요청한 경우에만**

자동 실행 금지. 요청이 있을 때 쓸 메시지:

```
feat: 연동상품 수정 화면에 브랜드 및 모델 정보 섹션 반영
```

---

### Task 4: CLAUDE.md 규칙 예시 정정

**Files:**
- Modify: `CLAUDE.md:33`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

**배경:** 해당 줄은 "원문 표현을 잃어 범위가 축소된 사례"로 `giftBrandId`·"상품타입"을 들고 있는데, 2026-08-12·08-14 사용자 확인 결과 **둘 다 별도 필드가 아니었다.** 예시로 성립하지 않으므로 교훈을 바로잡는다. (근거: 스펙 문서 `docs/superpowers/specs/2026-08-14-product-common-fields-design.md`의 "이번 라운드에서 확정한 두 가지 오독 정정" 절)

- [ ] **Step 1: 문장 교체**

`CLAUDE.md` 33행의 아래 문장을

```
- 반대로 사용자가 실제로 미뤄둔 항목은 원문이 남아 있어야 범위가 줄지 않는다 — 위 검토에서 "상품 공통 필드 추가"가 원문의 `giftBrandId`·"상품타입"을 잃고 4개 필드로 축소돼 기록돼 있었다.
```

이렇게 교체한다.

```
- 반대로 사용자가 실제로 미뤄둔 항목은 원문이 남아 있어야 범위가 줄지 않는다. 단, **원문 단어만 옮겨 적고 그 의미를 함께 적지 않으면 다음 라운드에서 해석할 수 없게 된다** — 위 검토에서 복원한 "상품 공통 필드 추가"의 `giftBrandId`·"상품타입"이 그랬다. 2026-08-14에 사용자에게 다시 물어 확인한 결과 `giftBrandId`는 카카오가 `brand`를 부르는 이름이고, "상품타입"은 필드가 아니라 필드를 추가할 대상 타입(`Product` 인터페이스)을 가리킨 말이어서, 둘 다 신규 필드가 아니었다.
```

- [ ] **Step 2: 문서만 바뀌었는지 확인**

Run: `git status --short`
Expected: `CLAUDE.md`만 M으로 표시 (코드 파일이 섞여 있으면 이전 Task의 변경이 커밋되지 않은 것이므로 정상 — 파일 목록만 확인하고 넘어간다)

- [ ] **Step 3: 커밋 — 사용자가 명시적으로 요청한 경우에만**

자동 실행 금지. 요청이 있을 때 쓸 메시지:

```
docs: 미착수 항목 출처 표기 규칙의 예시를 실제 확인 결과에 맞게 정정
```

---

## 완료 후 처리

1. **전체 검증:** `npx tsc --noEmit` · `npm run lint` · `npm run test` 전부 통과
2. **코드 리뷰:** `superpowers:requesting-code-review` 스킬 실행 (커밋이 없으므로 리뷰 범위는 working-tree diff)
3. **지식 문서화:** `/ce-compound` — 기록 후보는 "몰마다 이름이 다른 값을 프론트 단일 필드로 수렴시킨 판단"과 "섹션을 직접 나열하는 화면을 빠뜨리면 RHF 검증이 무증상으로 빠지는 함정". 단순하다고 판단되면 생략 가능
4. **브랜치 마무리:** `superpowers:finishing-a-development-branch`

## 이번 계획에 포함되지 않은 것 (스펙의 오픈 이슈)

- 상품대량등록 엑셀 템플릿·전략 반영 (사용자 요구 — 다음 세션)
- 필수 2개 필드 non-optional 좁히기 (Claude 추정 — 미확인, 엑셀 라운드 이후 검토)
- 상품 목록 테이블 컬럼·검색 필터에 브랜드 노출 (요청 없음 — 만들지 않는다)
