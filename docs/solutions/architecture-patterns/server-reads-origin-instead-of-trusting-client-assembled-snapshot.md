---
title: 스냅샷 교체는 클라이언트가 조립해 보내지 말고 id만 보내 서버가 원본을 읽어 복사하게 한다
date: 2026-08-27
category: architecture-patterns
module: features/mallLinkedProduct, mocks/utils
problem_type: architecture_pattern
component: api_contract
severity: medium
applies_when:
  - 스냅샷 데이터(원본과 독립적으로 복사해 보유하는 데이터)를 통째로 교체해야 할 때
  - 교체 대상에 수정되면 안 되는 불변 식별 필드가 섞여 있을 때
  - 한 번의 요청이 여러 레코드를 동시에 바꿀 때
tags:
  - snapshot
  - immutable-fields
  - api-contract
  - responsibility-split
  - bulk-edit
  - mallLinkedProduct
---

# 스냅샷 교체는 클라이언트가 조립해 보내지 말고 id만 보내 서버가 원본을 읽어 복사하게 한다

## 배경

`MallLinkedProduct`는 오리지널 상품·설정과 **독립된 스냅샷**을 들고 있다. 오리지널을 고쳐도 전파되지 않는다([`domain-design.md`](../../../.claude/rules/domain-design.md)).

그런데 `settingSnapshot` 안에는 **수정되면 안 되는 값**이 섞여 있다 — `mallCode`, `mallAccountId`, `mallId`. 연동 1건 = **특정 계정으로** 등록된 외부몰 상품 1개이므로, 계정이 바뀌면 그건 같은 상품의 수정이 아니라 **다른 상품**이다.

## 두 가지 책임 분담이 이미 공존하고 있었다

이 프로젝트에는 스냅샷을 만드는 경로가 두 개 있었고, 안전성이 서로 달랐다.

| 경로 | 클라이언트가 보내는 것 | 불변 필드를 지키는 주체 |
|------|----------------------|----------------------|
| **생성** (`createMockMallLinkedProducts`) | `{ productId, mallCode, shoppingSettingId }` | **서버가 원본에서 읽어 복사** — 어긋날 여지가 없다 |
| **수정** (`updateMockMallLinkedProduct`) | 완성된 스냅샷 전체 | 서버가 받은 스냅샷에서 불변 필드만 **되돌린다** |

수정 쪽은 "지켜내는 필드 목록"이 곧 규칙의 실효 범위다. 목록에서 하나 빠지면 조용히 뚫린다.

## 결정

**일괄 설정 교체는 생성 쪽 방식을 따랐다.** 클라이언트는 `shoppingSettingId` 하나만 보낸다.

```ts
export interface BulkUpdateMallLinkedProductsBody {
  ids: string[];
  shoppingSettingId?: string;   // 스냅샷이 아니라 id만
}
```

서버가 오리지널 `ShoppingSetting`을 읽어 `structuredClone`으로 스냅샷을 만든다. 클라이언트는 애초에 불변 필드를 손댈 기회가 없다.

**근거:** 일괄수정은 한 번에 N건을 바꾼다. 클라이언트가 스냅샷을 조립하는 방식은 실수의 파급이 N배가 되는데, 마침 더 안전한 선례가 같은 코드베이스에 이미 있었다.

## 그래도 서버 방어선은 남긴다

id만 받아도 검사는 필요하다 — 사용자가 **다른 계정의 설정**을 고를 수 있기 때문이다.

```ts
const isApplicableSetting = (linked, setting) =>
  setting.mallCode === linked.mallCode &&
  setting.mallAccountId === linked.settingSnapshot.mallAccountId &&
  setting.mallId === linked.settingSnapshot.mallId;
```

불일치면 그 건은 적용하지 않고 실패로 센다. UI에서 이미 같은 몰·계정으로 좁히지만, **이 서버 검사가 실제로 일을 했다.**

리뷰 과정에서 클라이언트 가드에 구멍이 발견됐다 — 일괄수정 후 선택을 유지하는데(의도된 동작), 리페치 결과에서 일부 행이 필터에 안 걸려 사라지면 화면에 없는 id가 선택에 남는다. 이때 클라이언트의 동질성 검사는 **남은 부분집합만 보고 통과한다.** 사라진 행까지 요청에 실리는 것을 막는 건 서버의 `isApplicableSetting`이다.

**교훈:** "UI에서 이미 막으니 서버 검사는 형식적"이라는 판단은 틀렸다. UI 가드는 화면에 보이는 것만 알고, 선택 상태는 화면보다 오래 산다.

## 함께 갱신해야 하는 것 — 출처 표시

스냅샷을 통째로 갈면 top-level `sourceShoppingSettingId`도 새 설정 id로 갱신한다.

**이유는 화면에 있다.** 목록의 정보설정 필터는 top-level `sourceShoppingSettingId`를 보고, 테이블의 쇼핑몰정보설정 컬럼은 `settingSnapshot.nickname`을 본다. 둘을 어긋나게 두면 **"B설정으로 필터했는데 별칭이 B인 행이 안 나온다"**가 된다.

## 판별 질문

스냅샷을 교체하는 API를 설계할 때:

1. **교체할 값의 원본이 서버에 있는가?** → 있으면 id만 받아라. 클라이언트가 조립할 이유가 없다
2. **교체 대상에 불변 필드가 섞여 있는가?** → 섞여 있으면 서버 검사는 필수다. UI 가드로 대신할 수 없다
3. **top-level에 그 스냅샷을 가리키는 참조가 있는가?** → 있으면 함께 갱신해야 필터와 표시가 어긋나지 않는다

관련: [`docs/superpowers/specs/2026-08-27-mall-linked-product-bulk-edit-design.md`](../../superpowers/specs/2026-08-27-mall-linked-product-bulk-edit-design.md), [`2026-08-03-mall-linked-product-edit-resend-design.md`](../../superpowers/specs/2026-08-03-mall-linked-product-edit-resend-design.md)
