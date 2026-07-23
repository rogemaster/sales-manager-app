---
title: 몰 공통 규정 항목(원산지/부가세/성인상품)은 ShoppingSetting이 아니라 Product 소속이다
date: 2026-07-19
category: architecture-patterns
module: features/products, features/shoppingSetting
problem_type: architecture_pattern
component: domain_modeling
severity: medium
applies_when:
  - 신규 필드를 어느 도메인 엔티티에 넣을지 애매할 때(특히 "쇼핑몰 관련"이라는 이유만으로 ShoppingSetting에 넣으려는 경우)
  - "이 값이 상품마다 다른가, 계정/설정마다 다른가"를 구분해야 할 때
tags:
  - product
  - shoppingSetting
  - domain-modeling
  - scope-boundary
  - brainstorming
---

# 몰 공통 규정 항목(원산지/부가세/성인상품)은 ShoppingSetting이 아니라 Product 소속이다

## Context

"쇼핑몰 정보설정" 화면의 미구현 플레이스홀더 섹션(`ShoppingSettingMallFieldSection`, "쇼핑몰별 필드")을 채우기 위해 사전 자료조사 문서(`docs/research/2026-07-11-mall-specific-fields-research.md`)를 기반으로 브레인스토밍을 진행했다. 조사 결과 원산지/인증정보(KC)/부가세유형/성인상품여부가 대다수 몰에 공통으로 존재하는 항목임을 확인하고, 처음에는 이 4개를 `ShoppingSetting`의 "쇼핑몰별 필드" 영역(→ 공통 필드 영역)에 넣는 방향으로 설계를 시작했다.

그런데 실제로 필드를 배치하려는 단계에서 `ShoppingSetting`이 어떤 성격의 엔티티인지 다시 따져보니 모순이 드러났다. `ShoppingSetting`은 몰 계정에 대한 **재사용 가능한 등록 템플릿**(별칭/상품상태/판매기간/출고지/반품지 — 여러 상품에 공통 적용되는 값)이다. 반면 원산지·부가세유형·성인상품여부는 **상품마다 다른 값**이다. 하나의 설정 프로필로 국내산 상품과 해외수입 상품을 둘 다 등록할 수 있는데, 이 필드들을 설정 템플릿에 넣으면 상품별로 달라질 수 없는 구조가 되어버린다.

## Guidance

**새 필드를 어느 엔티티에 넣을지 판단할 때는 "이 값이 화면 이름(예: 쇼핑몰 정보설정)과 관련 있는가"가 아니라 "이 값이 상품마다 달라지는가, 아니면 설정/계정 단위로 고정되는가"를 기준으로 삼는다.**

- **상품마다 달라짐** → `Product` 소속 (원산지, 부가세유형, 성인상품여부 등 — 실제로는 조사한 "몰 고유 항목"의 대부분도 재검토 결과 상품별 속성으로 재분류됨: 병행수입여부, 혼용률, 실측사이즈 등)
- **설정/계정 단위로 고정되고 여러 상품에 재사용됨** → `ShoppingSetting`/`ShoppingAccount` 소속 (별칭, 판매기간, 출고지/반품지 등)

이미 존재하던 `Product.informationDisclosure`(상품정보고시, 카테고리별 동적 필드)가 이 판단의 근거가 됐다 — "법정 규정 정보"를 상품 단위로 다루는 인프라가 이미 있었다는 점이 원산지·부가세·성인상품여부도 같은 급(Product 소속)이어야 한다는 결론을 뒷받침했다.

## Why This Matters

- 잘못된 엔티티에 필드를 넣으면 나중에 "이 설정으로 등록한 상품 중 일부만 다른 값이 필요하다"는 요구가 나왔을 때 구조를 갈아엎어야 한다.
- 화면 단위(쇼핑몰 정보설정)로 요구사항을 접근하면 "이 화면에 있으니까 이 엔티티"라는 착시가 생기기 쉽다. 실제로 이번에도 최초 설계는 "쇼핑몰 정보설정 화면 - 쇼핑몰별 필드 영역"이라는 화면 이름 때문에 `ShoppingSetting`으로 향했었다.
- 결과적으로 이 라운드에서 "쇼핑몰별 필드 설계"라는 원래 태스크는 "채울 게 없다 → 플레이스홀더 제거"로 끝나고, 실질 구현은 전부 `Product` 도메인으로 이관됐다 — 화면(엔티티) 단위가 아니라 데이터 단위로 스코프를 다시 잡은 결과다.

## When to Apply

- 새 화면/기능을 설계할 때 필드를 어느 엔티티에 둘지 확정하기 전에, "이 값을 같은 설정/계정으로 서로 다른 상품 여러 개에 적용할 수 있는가?"를 먼저 질문한다.
- 답이 "아니오"(상품마다 다를 수 있다)라면 화면 이름과 무관하게 `Product`(또는 상품 단위 엔티티) 쪽에 둔다.
- 매입처·매출처 등 향후 등록 엔티티에도 동일한 판단 기준을 적용한다.

## Related

- `[[origin-field-dual-purpose-registration-code-vs-legal-disclosure]]` — 이 판단 과정에서 함께 확정된 원산지 필드 이중 구조
- `docs/research/2026-07-11-mall-specific-fields-research.md` — 사전 자료조사 문서
- `docs/superpowers/specs/2026-07-19-product-compliance-fields-design.md` — 이 결정이 반영된 설계 문서
- `src/features/shoppingSetting/ui/components/form/ShoppingSettingMallFieldSection.tsx` — 제거된 플레이스홀더 (더 이상 존재하지 않음)
