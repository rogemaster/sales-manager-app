---
title: registeredMalls는 전송 이력이 아니라 조합별 현재 상태다 — 소비 화면이 데이터 모델을 결정한다
date: 2026-07-29
category: architecture-patterns
module: mallRegistration
problem_type: design-decision
component: data_model
severity: medium
applies_when:
  - `Product.registeredMalls`를 읽거나 쓰는 코드를 작성할 때
  - 배열형 하위 데이터를 append(이력)로 할지 upsert(현재 상태)로 할지 정할 때
tags:
  - data-model
  - upsert
  - domain-design
  - yagni
  - mall-registration
superseded_by: docs/superpowers/specs/2026-08-01-mall-linked-product-list-design.md
---

# registeredMalls는 전송 이력이 아니라 조합별 현재 상태다

> **⚠️ Superseded (2026-08-01).** 이 문서가 확정한 `Product.registeredMalls`(조합당 1건 upsert)는 이후 라운드에서 뒤집혔다. "연동 데이터의 수정은 원본을 건드리지 않고 별도로 이루어진다"는 요구가 나오면서, 오리지널 상품에 상태 메타데이터만 얹는 방식으로는 상품·설정 값 자체의 스냅샷을 가질 수 없다는 게 드러났다. 지금 유효한 모델은 `Product`/`ShoppingSetting`과 분리된 독립 엔티티 `MallLinkedProduct`이며, 같은 조합이라도 매 전송마다 새 레코드가 append된다(중복 연동 허용) — 이 문서의 upsert 결론과 정반대다. 현재 모델과 마이그레이션 배경은 `docs/superpowers/specs/2026-08-01-mall-linked-product-list-design.md`를 참고할 것. 아래 append vs upsert에 대한 추론 과정(소비 화면이 데이터 모델을 결정한다는 논지)은 여전히 유효하므로 남겨둔다.

## Context

`Product.registeredMalls`는 처음에 **append-only 이력**으로 설계됐다(`2026-07-28-mall-registration-action-ui-design.md`). 근거는 "같은 상품을 같은 몰-설정 조합으로 여러 번 등록할 수 있다(재입고·재노출)"였다.

이후 실패 UI를 어디에 둘지 논의하면서 방향이 정해졌다 — **실패는 "전송 순간의 알림"이 아니라 "등록 상품이 가진 상태"이고**, 사용자는 후속 "쇼핑몰 등록 상품 목록" 화면에서 실패 사유를 보고 → 수정 → 재전송한다.

이 결정이 데이터 모델의 전제를 무너뜨렸다.

## Decision

**`mallCode + shoppingSettingId` 조합 단위 upsert로 전환한다.** 조합당 항상 1건만 유지하며, 재전송은 새 항목 추가가 아니라 기존 항목의 상태 갱신이다.

```ts
export interface MallRegistration {
  id: string;                      // 최초 생성 시 부여, 갱신 시 유지 (목록 화면의 행 key)
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  status: 'success' | 'failed';
  registeredAt: string;            // 마지막 전송 시각
  externalId?: string;             // 성공 시 외부몰이 부여한 상품 ID
  errorMessage?: string;           // 실패 시 사유
}
```

**필드 전이 규칙** — 이 표가 구현의 핵심이다:

| 전이 | `errorMessage` | `externalId` |
|------|----------------|--------------|
| (신규) → 성공 | 없음 | 새로 발급 |
| 실패 → 성공 | **삭제** | 새로 발급 (실패 항목엔 기존 값이 없다) |
| 성공 → 성공 (재전송) | 없음 | **보존 — 재발급하지 않는다** |
| 성공 → 실패 | 새 사유로 설정 | **보존** |

구현상 `existing.externalId ??= createExternalId(...)` 여야 한다. **무조건 대입하면 재전송마다 외부 ID가 바뀐다** — 실제로 이 버그가 발생했고 최종 리뷰에서 잡혔다.

## Rationale

**append를 버린 이유:**

- "실패건을 보고 수정 후 재전송"하면 같은 상품+몰 조합이 `실패` 행과 `성공` 행으로 **두 줄 쌓인다.** 사용자가 기대하는 건 조합당 한 줄이 상태만 바뀌는 모습이다.
- 목록 화면이 "조합별 최신 1건 고르기" 로직을 매번 돌려야 하고, 배열이 무한히 커진다.
- **외부 몰 API의 실제 의미와도 upsert가 맞다** — 이미 등록된 상품의 재전송은 신규 등록이 아니라 수정(update)이고, 외부몰은 같은 상품 ID를 그대로 돌려준다. `externalId`가 조합당 하나만 유효한 이유가 이것이다.

**이력을 포기한 게 아니다.** "언제 몇 번 보냈는가"가 필요해지면 `Product` 안의 배열이 아니라 별도 엔티티(전송 단위 job + 진행률)로 분리한다. 지금은 이를 소비할 화면이 없다(YAGNI).

## Why This Matters

**소비 화면의 용도가 데이터 모델을 뒤집었다.** 처음의 append 설계는 그 자체로 틀리지 않았다 — "재등록 가능"이라는 도메인 사실에서 자연스럽게 나온 결론이었다. 바뀐 건 이 배열을 **누가 어떻게 읽느냐**였고, 그것이 정해지자 같은 도메인 사실에서 반대 결론이 나왔다.

저장 구조를 정할 때 "이 데이터를 어떤 화면이 어떻게 렌더링하는가"를 먼저 그려보면, 이런 뒤집기를 구현 전에 잡을 수 있다.

## Known Limitations

- **전송 결과는 인메모리 `MOCK_PRODUCT_DATA`에만 존재한다.** 새로고침하면 전부 사라진다. 후속 "쇼핑몰 등록 상품 목록" 화면은 첫날부터 시드 데이터가 필요하다.
- **`id` 생성이 시간 기반이다** (`mr_${Date.now()}_${index}`). 같은 밀리초 + 같은 index면 서로 다른 상품 간에 id가 충돌할 수 있다. 800ms 지연과 사용자 조작 특성상 UI로는 도달 불가하지만, 후속 화면이 전 상품의 `registeredMalls`를 한 테이블로 평탄화하면 React key 중복으로 드러날 수 있다.
- `registeredMalls`가 참조하는 `shoppingSettingId`가 삭제됐을 때의 정합성 처리는 아직 없다.

## Related

- `[[mall-registration-external-api-gateway]]` — "몰 등록 = 외부 전송"이라는 상위 도메인 결정
- `[[deterministic-random-stub-vacuous-test]]` — `externalId` 재발급 버그를 테스트가 놓친 이유
- `[[msw-response-shape-not-type-checked-against-frontend]]` — 같은 작업에서 드러난 타입 안전망 부재
- `[[mall-account-to-setting-one-to-many-pattern]]` — `shoppingSettingId`가 가리키는 설정 구조
