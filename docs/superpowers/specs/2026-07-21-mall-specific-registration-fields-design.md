# 몰 고유 항목(병행수입/혼용률 등) 필드 설계

- 작성일: 2026-07-21 (2026-07-22 범위/근거 검증 재작업으로 전면 개정)
- 목적: "쇼핑몰 정보설정" 후속작업 중 "몰 고유 항목" 설계 라운드. `docs/research/2026-07-11-mall-specific-fields-research.md`의 "다음 브레인스토밍에서 결정할 사항" 2~6번에 대한 결론.
- **이번 라운드 산출물: 타입/구조 모델링 확정까지.** 실제 필드 구현·폼 UI 구축은 다음 라운드로 이관.

## 배경

지난 라운드(`docs/solutions/architecture-patterns/product-vs-shoppingsetting-compliance-field-boundary.md`)에서 원산지/부가세유형/성인상품여부처럼 대다수 몰에 공통인 규정 정보는 `Product`에 평탄한 optional 필드로 추가했다. 이번 라운드는 "몰 고유 항목"(병행수입/혼용률 등)을 다루려 했으나, 설계 진행 중 두 가지 핵심 이슈가 드러나 방향이 크게 바뀌었다.

### 이슈 1: Product는 몰 등록 관계가 없다

`Product`는 현재 어떤 몰에 등록되는지 나타내는 관계가 전혀 없다. 몰 고유 항목은 상품이 실제로 해당 몰에 등록될 때만 의미가 있으므로, "Product↔몰 등록 관계를 어떻게 모델링할 것인가"가 먼저 결정돼야 했다.

### 이슈 2: 근거 자료의 신뢰도 검증 필요

최초 조사(`docs/research/2026-07-11-mall-specific-fields-research.md`)는 몰마다 "공식 소스"를 표기했지만, 실제로는 신뢰도가 균일하지 않았다:

- **쿠팡**: `developers.coupangcorp.com` 직접 접근이 403으로 차단되어, 병행수입여부/해외구매대행/A·S연락처 등 핵심 필드가 "비공식 커뮤니티 예시 기반"으로 조사됨 (문서 자체에 "sandbox 검증 필요"라고 명시).
- **지마켓/ESM**: API 도메인(`etapi.gmarket.com`)은 확인했으나, 실제 필드 근거는 "ESM Plus 셀러가이드"(가이드 문서)이지 API 스펙 원문이 아님.
- **오늘의집**: 공식 채널이지만 "도움말센터"(셀러 가이드/FAQ)이지 Open API 문서가 아님.
- **무신사**: 상품등록 Open API 자체가 없음(주문수집 API만 공개). 재검색 결과 "혼용률" 하나만 뉴스룸 공식 발표로 확인되고 나머지(실측사이즈/병행수입인증서류/세탁기호)는 신뢰 가능한 출처를 찾지 못함.

이 프로젝트는 "부정확한 자료로 도메인 필드를 확정할 수 없다"는 원칙에 따라, **공식 Open API 개발자 문서로 직접 확인 가능한 몰만** 이번 라운드에 포함하기로 했다.

## 범위

- **대상 몰 (2개, 공식 Open API 개발자 문서 기반):**
  - 네이버 스마트스토어 — `commerce-api-naver/commerce-api` GitHub Discussions (네이버 공식 운영)
  - 카카오스토어 — `shopping-developers.kakao.com` (카카오 공식 Open API 개발자 문서)
- **제외 (이번 라운드, 근거 신뢰도 부족):**
  - 쿠팡 — 핵심 필드(병행수입/해외구매대행/A·S정보)가 비공식 예시 기반
  - 지마켓/ESM(옥션 포함) — 셀러가이드 기반, API 스펙 원문 미확인
  - 오늘의집 — 도움말센터 기반, Open API 문서 아님
  - 무신사 — Open API 자체 없음, 뉴스룸 공지 기반 필드도 대부분 재검증 실패
  - 11번가·인터파크·SSG닷컴·머스트잇 — 공개 자료 부족 (원 리서치 문서에서도 확인 못함)
  - CJ온스타일·GS샵·롯데홈쇼핑·현대홈쇼핑(TV/라이브커머스)·하프클럽 — 공개 API/필드 스펙 없음. "계정/입점 메타데이터"로 다루는 게 현실적이라는 결론 유지, 별도 라운드
- **이번 라운드에서 하지 않는 것:** 실제 필드 추가 구현, 상품 등록/수정 폼 UI, ShoppingSetting 등록 폼 UI, Excel 대량등록 반영, API 연동

## 데이터 모델

### 설계 원칙: 상품 vs 설정 경계 재적용

`product-vs-shoppingsetting-compliance-field-boundary.md`의 판단 기준("이 값이 상품마다 달라지는가, 설정/계정 단위로 고정되는가")을 필드 단위로 재적용했다. 조사 결과 네이버/카카오의 몰 고유 항목 대부분은 **상품마다 다른 값이 아니라 판매자 계정/설정 단위로 재사용되는 값**임이 드러나, 애초 예상과 달리 `Product`가 아니라 `ShoppingSetting` 쪽으로 가는 필드가 더 많다.

### Product ↔ 몰 등록 관계

`Product`에 `registeredMalls` 배열을 추가해 "이 상품이 등록된 몰"을 명시적 데이터로 표현한다. 각 등록 건은 원시 `mallCode`가 아니라 **`ShoppingSetting.id`를 참조**한다 — 같은 몰이라도 계정이 여러 개면(`mall-account-to-setting-one-to-many-pattern.md` 참고) `ShoppingSetting`도 여러 건 존재할 수 있으므로, 어느 계정/설정으로 등록했는지가 데이터에 남아야 한다.

