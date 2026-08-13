# 상품 공통 필드 추가 (브랜드·모델명·모델번호·제조업체) 설계

작성일: 2026-08-14

## 배경

몰 고유 필드 조사 라운드(2026-07-21)에서 사용자가 *"이 작업 후 상품쪽 작업을 진행하면 될꺼 같아"* 라고 미뤄둔 항목이다. 선행 조건이던 `ShoppingSetting` 몰별 필드 작업은 PR #32로 끝나 지금 착수 가능하다.

네이버·카카오 조사 결과(`docs/research/2026-07-11-mall-specific-fields-research.md`), 두 몰이 요구하는 브랜드·모델·제조사 정보는 **몰마다 이름만 다를 뿐 상품 자체의 공통 정보**였다. 따라서 몰별 속성이 아니라 `Product`의 공통 필드로 추가한다.

| 몰 | 필드 | 필수여부(외부몰 기준) |
|---|---|---|
| 네이버 | `naverShoppingSearchInfo` (제조사/브랜드/모델명/모델ID) | 선택(네이버쇼핑 노출에 영향) |
| 카카오 | `giftBrandId` (브랜드 ID) | 필수 |
| 카카오 | `manufacturer` (제조사) | 선택 |

## 이번 라운드에서 확정한 두 가지 오독 정정

### "상품타입"은 추가할 필드가 아니다

과거 미착수 목록에 `상품타입`이 항목으로 올라 있었으나, 2026-08-14 사용자 확인 결과 **필드 이름이 아니라 필드를 추가할 대상 타입**(`src/features/products/types/product.types.ts`의 `Product` 인터페이스)을 가리킨 말이었다. 원문은 "`Product` 인터페이스에 브랜드·모델명·모델번호·제조업체를 추가"라는 한 문장이다.

### `giftBrandId`도 별도 필드가 아니다

카카오가 브랜드를 부르는 이름일 뿐이므로 프론트는 `brand` 하나만 갖는다. 카카오 payload의 `giftBrandId` 키에 그 값을 넣는 매핑은 백엔드가 한다(2026-08-12 사용자 확인). `.claude/rules/domain-design.md`의 "이름이 다른 것은 고유값이 아니다" 규칙.

### 후속 문서 정정 대상

`CLAUDE.md`의 "미착수·후속 항목은 출처를 함께 적는다" 절에 다음 문장이 있다.

> 위 검토에서 "상품 공통 필드 추가"가 원문의 `giftBrandId`·"상품타입"을 잃고 4개 필드로 축소돼 기록돼 있었다.

두 항목 모두 실제로는 별도 필드가 아니었으므로 **4개 필드 기록이 맞았던 것**이 된다. "원문 표현을 잃어 범위가 축소된 사례"의 예시로는 성립하지 않으므로 이번 브랜치에서 함께 정정한다.

다만 이 사례가 무의미한 것은 아니고, 교훈이 다른 쪽으로 바뀐다 — **원문 단어만 남기고 그 의미를 적어두지 않으면 다음 라운드에서 해석이 불가능해진다.** 이번에도 `상품타입`이 무엇인지 코드·리서치 문서 어디에도 없어 사용자에게 다시 물어야 했다. 정정안:

> 반대로 사용자가 실제로 미뤄둔 항목은 원문이 남아 있어야 범위가 줄지 않는다. 단, **원문 단어만 옮겨 적고 그 의미를 함께 적지 않으면 다음 라운드에서 해석할 수 없게 된다** — 위 검토에서 복원한 "상품 공통 필드 추가"의 `giftBrandId`·"상품타입"이 그랬다. 2026-08-14에 사용자에게 다시 물어 확인한 결과 `giftBrandId`는 카카오가 `brand`를 부르는 이름이고, "상품타입"은 필드가 아니라 필드를 추가할 대상 타입(`Product` 인터페이스)을 가리킨 말이어서, 둘 다 신규 필드가 아니었다.

## 범위

**이번 라운드에서 하는 것:**

- `Product` 타입에 4개 필드 추가
- 신규 폼 섹션 컴포넌트 1개 + 등록/수정/연동수정 3개 화면 반영
- mock 상품 데이터 20건에 필수 2개 값 채우기

**이번 라운드에서 하지 않는 것 (다음 라운드로 이관):**

- 상품대량등록 엑셀 템플릿·전략 반영 — 사용자가 원문에서 *"엑셀쪽도 추가를 해야 하는데 범위가 넓어진다"* 며 같이 미뤄둔 항목. 2026-08-14 세션에서 별도 세션으로 분리하기로 선택함
- 필수 2개 필드를 non-optional로 좁히기 — 엑셀 라운드 이후
- 상품 목록 테이블 컬럼·검색 필터에 브랜드 노출 — 사용자 요청 없음(Claude 추정 항목이므로 만들지 않는다)

