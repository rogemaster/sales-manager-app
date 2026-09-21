---
title: 같은 쓰기 경로의 jsonb 컬럼에 정화 정책이 갈리면 임의 값이 조용히 쌓인다
date: 2026-09-21
category: architecture-patterns
module: app/api/shopping/settings, features/shoppingSetting/util
problem_type: architecture_pattern
component: api_design
severity: medium
applies_when:
  - 한 route가 jsonb(문서형) 컬럼을 두 개 이상 쓸 때
  - 그중 일부만 화이트리스트·정화 함수를 거치고 나머지는 캐스팅으로 넘길 때
  - 그 컬럼의 값이 나중에 스냅샷으로 복사되거나 외부 시스템으로 전송될 때
  - 검증 함수가 "필요한 키가 있는가"만 보고 "그 외 키를 버리는가"는 보지 않을 때
symptoms:
  - 폼을 거치지 않은 요청이 문서형 컬럼에 모르는 키를 넣어도 아무도 막지 않는다
  - 같은 함수 안에서 한 컬럼은 정화되고 다른 컬럼은 그대로 저장된다
  - 저장 시점에는 아무 증상이 없고, 그 값을 외부로 보내는 훨씬 나중 단계에서 드러난다
tags:
  - jsonb
  - validation
  - whitelist
  - drizzle
  - snapshot
---

# 같은 쓰기 경로의 jsonb 컬럼에 정화 정책이 갈리면 임의 값이 조용히 쌓인다

## Context

쇼핑몰 정보설정을 DB로 옮기면서 `shopping_settings`에 jsonb 컬럼 세 개가 생겼다 —
`mall_settings`(몰 고유 설정), `shipping_address`(출고지), `return_address`(반품지).

`mall_settings`는 처음부터 정화를 거치도록 설계했다. 몰마다 필드가 다른 판별 유니온이라
"네이버 설정을 카카오로 바꿨는데 네이버 필드가 잔병처럼 남는" 문제가 눈에 보였기 때문이다.
그래서 `sanitizeMallSettings(mallCode, values)`가 몰에 맞는 키만 남기고 나머지를 버린다.

주소 두 개는 그렇게 하지 않았다. 쓰기 검증(`findShoppingSettingWriteViolation`)이
`code`·`name`·`zipCode`·`address`·`addressDetail` 다섯 키가 **있고 모양이 맞는지**를 확인하니
충분해 보였고, route는 그 값을 `as` 캐스팅으로 컬럼에 넣었다.

Task 단위 리뷰 여섯 번이 이것을 지나쳤다. 각 리뷰는 자기 Task의 코드가 브리프대로인지를 보았고,
주소 처리는 브리프대로였다. 브랜치 전체 리뷰에서야 **같은 함수 안에 두 정책이 있다**는 것이 보였다.

## Guidance

**검증과 정화는 다른 일이다.** "필요한 키가 다 있고 모양이 맞는가"(검증)를 통과해도
"그 외 키가 없는가"(정화)는 아무도 확인하지 않는다. 문서형 컬럼은 스키마가 값을 걸러주지 않으므로
정화를 생략하면 사용자가 보낸 것이 그대로 남는다.

```ts
// 검증만 한 상태 — 다섯 키가 맞는지는 봤지만 여섯 번째 키는 그대로 저장된다
shippingAddress: body.shippingAddress as MallAddress,

// 정화까지 — 아는 키만 남긴다. 검증이 이미 끝났으므로 좁히기만 하면 된다
shippingAddress: pickMallAddress(body.shippingAddress),
```

**한 route가 문서형 컬럼을 여럿 쓰면 정책을 하나로 맞춘다.** 정책이 갈리는 것 자체가 신호다 —
한쪽에 정화가 필요했다면 다른 쪽에도 대개 필요하다. 어느 한쪽만 하기로 했다면 왜 그런지를
주석에 남겨, 다음 사람이 "빠뜨린 것"으로 읽지 않게 한다.

**저장 시점의 무해함을 근거로 삼지 않는다.** 이 프로젝트에서 주소 jsonb는 그 자리에서 끝나지 않는다.
연동상품이 전송 시점에 설정을 **스냅샷으로 복사**하고, 그 스냅샷이 외부몰로 가는 payload가 된다.
즉 쓰기 route에서 새어든 키는 두 단계 뒤 외부 시스템에 도착한다. 문서형 컬럼의 값이
어디까지 흘러가는지를 먼저 그려보고 정화 여부를 정한다.

## 왜 Task 단위 리뷰가 못 잡는가

이 결함은 **한 Task 안에서는 결함으로 보이지 않는다.** 주소를 저장하는 코드는 그 Task의 명세대로였고,
`mallSettings`를 정화하는 코드도 자기 명세대로였다. 둘을 나란히 놓아야 비대칭이 드러난다.

교훈은 리뷰 방식 쪽에 있다 — **"이 파일 안에서 같은 종류의 값이 서로 다르게 처리되는가"**는
Task 리뷰가 구조적으로 묻지 못하는 질문이라, 브랜치 전체 리뷰가 따로 필요하다.

## 관련

- `display-label-to-domain-code-boundary.md` — 층마다 역할을 나눠 값을 좁히는 같은 계열의 문제
- `client-supplied-snapshot-immutable-field-restore-scope.md` — 클라이언트가 보낸 구조를 서버가 어디까지 되돌리는가
- `public-column-projection-as-single-leak-gate.md` — 읽기 쪽의 대응물(컬럼 목록 하나를 관문으로 삼기)
