---
title: 외부몰 오류는 어댑터 경계에서 화면 언어로 번역한다 — 이름은 우리 것으로, 사유와 판정은 외부몰 것 그대로
date: 2026-09-23
category: architecture-patterns
module: "features/mallLinkedProduct/util, features/mallLinkedProduct/server"
problem_type: architecture_pattern
component: module_boundary
severity: medium
applies_when:
  - 외부 API가 돌려준 검증 실패를 사용자에게 보여줄 문자열로 저장할 때
  - 외부 API의 필드 이름이 우리 화면의 필드 이름과 다를 때
  - 어댑터가 우리 도메인 값을 외부 요청 모양으로 바꿀 때
symptoms:
  - "연동 실패 사유에 'leafCategoryId: 필수 값입니다.'가 그대로 떠서 사용자가 무엇을 고쳐야 할지 모른다"
tags:
  - adapter
  - error-message
  - external-api
  - naver-simulator
  - mallLinkedProduct
  - i18n-label
---

# 외부몰 오류는 어댑터 경계에서 화면 언어로 번역한다 — 이름은 우리 것으로, 사유와 판정은 외부몰 것 그대로

## Context

연동상품을 네이버(시뮬레이터)로 보내면, 실패할 때 네이버 모양의 오류가 돌아온다. `{ message, invalidInputs: [{ name: 'leafCategoryId', type: 'REQUIRED', message: '필수 값입니다.' }] }` 같은 형태다. 처음 구현은 이것을 그대로 이어 붙여 `errorMessage`에 저장했고, 화면에는 이렇게 떴다.

> 요청 값이 올바르지 않습니다. — leafCategoryId: 필수 값입니다.

사용자 확인(2026-09-23)에서 바로 걸렸다. *"사용자 입장에서는 leafCategoryId가 무엇인지 모름."* 원인 자체도 모르는 게 아니었다. 엑셀로 등록한 상품 35건 중 14건이 카테고리가 비어 있었는데, 그 사실이 외부몰 필드 이름 뒤에 숨어 있었다.

## Guidance

**외부몰의 오류를 우리 쪽으로 옮기는 곳, 즉 어댑터에서 필드 이름을 우리 화면 이름으로 바꾼다. 외부몰이 내린 판정과 사유 문구는 바꾸지 않는다.**

```ts
// 외부몰 필드 이름 → 우리 화면 이름. 요청을 만드는 어댑터가 외부 필드를 아는 유일한 곳이라 여기 둔다.
const FIELD_LABELS: Record<string, string> = {
  leafCategoryId: '카테고리',
  name: '상품명',
  salePrice: '판매가',
  'deliveryInfo.deliveryCompany': '택배사',
  'deliveryInfo.shippingAddressId': '출고지',
  // ... 시뮬레이터가 낼 수 있는 필드 전부
};

// REQUIRED → "카테고리가 없습니다." (받침에 따라 이/가를 고른다)
// 그 밖의 type → "상품명: 100자 이하여야 합니다." (사유는 외부몰 문구 그대로)
```

- **요청 전체에 대한 머리말**("요청 값이 올바르지 않습니다.")은 뺀다. 필드 오류가 있으면 그게 곧 사유다.
- **표에 없는 필드는 원래 이름을 그대로 둔다.** 번역에 실패해도 정보는 잃지 않는다.
- **수치를 우리가 다시 적지 않는다.** "100자 이하"는 외부몰 규칙이다. 우리가 문구를 새로 쓰면 외부 규칙이 바뀔 때 어긋난다.

같은 경계에서 반대 방향 규칙도 지킨다. **요청을 만들 때는 값을 고치지 않는다.** 긴 상품명을 자르거나 빈 필수값을 채우지 않는다. 빈 문자열도 "값 없음"으로 바꿔 빼지 않고 그대로 보낸다. `optional()`이 `''`를 버리던 초기 구현은 리뷰에서 걸려 고쳤다. `taxType: ''`이면 시뮬레이터가 코드값 오류로 거절해야 하는데, 빼 버리면 조용히 통과하기 때문이다.

## Why This Matters

- **번역과 판정은 층이 다르다.** "검증 책임은 외부몰에 있다"(`domain-design.md`)는 판정을 외부몰이 한다는 뜻이다. 판정 결과를 사람이 읽을 말로 바꾸는 것은 우리 몫이다. 이 둘을 섞으면, 판정을 빌려오는 대신 판정을 흉내 내거나(값 보정), 번역을 떠넘기는(외부 필드명 노출) 쪽으로 무너진다.
- **어댑터가 외부 필드 이름을 아는 유일한 곳이다.** 요청을 만들 때 `categoryId → leafCategoryId` 매핑을 이미 알고 있다. 번역 표를 화면 쪽에 두면 외부몰 필드 이름이 UI로 새어 나가고, 몰이 늘 때마다 화면 코드가 몰을 알아야 한다.
- **실패를 숨기지 않아야 번역할 실패가 생긴다.** 어댑터가 빈 카테고리를 기본값으로 채웠다면, 14건의 카테고리 누락은 외부몰에서 조용히 틀린 상품으로 등록됐을 것이다.

## When to Apply

- 외부 시스템의 검증 결과를 사용자에게 그대로 보여줘야 할 때
- 외부 필드 이름과 우리 필드 이름이 다를 때. 같더라도 표를 두면 몰을 추가할 때 자리가 있다.

> **판별 질문:** 이 문자열을 바꾸면 "외부몰이 뭐라고 판정했는가"가 달라지는가? 달라지면 손대지 않는다(사유·판정). 달라지지 않으면 우리 말로 바꾼다(필드 이름·머리말).

## Examples

| 외부몰 응답 | 저장되는 `errorMessage` |
|---|---|
| `leafCategoryId` REQUIRED | `카테고리가 없습니다.` |
| `name` LENGTH "100자 이하여야 합니다." | `상품명: 100자 이하여야 합니다.` |
| `name` DUPLICATE "이미 등록된 상품명입니다." | `상품명: 이미 등록된 상품명입니다.` |
| `deliveryInfo.shippingAddressId` NOT_FOUND | `출고지: 주소록에 없는 출고지입니다.` |
| 필드 오류 여러 개 | ` / `로 잇는다 |
| 401 | `쇼핑몰 인증에 실패했습니다. 계정의 API Key를 확인해주세요.` |
| 5xx, 타임아웃, 모양이 다른 본문 | `외부 쇼핑몰 응답 없음` |

**받침 판정** (한글 음절 U+AC00–U+D7A3): `(code - 0xAC00) % 28 !== 0`이면 "이", 아니면 "가"를 붙인다. 한글이 아닌 글자로 끝나면(`모델ID`) "가"를 쓴다.

관련: `fake-external-service-rules-must-differ-from-ours.md` (어댑터가 실패를 숨기면 안 된다는 경고 — 이 문서가 그 후속), `import-ban-as-network-boundary.md` (같은 경계의 import 규칙)