## 필드 정의

| 필드 | 라벨 | 입력 필수 | 근거 |
|---|---|---|---|
| `brand` | 브랜드 | **필수** | 카카오 `giftBrandId`가 필수. `domain-design.md`의 "입력 단계의 필수 여부는 몰들 중 가장 엄격한 쪽을 따른다" |
| `manufacturer` | 제조업체 | **필수** | 외부몰 기준으로는 양쪽 다 선택이지만, 사용자가 필수로 결정(2026-08-14) |
| `modelName` | 모델명 | 선택 | 네이버 선택 항목 |
| `modelId` | 모델번호 | 선택 | 네이버 선택 항목 |

### 타입

```ts
// src/features/products/types/product.types.ts
export interface Product {
  // ...기존 필드
  originCountryCode?: string;
  originCountryEtc?: string;
  taxType?: TaxType;
  adultProductType?: AdultProductType;

  /** 몰 카탈로그 매칭·검색 노출에 쓰이는 상품 공통 정보 */
  brand?: string; // 폼 필수. 카카오는 giftBrandId 키로 전송하지만 프론트는 이 필드 하나만 갖는다
  manufacturer?: string; // 폼 필수
  modelName?: string;
  modelId?: string;
}
```

**4개 모두 optional로 선언하고 필수는 폼에서만 강제한다.**

- non-optional로 선언하면 `productExcelSaveStrategy`가 `Product[]`를 만들 때 컴파일 에러가 나서, 이번 범위에서 뺀 엑셀 작업이 강제로 딸려온다. `brand: ''`로 때우면 "타입은 필수인데 실제로는 빈 값"인 상태가 조용히 남는다.
- 프로젝트 선례와도 맞는다 — `AccountUser.ownerId`를 `string | null`에서 `string`으로 좁힌 것은 실 DB 전수 조회로 null이 0건임을 검증한 **뒤**였다(2026-07-17). 같은 순서를 따르면 지금은 optional이 맞고, 엑셀까지 끝난 뒤 좁힌다.
- 기존 규정 정보 필드 3개(`originCountryCode`/`taxType`/`adultProductType`)도 전부 optional이다.

`modelId`는 네이버가 숫자 ID를 쓰지만 프론트는 `string`으로 둔다. 계산에 쓰지 않고 그대로 전달만 하는 값이라 앞자리 0이나 자릿수 손실 위험이 없는 쪽이 안전하다.

`CreateProductRequest`는 `Omit<Product, 'productId' | 'ownerId' | 'createDate' | 'updateDate'>` 파생이므로 자동 반영된다.

## UI

### 신규 컴포넌트

`src/features/products/ui/components/form/ProductBrandModelSection.tsx`

```
┌─ 브랜드 및 모델 정보 ─────────────────────┐
│ 브랜드 및 모델 정보를 입력하세요.           │
├───────────────────────────────────────┤
│  브랜드 *          제조업체 *            │
│  [___________]     [___________]        │
│                                        │
│  모델명            모델번호              │
│  [___________]     [___________]        │
└───────────────────────────────────────┘
```

- `.claude/rules/ui-conventions.md`의 Card 패턴(accent 바 + `CardTitle text-sm` + `CardDescription`)을 따른다
- `useFormContext<Product>()` + `register('brand', { required: '브랜드를 입력해 주세요.' })` — 기존 `ProductBasicInfo`와 같은 RHF 방식이며 zod를 쓰지 않는다
- 에러 문구는 기존과 동일하게 `<p className="text-red-500 text-sm">{errors.brand.message}</p>`
- 4개 모두 자유 입력(`Input`)이라 Select 옵션 상수 파일이 필요 없다
- 필드 배치는 `grid gap-4 md:grid-cols-2` 2행

### 배치

새 카드가 좌측, 기존 규정 정보 카드가 우측인 2열 행을 만든다.

```
[기본 정보]              [가격 및 수량 정보]
[브랜드 및 모델 정보]     [규정 정보]          ← 새 행
[옵션 정보]
[메인 이미지]            [상품 상세 설명]
[상품정보고시]
```

`ProductComplianceSection`은 현재 전체 폭 단독 행이므로, 두 카드를 `<div className="grid gap-6 lg:grid-cols-2">`로 감싸는 변경이 함께 들어간다.

## 영향 범위

