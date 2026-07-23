# 상품 규정 정보 필드 추가 + 쇼핑몰별 필드 섹션 정리 설계

- 작성일: 2026-07-19
- 배경: `쇼핑몰 정보설정` 후속 작업 중 "쇼핑몰별 필드 설계"를 브레인스토밍하는 과정에서, 조사된 몰 공통 항목(원산지/인증정보/부가세유형/성인상품여부)이 실제로는 `ShoppingSetting`(몰 계정 등록 템플릿) 소속이 아니라 `Product`(상품) 소속 데이터라는 결론에 도달했다. 참고: `docs/research/2026-07-11-mall-specific-fields-research.md`

## 1. 범위

### 포함
- `Product` 도메인에 규정 정보 필드 추가: 원산지(`originCountryCode`/`originCountryEtc`), 부가세유형(`taxType`), 성인상품여부(`isAdultProduct`)
- 상품 단일 등록/수정 폼에 신규 섹션(`ProductComplianceSection`) 추가
- `ShoppingSetting`의 `ShoppingSettingMallFieldSection` 플레이스홀더 제거 (해당 섹션에 채울 몰별 필드가 결과적으로 없음이 확인됨)

### 제외 (별도 라운드로 이관)
- **인증정보(KC 등)**: 기존 `informationDisclosure`(상품정보고시) 시스템에 카테고리별 `kc` 필드가 이미 존재하므로 신규 필드 추가 없음
- **상품 대량등록 Excel 연동**: `productExcelSaveStrategy`/템플릿/미리보기 컬럼 반영은 다음 라운드
- **몰 고유 항목**(병행수입, 혼용률, 쇼핑하우전시 등): 대부분 상품별 속성으로 재분류되지만 몰마다 개별 분류 작업이 더 필요해 이번 라운드 밖
- 출고지/반품지 몰별 실 API 연동, `ShoppingMalls` 타입 재정의는 이미 별도 트랙(재정의는 PR #22에서 완료됨 — 리서치 문서 참고)

## 2. 왜 원산지는 상품정보고시 원산지와 별개로 존재하는가

오픈마켓 상품등록 시 원산지는 두 곳에 입력된다:
- **일반 원산지**: 전자상거래 초기부터 있던 필수값, 코드값으로 API 전송, 상품정보고시와 별도 위치에 노출
- **상품정보고시 원산지**(`informationDisclosure.fields.origin`): 이후 제정된 법률에 따른 표시 항목, 문자열 그대로 API 전송

두 값은 실제 오픈마켓에서도 별도로 입력받는 필드이므로, 이번 설계에서도 신규 필드(코드값)와 기존 `informationDisclosure.fields.origin`(자유텍스트)이 공존한다. 반면 KC 인증정보는 상품정보고시 값으로 충분히 처리 가능하다고 판단해 신규 필드를 추가하지 않는다.

**설계 변경(2026-07-19):** 최초 설계는 "국내/수입" 라디오 선택 후 수입일 때만 국가 드롭다운을 노출하는 구조였으나, 국가 드롭다운에 `대한민국`을 포함시켜 **항상 노출되는 단일 드롭다운**으로 단순화했다. `OriginType`(`DOMESTIC`/`IMPORTED`) 필드는 제거하고 `originCountryCode` 하나로 원산지를 표현한다.

## 3. 데이터 모델

`src/features/products/types/product.types.ts`에 추가:

```ts
export type TaxType = 'TAXABLE' | 'TAX_FREE' | 'ZERO_RATED'; // 과세/면세/영세
export type AdultProductType = 'GENERAL' | 'ADULT'; // 일반상품/성인상품

export interface Product {
  // ...기존 필드 유지
  originCountryCode?: string; // ORIGIN_COUNTRIES 코드('KR' 포함) 또는 'ETC'
  originCountryEtc?: string; // originCountryCode === 'ETC'일 때만 사용하는 자유텍스트
  taxType?: TaxType;
  adultProductType?: AdultProductType;
}
```

필드 모두 **optional**. 이유: Excel 대량등록 경로가 이 필드들을 아직 채우지 못하는 기간에도 데이터 정합성 문제가 없어야 하기 때문. `CreateProductRequest`/`UpdateProductBody` 등 기존 `Omit<Product, ...>` 기반 타입은 자동으로 신규 필드를 포함하므로 별도 타입 수정 불필요.

**후속 수정(최종 리뷰 이후, 2026-07-19):** 최종 전체 브랜치 리뷰에서 Minor로 남겨뒀던 2건을 사용자 요청으로 반영했다.
1. `originCountryCode`가 `'ETC'`가 아닌 값으로 바뀌면 `ProductComplianceSection`의 `onValueChange`에서 `setValue('originCountryEtc', undefined)`를 호출해 숨겨진 자유텍스트 값을 함께 리셋한다.
2. `isAdultProduct: boolean` → `adultProductType: AdultProductType`('GENERAL'/'ADULT')로 변경 — 문자열 `'true'`/`'false'` id와 boolean 간 수동 변환 로직을 제거하고 `taxType`과 동일한 단순 문자열 유니온 패턴으로 통일했다.

## 4. 상수 (`src/features/products/constant/compliance.constants.ts` 신규)

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

export const ADULT_PRODUCT_OPTIONS: FilterOption[] = [
  { id: 'GENERAL', name: '일반상품' },
  { id: 'ADULT', name: '성인상품' },
];

export const TAX_TYPE_OPTIONS: FilterOption[] = [
  { id: 'TAXABLE', name: '과세' },
  { id: 'TAX_FREE', name: '면세' },
  { id: 'ZERO_RATED', name: '영세' },
];
```

`FilterOption` 타입은 `@/types/common.type`의 기존 타입을 재사용(신규 타입 정의 없음). 인증정보 관련 옵션(`CERTIFICATION_TARGET_OPTIONS` 등)은 제외 결정에 따라 만들지 않는다. `ORIGIN_TYPE_OPTIONS`는 설계 변경으로 더 이상 필요하지 않다. `ADULT_PRODUCT_OPTIONS`의 id는 최초 `'true'`/`'false'` 문자열에서 위 후속 수정으로 `'GENERAL'`/`'ADULT'`로 변경됐다.

## 5. UI — `ProductComplianceSection` 신규 컴포넌트

경로: `src/features/products/ui/components/form/ProductComplianceSection.tsx`

`ProductInformationDisclosureSection`과 동일한 Card 레이아웃(`ui-conventions.md` 컨벤션) + `useFormContext<Product>()`. 3개 그룹:

1. **원산지**: `ORIGIN_COUNTRIES`(대한민국 포함, 항상 노출)를 `FilterSelect`(기존 `ProductBasicinfo`에서 쓰는 공통 컴포넌트)로 노출 → `originCountryCode === 'ETC'`일 때 자유텍스트 `Input` 추가 노출
2. **부가세유형**: `TAX_TYPE_OPTIONS` `RadioGroup`
3. **성인상품여부**: `ADULT_PRODUCT_OPTIONS` `RadioGroup`

**배치 변경(구현 중 확정, 2026-07-19):** 초안은 `ProductInformationDisclosureSection` 다음 위치를 지정했으나, 사용자가 dev 서버에서 직접 확인 후 `기본 정보`+`가격 및 수량 정보` grid 바로 다음(옵션 섹션 앞)의 독립 카드로 최종 확정했다. ("기본 정보" 카드 내부로 병합하는 안도 실험했으나, 상품정보고시와 마찬가지로 별도 관심사이므로 독립 카드 유지가 이 폼의 기존 패턴과 더 일치한다고 판단해 되돌림.)

전부 optional이므로 `rules: { required: ... }` 없음. `ProductForm.tsx`에서 `ProductInformationDisclosureSection` 다음 위치에 배치.

## 6. ShoppingSetting 정리

- `src/features/shoppingSetting/ui/components/form/ShoppingSettingMallFieldSection.tsx` 삭제
- `src/features/shoppingSetting/ui/components/ShoppingSettingForm.tsx`에서 해당 import 및 렌더링 제거

## 7. 중복 점검 결과 요약 (구현 시 참고)

- 원산지: 기존 `informationDisclosure.fields.origin`(자유텍스트, 카테고리별)과 목적이 달라 중복 아님 — 신규 코드값 필드 추가
- 인증정보(KC): 기존 `informationDisclosure.fields.kc`로 충분 — 신규 필드 추가하지 않음
- 부가세유형/성인상품여부: 기존 코드베이스 전체 검색 결과 겹치는 타입/상수/로직 없음 — 완전 신규
- `FilterOption` 타입은 기존 타입 재사용, 새 타입 정의 없음
- 구현 단계에서도 새 파일/타입/상수/로직 추가 전 기존 코드에 이미 존재하는지 먼저 확인할 것

## 8. 비고

- 카테고리 무관하게 전체 상품에 3개 필드 노출(카테고리별 조건부 요구사항은 이번 범위 밖)
- 테스트: 프로젝트 컨벤션상 UI 컴포넌트는 테스트 파일 대상 아님(`src/mocks/utils/`만 테스트 대상) — 별도 테스트 작성 없음
