---
title: 가짜 외부 서비스의 검증 규칙은 우리 것과 일부러 달라야 한다
date: 2026-09-19
category: architecture-patterns
module: simulators/naver, app/api/external
problem_type: architecture_pattern
component: test_double
severity: high
applies_when:
  - 외부 시스템의 대역(시뮬레이터·가짜 서버·스텁)을 프로젝트 안에 세울 때
  - "검증 책임은 외부에 있다"처럼 판정 주체가 밖에 있다고 적어둔 규칙을 실제로 집행하려 할 때
  - 대역의 검증 규칙을 우리 쓰기 스키마에서 공유(재사용)할지 정해야 할 때
  - 대역이 돌려준 실패를 어댑터가 받아 우리 도메인으로 옮길 때
symptoms:
  - 전송이 항상 성공해서 실패 처리 경로(재전송·오류 사유 표시)가 한 번도 실행되지 않는다
  - 실패를 만들려면 Math.random()으로 지어내야 한다
  - 대역과 본체가 같은 검증 함수를 공유해 "거절"이 구조적으로 불가능하다
tags:
  - simulator
  - test-double
  - validation
  - external-api
  - naver
  - boundary
---

# 가짜 외부 서비스의 검증 규칙은 우리 것과 일부러 달라야 한다

## Context

이 프로젝트에는 외부몰 API 승인·테스트 계정이 없어 **전송을 받는 쪽이 없었다.** 그래서
도메인 규칙 셋이 집행 주체 없이 문서로만 존재했다.

- `externalProductId` 유무가 신규/수정의 단일 판정 기준 → **발급 주체가 없음**
- `status`는 "마지막 전송이 성공했는가" → 판정 주체가 없어 MSW가 `Math.random()`으로 지어냄
- "검증 책임은 외부 쇼핑몰에 있다"(`domain-design.md`) → **검증하는 외부몰이 없어 집행 불가능**

`src/simulators/naver/`로 가짜 스마트스토어를 세우면서 자연스럽게 나온 질문이 "검증은
우리 `findProductWriteViolation`을 재사용하면 되지 않나"였다. 코드 중복이 없고 두 쪽이
영원히 어긋나지 않는, 겉보기에 더 나은 안이다.

## Guidance

**대역이 본체와 같은 규칙을 쓰면 실패가 구조적으로 불가능해진다. 대역을 세우는 목적이
실패 경로를 살리는 것이라면, 규칙은 일부러 달라야 한다.**

우리 쓰기 스키마를 통과한 데이터는 정의상 우리 규칙을 만족한다. 대역이 같은 함수로
검사하면 **전송은 항상 성공**하고, 애초에 대역을 만든 이유(거절당하는 경로를 실제로
돌려보는 것)가 사라진다. 판정 주체를 세워 놓고 판정을 하지 않는 셈이다.

그래서 시뮬레이터의 수치는 네이버 문서에서 빌리되, **우리 값과 겹치지 않는 쪽**으로 잡았다.

| 검사 | 시뮬레이터 | 우리 쪽 | 결과 |
|---|---|---|---|
| `name` 길이 | 100자 | 쓰기 스키마 200자 | 101~200자 상품은 **실제로 거절된다** |
| `salePrice` | ≤ 999,999,990 | ≤ 2,147,483,647 | 그 사이 값이 거절된다 |
| `stockQuantity` | ≤ 99,999,999 | 더 큼 | 상동 |
| `statusType` | `WAIT`·`SALE`·`OUTOFSTOCK`·`SUSPENSION` | `WAIT_SALE`·`ON_SALE`·`SOLD_OUT`·`SALE_DIS` | 1:1이지만 **표기가 달라 변환이 필요하다** |
| `deliveryFeeType` | `PAID` | `NOT_FREE` | 한 값만 표기가 다르다 |

상품명 100자 제한 하나만으로도 "전송 실패 → 사유 확인 → 수정 → 재전송" 흐름이 실물로
돌아간다.

**같은 이유로 상수도 import하지 않고 복제한다.** `NAVER_DELIVERY_COMPANIES`는
`@/shared/constant/delivery.constant`와 값이 같지만 별도 정의다 — 우리가 택배사를
하나 추가했다고 외부몰이 그것을 받아주게 되면 안 되기 때문이다. 이 금지는 주석이 아니라
ESLint로 집행한다(`import-ban-as-network-boundary.md`).

## 잘못 읽기 쉬운 것

**"규칙이 다르다"를 결함으로 읽지 말 것.** 다음 라운드에서 어댑터를 쓸 때 가장 하기 쉬운
실수가 `slice(0, 100)`으로 조용히 맞춰 보내는 것이다. 그러면 이 라운드의 존재 이유가
사라진다 — **실패는 그대로 `errorMessage`로 올린다.**

반대 방향의 어긋남도 있다. 실제 구현에서 `productInfoProvidedNotice`는 객체 여부만
검사하므로 `{}` 하나로 통과하는데, **우리 엑셀 경로는 `{key,id,name,fields}`를 채운다.**
즉 이 필드만큼은 우리가 외부몰보다 엄격하다. 대역의 느슨함을 "우리도 느슨해도 된다"로
읽으면 안 된다.

## Implementation

- 검증은 첫 위반에서 멈추지 않고 `invalidInputs[]`에 **전부 모아** 돌려준다. 사용자가 한
  번에 고칠 수 있어야 한다.
- 서비스는 HTTP를 모른다. `SimulatorResult<T>`(`ok` + `reason`)를 돌려주고 route가
  상태코드로만 번역한다. 덕분에 route 없이 서비스 테스트로 전 경로를 돌릴 수 있다.
- `INVALID`와 `DUPLICATE`는 둘 다 400으로 나가지만 **서비스 안에서는 구분**한다. 테스트가
  "중복이라 거절"과 "필드가 틀려 거절"을 각각 단언해야 하기 때문이다.
- 중복 판정은 **판매자 + 상품명**(`lower(btrim(name))`) 기준이다. `customerCode`는
  선택값이라 코드 기준 판정이 성립하지 않는다.
- 이름 정규화는 앱과 DB 유니크 인덱스 양쪽에 있다. 처음에 JS `.trim()` vs Postgres
  `btrim`으로 어긋나 **탭이 섞인 이름이 중복 검사를 빠져나갔다.** 지금은
  `replace(/^ +| +$/g, '')`로 맞췄다 — `customerCode`에서 겪은 것과 같은 유형이다
  (`partial-unique-index-predicate-must-match-deployed-writers.md`).

## 판별 기준

프로젝트 안에 외부 시스템의 대역을 세울 때:

> **이 대역이 "아니오"라고 말할 수 있는가? 그 "아니오"를 만들려면 무엇이 필요한가?**
>
> - 대역이 본체와 같은 검증을 쓴다 → 아니오가 나올 수 없다. **대역이 아니라 통과 장치다.**
> - 실패를 만들려고 난수를 쓰고 있다 → 판정 주체가 아직 없다는 신호다.
> - 대역만의 규칙이 있고 그중 일부가 우리 규칙보다 좁다 → 실패 경로가 살아 있다.

관련: `.claude/rules/domain-design.md`의 "검증 책임은 외부 쇼핑몰에 있다" 절,
`docs/superpowers/specs/2026-09-19-naver-simulator-design.md`(구현 결과·순서 4 착수 전 확인 8건)