| 대상 | 변경 |
|---|---|
| `src/features/products/types/product.types.ts` | 필드 4개 추가 |
| `src/features/products/ui/components/form/ProductBrandModelSection.tsx` | 신규 |
| `src/features/products/ui/components/ProductForm.tsx` | 섹션 추가 + 규정 정보와 2열 grid 래핑 → `/products/create`·`/products/[id]` 자동 반영 |
| `src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx` | 섹션을 직접 나열하는 구조라 **수동 추가 필요** (같은 2열 래핑 적용) |
| `src/mocks/data/MockProductsData.ts` | 20건에 `brand`·`manufacturer` 추가, 일부 건에 `modelName`·`modelId` |
| `CLAUDE.md` | 위 "후속 문서 정정 대상" 문장 수정 |

**변경 불필요 (확인 완료):**

- `createProduct`/`updateProduct` API 함수 — `Product` 전체를 body로 보낸다
- MSW `createMockProduct` — `{...data}` spread라 새 필드가 그대로 통과. `updateMockProduct`도 동일
- `buildSnapshots`(연동 수정) — `productSnapshot: productForm.getValues()`라 자동 포함
- 연동상품 mock 데이터 — `structuredClone(product)`로 상품 mock에서 파생된다

### 연동 수정 화면을 빠뜨리면 무증상으로 깨진다

`MallLinkedProductEditLayout`은 `productForm.trigger()`로 상품 폼을 검증하는데, **`register`가 호출되지 않은 필드는 RHF의 검증 대상에서 아예 빠진다.** 그 화면에만 섹션을 추가하지 않으면 에러 없이 브랜드가 빈 채로 저장된다. 에러가 나는 것보다 위험하므로 반드시 함께 반영한다.

## 기존 데이터 처리

필수 필드를 추가하면 기존 데이터가 전부 그 값을 갖고 있지 않은 상태가 된다 — `.claude/rules/domain-design.md`가 "감수하는 비용"으로 예고한 상황이며, 그 규칙대로 이번 라운드에서 처리 방침을 함께 정한다.

- 증상: 기존 상품 20건을 수정 화면에서 열면 브랜드·제조업체가 비어 저장이 막힌다. 연동 수정 화면도 스냅샷에 값이 없어 같은 상태가 된다.
- 처리: `MockProductsData.ts` 20건에 `brand`·`manufacturer`를 채운다. 파일 컨벤션대로 `fakerKO.company.name()`을 쓴다.
- `modelName`·`modelId`는 **20건 중 앞 10건(`smp000001`~`smp000010`)에만** 넣고 나머지 10건은 비워 둔다. 전부 채우면 선택 필드가 빈 값일 때 화면이 어떻게 보이는지 확인할 수 없다.
- 연동상품 mock은 상품 mock에서 파생되므로 별도 조치가 필요 없다.

## 테스트

이번 변경은 `src/mocks/utils/`의 비즈니스 로직을 건드리지 않는다. 프로젝트 컨벤션상 UI 컴포넌트와 타입 정의에는 테스트 파일을 두지 않으므로 **신규 테스트 파일이 없다.**

검증 방법:

1. `npx tsc --noEmit` — 타입 통과
2. `npm run lint` — 통과
3. `npm run test` — 기존 테스트 전부 통과 유지(회귀 없음 확인)
4. dev 서버 수동 확인 — 아래 4개 경로
   - `/products/create`: 브랜드·제조업체 비운 채 저장 시도 → 각각 에러 문구 노출, 저장 차단
   - `/products/create`: 4개 입력 후 저장 → 목록 반영
   - `/products/[id]`: 기존 상품 열기 → mock에 채운 브랜드·제조업체가 폼에 표시됨. 모델명/모델번호가 없는 건은 빈 칸
   - `/shopping/linked-products/[id]`: 새 섹션 노출 확인, 브랜드를 비우고 저장 시도 → 차단됨

## 다음 라운드로 넘기는 오픈 이슈

- **상품대량등록 엑셀 반영** (사용자 요구 — 원문: *"엑셀쪽도 추가를 해야 하는데 범위가 넓어진다"*). `PRODUCT_BULK_EXCEL_TEMPLATE`에 컬럼 4개 추가 + `productExcelSaveStrategy` 매핑 추가. 엑셀 필수 컬럼(`req: true`) 지정을 폼 필수 2개와 맞출지 결정 필요
- **필수 2개 non-optional 좁히기** (Claude 추정 — 미확인). 엑셀 라운드가 끝나고 기존 데이터가 전부 값을 가진 것이 확인된 뒤에 검토
