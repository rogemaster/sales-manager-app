---
title: 참조를 스냅샷으로 바꾸면 소유권 검증 범위도 함께 넓혀야 한다
date: 2026-08-02
category: architecture-patterns
module: mallLinkedProduct
problem_type: security
component: msw-handler
severity: high
applies_when:
  - 기존에 id만 저장하던 필드를 참조 대상의 값 전체(스냅샷)로 바꿀 때
  - 멀티테넌트 데이터에서 요청 본문의 id로 다른 리소스를 조회해 응답에 싣는 API를 만들 때
  - 기존 핸들러의 소유권 검증 로직을 새 핸들러로 그대로 옮길 때
tags:
  - security
  - multi-tenancy
  - ownership
  - snapshot
  - msw
---

# 참조를 스냅샷으로 바꾸면 소유권 검증 범위도 함께 넓혀야 한다

## Context

`Product.registeredMalls`(연동 이력)를 독립 엔티티 `MallLinkedProduct`로 전환하면서, 연동 데이터가 전송 시점의 상품·설정 값을 **스냅샷으로 복사해 보유**하도록 바꿨다.

전송 핸들러의 소유권 검증은 기존 핸들러에서 그대로 옮겼다. 상품 소유권만 확인한다.

```ts
// 옮겨온 검증 — 상품만 본다
const productIds = [...new Set(items.map((item) => item.productId))];
if (!areProductsOwnedBy(productIds, ownerId)) {
  return new HttpResponse(null, { status: 403 });
}
```

그런데 생성 유틸은 `item.shoppingSettingId`로 **전역 설정 배열**을 조회해 `ShoppingSetting` 전체(`mallId`, `mallSettings`, 출고지·반품지 주소)를 `settingSnapshot`으로 복사하고, 그 레코드에 **요청자의 `ownerId`**를 찍는다.

목록 API는 레코드 자신의 `ownerId`만 보고 필터링한다. 따라서 **내 상품 + 남의 설정 id** 조합으로 전송하면 다른 테넌트의 설정 내용이 내 화면에 렌더링된다. 설정 id는 `ss_001` 같은 순차 문자열이라 추측도 쉽다.

## Root Cause

**옮겨온 검증 로직은 옛 데이터 모델에서는 충분했다.**

옛 `registeredMalls`는 `shoppingSettingId`라는 **id만** 저장했다. 검증되지 않은 id가 들어와도 저장되는 건 문자열 하나뿐이고, 그 id로 설정을 조회해 보여주는 코드는 없었다. 노출될 데이터가 애초에 없었다.

스냅샷을 도입하는 순간 같은 id가 **데이터를 끌어오는 열쇠**로 바뀌었다. 코드는 한 줄도 바뀌지 않았는데 그 코드가 지키던 경계의 의미가 달라진 것이다.

이 갭은 구현 실수가 아니라 **계획서가 "소유권 검증은 기존 핸들러에서 그대로 옮긴다"고 지시한 결과**다. 계획을 쓸 때 모델 변경이 검증 범위에 미치는 영향을 따지지 않았다.

## Guidance

**요청 본문의 모든 id에 대해, 그 id로 무엇을 하는지 확인하고 각각 소유권을 검증한다.**

```ts
// src/mocks/utils/verifyOwnership.ts
export const areMallLinkRequestsOwnedBy = (items: MallLinkedProductRequestItem[], ownerId: string | null) => {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const settingIds = [...new Set(items.map((item) => item.shoppingSettingId))];

  return (
    areProductsOwnedBy(productIds, ownerId) &&
    allOwnedBy(settingIds, ownerId, MOCK_SHOPPING_SETTINGS_DATA)
  );
};
```

핸들러는 한 줄 위임만 한다 (`.claude/rules/msw-rules.md`).

**점검 질문:** 이 id로 조회한 결과가 응답이나 저장 데이터에 실리는가? 실린다면 그 리소스의 소유권도 검증 대상이다. "이미 검증된 다른 id와 함께 왔다"는 이유로 통과시키지 않는다.

## Why This Matters

- 검증 로직을 복사해 옮기는 것은 **가장 안전해 보이는 작업**이라 리뷰에서도 그냥 통과하기 쉽다. 실제로 Task 단위 리뷰 6회를 전부 통과했고, 브랜치 전체를 한 번에 본 최종 리뷰에서야 잡혔다.
- 같은 라운드에 **중복 판정 로직**도 테넌트 경계를 넘어 스캔하고 있었다(남의 성공 이력 때문에 내 전송이 "이미 등록됨"으로 표시됨). 하나가 새면 같은 파일의 다른 스캔도 의심할 것.
- 스냅샷은 편의를 위한 저장 방식 변경처럼 보이지만, **읽기 권한 경계를 이동시키는 변경**이다.

## When to Apply

- id 필드를 값 복사(비정규화·스냅샷·캐시)로 바꾸는 모든 작업
- 기존 코드에서 검증·인가 로직을 이식할 때 — "이 검증이 무엇을 지키고 있었는가"를 새 문맥에서 다시 물을 것
- 배치 요청(`items[]`)을 받는 핸들러 — 항목마다 서로 다른 리소스 종류의 id가 섞여 있으면 종류별로 검증이 필요하다

## Related

- `[[registered-malls-history-vs-current-state]]` — 이 전환이 뒤집은 선행 설계 결정
- `[[consumer-screen-determines-data-model]]` — 스냅샷 도입을 부른 요구사항
- `.claude/rules/domain-design.md` — ownerId 테넌트 격리 규칙
