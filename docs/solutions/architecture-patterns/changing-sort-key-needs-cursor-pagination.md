---
title: 정렬 기준 값이 바뀌는 목록은 offset이 아니라 커서로 넘긴다 — 페이지 사이 상태 변경이 아직 읽지 않은 행을 건너뛰게 한다
date: 2026-10-01
category: architecture-patterns
module: simulators/naver/orderService, simulators/naver/repository, app/api/external/naver/product-orders
problem_type: architecture_pattern
component: api_design
severity: medium
applies_when:
  - "변경 시각 이후 바뀐 것"을 여러 페이지로 돌려주는 조회 API를 설계할 때
  - 정렬 기준 컬럼(last_changed_at 등)이 다른 쓰기(상태 변경)로 갱신될 때
  - 호출자가 페이지를 읽는 도중에 그 행들의 상태를 바꿀 수 있을 때(수집 → 발주확인)
symptoms:
  - 페이지를 끝까지 읽었는데 일부 행을 한 번도 받지 못한다
  - 빠진 행은 다음 수집의 기간 조건보다 과거라 이후에도 다시 잡히지 않는다
tags:
  - pagination
  - cursor
  - offset
  - api-design
  - order-collection
---

# 정렬 기준 값이 바뀌는 목록은 offset이 아니라 커서로 넘긴다

## Context

주문 DB화 라운드 2에서 네이버 시뮬레이터에 "변경 주문 조회" API를 만들었다(`GET /api/external/naver/product-orders`). 조건은 `last_changed_at >= From`, 정렬은 `last_changed_at, product_order_id` 오름차순, 페이지 크기는 50이다. 처음에는 `page`(offset)로 넘겼다.

`last_changed_at`은 발주확인·발송처리 때 지금 시각으로 바뀐다. 라운드 3 수집기는 "받은 주문을 저장하고 발주확인"을 하게 되는데, 이것이 페이지 사이에 끼면 offset이 깨진다(최종 리뷰에서 발견, 2026-10-01).

페이지 크기 3으로 줄인 예:

| 주문 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| last_changed_at | 10:00 | 10:01 | 10:02 | 10:03 | 10:04 | 10:05 |

1. 1페이지(offset 0) → A, B, C
2. A, B, C를 발주확인 → 셋의 `last_changed_at`이 10:10이 되어 맨 뒤로 간다. 순서는 D, E, F, A, B, C
3. 2페이지(offset 3) → A, B, C를 다시 받는다. **D, E, F는 한 번도 읽히지 않는다**

다음 수집은 "지난 수집 이후 바뀐 것"을 묻는데, D, E, F의 변경 시각은 그보다 과거라 **영영 수집되지 않는다.**

## Guidance

**정렬 기준이 다른 쓰기로 바뀔 수 있으면, 다음 페이지를 "몇 건 건너뛰기"가 아니라 "마지막으로 받은 행 뒤부터"로 정의한다.**

```
응답: { productOrders: [...], nextCursor: "<마지막 행의 (last_changed_at, product_order_id)를 감싼 문자열>" | null }
다음 요청 조건: (last_changed_at, product_order_id) > 커서
```

```ts
// repository.ts — 행 비교를 or/and로 풀어 drizzle 타입 매핑(Date)을 그대로 쓴다
after === null
  ? undefined
  : or(
      gt(naverProductOrders.lastChangedAt, after.lastChangedAt),
      and(
        eq(naverProductOrders.lastChangedAt, after.lastChangedAt),
        gt(naverProductOrders.productOrderId, after.productOrderId),
      ),
    )
```

- 상태가 바뀐 행은 변경 시각이 늘어 **이미 읽은 지점 뒤로만** 옮겨진다. 아직 읽지 않은 행은 앞으로 당겨지지 않으므로 누락이 없다.
- 대신 바뀐 행을 뒤에서 **다시 받을 수 있다.** 호출자는 행 번호(상품주문번호)로 upsert한다. 다시 받는 것은 최신 상태를 반영하는 효과도 있다.
- 조회 범위 끝(To)을 지정해 바뀐 행이 범위 밖으로 나가도 마찬가지다. 나간 행은 이미 읽은 쪽이다.
- 커서는 호출자에게 불투명한 문자열로 준다(`base64url("<ms>|<번호>")`). 해석할 수 없는 값은 400이다.
- 정렬과 같은 컬럼 순서의 인덱스(`seller_id, last_changed_at, product_order_id`)를 그대로 탄다.
- 부작용(시뮬레이터의 주문 생성)은 **커서 없는 첫 요청에서만** 일으킨다. 한 번의 수집에 한 번이다.

## Why — 검토하고 채택하지 않은 안

| 안 | 누락 | 기각 이유 |
|---|---|---|
| offset 유지 + "모든 페이지를 읽은 뒤에 상태를 바꾼다" 규칙 | 규칙을 어기거나 다른 요청이 동시에 바꾸면 발생 | 호출자의 기억에 정합성을 맡긴다 |
| offset + `created_at` 정렬 | To를 지정하면 발생(바뀐 행이 범위 밖으로 나가 뒤 행이 당겨짐) | 조건부 안전 |
| `created_at`+번호 커서 | 없음. 다만 도중에 범위로 들어온 **오래된** 행은 다음 수집으로 미뤄진다 | 다음 수집의 From을 "이번에 본 최대 변경 시각"으로 잡으면 그 행이 영영 빠진다 — "다음 From = 요청 시작 시각" 규칙이 필요하고 인덱스도 하나 더 필요하다 |
| **`last_changed_at`+번호 커서** | 없음 | 채택. 결과가 변경 시각 순서라 다음 From을 어느 방식으로 잡아도 구멍이 없다 |

판별 질문: **정렬 기준 컬럼을 이 목록을 읽는 쪽(또는 다른 누군가)이 페이지를 넘기는 사이에 바꿀 수 있는가.** 그렇다면 offset은 "건너뛴 개수"의 의미를 잃는다.

## 남은 한계

- 쓰기 시각과 커밋 시각의 차이(요청 시작 때 정한 `now`가 실제 커밋보다 앞섬) 때문에, 수집기가 다음 From을 딱 맞게 잡으면 늦게 커밋된 행을 건너뛸 수 있다. 라운드 3에서 From을 약간 겹치게 잡고 번호로 중복을 거른다.

## 관련

- `src/simulators/naver/orderService.ts` — `encodeCursor`, `parseProductOrderQuery`, `listChangedProductOrders`
- `src/simulators/naver/orderService.test.ts` — "페이지 사이에 상태가 바뀌어도 아직 읽지 않은 주문이 빠지지 않는다"
- `docs/superpowers/specs/2026-10-01-order-round2-naver-order-simulator-design.md` — 조회 계약(로컬 문서)