**중요:** 상품을 몰에 등록하는 화면(상품과 ShoppingSetting을 결합하는 액션 UI)은 아직 존재하지 않는다. ShoppingSetting 쪽 작업(몰 고유 필드 입력)이 완료된 이후, 별도 라운드에서 이 등록 화면을 구축할 예정이다. 즉 이번 라운드는 `registeredMalls`가 최종적으로 어떤 모양이 될지의 **타입 설계**만 확정한다.

```typescript
// src/features/products/types/product.types.ts

export type MallRegistration =
  | { shoppingSettingId: string; mallCode: 'NSST'; attributes: NaverProductAttributes }
  | { shoppingSettingId: string; mallCode: 'KAKAOS'; attributes: KakaoProductAttributes };

interface NaverProductAttributes {
  brand?: string;
  modelName?: string;
  modelId?: string;
}

interface KakaoProductAttributes {
  giftBrandId?: string;
  manufacturer?: string;
}

export interface Product {
  // ...기존 필드 (변경 없음)
  registeredMalls?: MallRegistration[];
}
```

### ShoppingSetting ↔ 몰별 고유 설정

`ShoppingSetting`을 `mallCode` 기준 discriminated union으로 재구성하고, 몰별 고유 필드(`mallSettings`)를 추가한다. 이미 `mallCode: ShoppingMalls` 필드가 존재하므로 discriminant로 그대로 활용한다.

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

export type ShoppingSetting =
  | (ShoppingSettingBase & { mallCode: 'NSST'; mallSettings?: NaverSettingAttributes })
  | (ShoppingSettingBase & { mallCode: 'KAKAOS'; mallSettings?: KakaoSettingAttributes })
  | (ShoppingSettingBase & { mallCode: Exclude<ShoppingMalls, 'NSST' | 'KAKAOS'>; mallSettings?: never });

interface NaverSettingAttributes {
  afterServiceContact?: string; // A/S 전화번호
  afterServiceGuide?: string; // A/S 안내문구
  purchaseReviewExposure?: boolean; // 구매평 노출 설정
  logisticsCompanyId?: string; // 풀필먼트 물류사 ID (사용 시만)
  logisticsCenterId?: string; // 풀필먼트 물류센터 ID (사용 시만)
  certificationInfo?: string; // 인증정보
  certificationExcludeReason?: string; // 인증 예외처리 사유
}

interface KakaoSettingAttributes {
  certs?: string; // 인증정보
  additionalInfo?: string; // 부가정보 (선물포장/맞춤제작/반품가능여부)
  shoppingHowDisplayable?: boolean; // 쇼핑하우 전시여부
  storeboardDisplayStatus?: string; // 스토어보드 전시상태
}
```

**주의:** 기존 코드에서 `ShoppingSetting`을 단일 flat interface로 가정하는 부분(`CreateShoppingSettingBody`, mock 데이터, 폼, 필터 등)이 discriminated union 전환의 영향을 받는다. 정확한 영향 범위는 구현 계획(writing-plans) 단계에서 파일 단위로 조사한다.

### 예시 데이터

**ShoppingSetting (네이버 계정 A로 생성한 설정):**

```json
{
  "id": "setting-naver-a-001",
  "mallAccountId": "account-naver-a",
  "mallCode": "NSST",
  "nickname": "네이버 기본 설정",
  "mallSettings": {
    "afterServiceContact": "1588-0000",
    "purchaseReviewExposure": true,
    "certificationInfo": "KC-2026-001"
  }
}
```

**Product (아직 등록 화면이 없으므로 registeredMalls는 향후 등록 액션이 만들어질 때 채워짐 — 예시는 미래 상태 가정):**

```json
{
  "productId": "P001",
  "name": "무선 이어폰",
  "registeredMalls": [
    {
      "shoppingSettingId": "setting-naver-a-001",
      "mallCode": "NSST",
      "attributes": { "brand": "ACME", "modelName": "AirBud X" }
    }
  ]
}
```

## 다음 라운드로 넘기는 오픈 이슈

1. **ShoppingSetting discriminated union 전환의 파급 범위** — 기존 폼/mock/필터 코드가 얼마나 영향받는지 구현 계획 시점에 파일 단위로 조사 필요.
2. **ShoppingSetting 등록/수정 폼에 `mallSettings` 입력 섹션 추가** — 화면 UX(몰 코드에 따라 다른 서브폼 노출)는 다음 라운드에서 설계.
3. **상품↔ShoppingSetting 결합(등록) 액션 UI** — 아직 없음. ShoppingSetting 몰별 필드 작업이 끝난 뒤 별도 라운드에서 설계.
4. **`registeredMalls`와 `ShoppingSetting` 삭제 시 정합성** — 참조 중인 `shoppingSettingId`가 삭제되면 어떻게 처리할지.
5. **Excel 대량등록 반영 여부** — 별도 작업 목록 태스크(원산지/부가세/성인상품여부의 Excel 반영)와 맞물려 별도 판단.
6. **제외된 몰(쿠팡/지마켓·ESM/오늘의집/무신사 등) 재조사** — 공식 Open API 문서를 직접 확보할 수 있게 되면 재검토.

## 영향받지 않는 것

- 기존 `Product` 필드(원산지/부가세유형/성인상품여부 등 공통 규정 정보)는 변경 없음.
- 기존 상품/설정 데이터는 신규 필드가 모두 optional이므로 마이그레이션 불필요.
