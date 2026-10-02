---
title: 외부몰을 먼저 부르는 상태 변경은 "우리가 몰보다 앞선 상태"마다 몰에만 다시 보내는 길을 둔다
date: 2026-10-02
category: architecture-patterns
module: features/order/util/orderBulkStatus, features/order/server/orderStatusBulk, features/order/server/orderMallSync
problem_type: architecture_pattern
component: service_object
severity: high
applies_when:
  - 우리 상태 변경이 외부몰 호출 결과에 달려 있을 때(발주확인·송장전송 등)
  - 외부몰 연동 전부터 쌓인 데이터가 있거나, 몰을 부르지 않고 상태를 바꾸는 다른 경로가 있을 때
  - 우리 쪽 상태에 "되돌릴 수 없는(잠긴) 상태"가 있을 때
symptoms:
  - 다음 단계 전송이 "몰에서 이전 단계가 안 됐다"로 실패하는데, 화면의 안내대로 이전 단계를 다시 하려 해도 잠긴 상태라 막힌다
  - 몰 응답이 유실된 뒤 다시 시도할 길이 "변경 없음"으로 처리돼 몰을 부르지 않는다
tags:
  - external-mall
  - state-machine
  - idempotency
  - neon-http
  - order
---

# 외부몰을 먼저 부르는 상태 변경에는 "몰에만 다시 보내기" 길이 필요하다

## Context

주문 DB화 라운드 4에서 발주확인·송장전송을 외부몰(네이버 시뮬레이터)에 연결했다. 순서는 **몰 먼저 → 성공한 건만 DB 상태 변경**이다(연동상품 전송과 같은 순서, 트랜잭션 없는 neon-http에서 "전송중" 같은 중간 상태를 두지 않기 위해).

이 구조에서 두 가지를 놓치기 쉽다.

1. **우리 상태가 몰보다 앞서 있는 주문이 이미 있다.** 연동 전(라운드 3)에는 발주확인이 우리 DB만 바꿨다. 그 주문은 우리 쪽은 발주확인·송장등록인데 몰은 미확인이다.
2. **재시도 판정이 "이미 목표 상태면 변경 없음"이다.** 일괄변경의 기존 규칙은 같은 상태로의 변경을 성공으로 세고 아무것도 하지 않았다 — 몰을 부르지 않는다.

둘이 겹치면 막다른 길이 된다. 송장등록 주문을 송장전송하면 몰이 `NOT_CONFIRMED`로 거절한다 → 화면은 "발주확인을 다시 보내라"고 안내한다 → 그런데 송장등록은 잠긴 상태라 발주확인으로 바꿀 수 없고, 이미 발주확인인 주문은 "변경 없음"이라 몰을 부르지 않는다. 이 주문은 영영 보낼 수 없다. 처음 설계는 "발주확인 상태"만 재전송 대상으로 잡았고, 최종 리뷰에서 송장등록이 빠진 것이 드러났다.

## Guidance

**우리 상태가 몰보다 앞설 수 있는 모든 상태를 나열하고, 그 상태의 주문에 "상태는 그대로, 몰에만 이전 단계를 다시 보내는" 길을 둔다.**

```ts
// orderBulkStatus.ts — 몰에만 발주확인을 다시 보낼 수 있는 상태
const CONFIRM_RESENDABLE_STATUSES: readonly OrderStatusTypes[] = ['CONFIRMED_ORDER', 'INVOICE_REGISTER'];

const isConfirmResendable = (order: { orderStatus: OrderStatusTypes; shoppingAccountId?: string | null }) =>
  !!order.shoppingAccountId && CONFIRM_RESENDABLE_STATUSES.includes(order.orderStatus);

/** 화면 사전 경고(버튼·Select)와 route 계획 함수가 같은 판정을 쓴다. */
export const findConfirmViolation = (order) =>
  isConfirmResendable(order) ? null : findOrderStatusChangeViolation(order.orderStatus, 'CONFIRMED_ORDER');
```

계획 함수는 요청을 셋으로 나눈다 — **changeTargets**(몰 성공 시 상태 변경), **resendTargets**(몰에만 재전송, 성공해도 상태·이력 그대로), 실패. 재전송 성공은 그 동작의 실패 사유만 지운다.

- **재전송이 안전하려면 몰 쪽 동작이 멱등이어야 한다.** 시뮬레이터 발주확인은 이미 `OK`면 성공, 발송처리는 같은 송장이면 성공으로 답한다. 그래서 "몰은 성공했는데 DB 쓰기만 실패"도 같은 버튼을 다시 누르면 회복된다.
- **화면 사전 경고와 서버 판정을 한 함수로 둔다.** 둘이 다르면 서버는 받아 주는데 화면이 버튼을 막거나 그 반대가 된다. 계정 유무가 판정에 들어가므로 목록 응답에 `shoppingAccountId`를 싣는다.
- **몰을 부르지 않는 주문(계정 없음 — 엑셀·API 없는 몰)은 재전송 대상이 아니다.** 우리 상태만 바꾸고, 이미 그 상태면 "변경 없음"이다.
- **앞선 상태를 새로 만드는 길은 상태 규칙에서 줄인다.** 신규주문 → 송장등록을 허용하면 몰 미확인 송장등록 주문이 계속 생긴다. 사용자 결정으로 신규주문은 발주확인·취소 관련 상태로만 갈 수 있게 막았다. 재전송 길은 이미 쌓인 데이터를 위해 남긴다.

### 막다른 길 찾는 질문

설계 리뷰에서 상태마다 묻는다.

1. 이 상태의 주문이 **몰에서는 이전 단계**일 수 있는가? (연동 전 데이터, 몰을 안 부르는 다른 변경 경로, 응답 유실)
2. 그렇다면 다음 단계 전송이 실패했을 때, **사용자가 누를 수 있는 버튼 중 몰에 이전 단계를 보내는 것**이 있는가?
3. 그 버튼이 "이미 그 상태 → 변경 없음"이나 "잠긴 상태 → 위반"으로 **몰 호출 전에 끝나지는 않는가?**

3번이 예면 막다른 길이다. 실패 문구가 안내하는 행동을 실제로 해 볼 수 있는지 확인하는 것이 가장 빠른 점검이다.

## Why

- 몰 먼저 → DB 순서는 "DB에 쓴 뒤 몰이 거절"하는 거짓 상태를 막지만, 대가로 **우리 상태만으로는 몰 상태를 알 수 없다.** 연동 전 데이터와 응답 유실이 그 틈을 만든다.
- "같은 상태로의 변경은 아무것도 하지 않는다"는 몰 연동 전에는 맞는 최적화였다. 몰이 끼면 같은 상태여도 몰은 다를 수 있으므로, 그 최적화가 복구 경로를 지운다.
- 막다른 길은 데이터를 고칠 수단이 DB 직접 수정뿐이라 사용자에게는 버그와 같다. 테스트는 각 함수가 맞게 동작함을 보여 줄 뿐이고 상태 사이의 경로가 끊긴 것은 못 잡는다 — 이번에도 단위 테스트는 모두 통과한 상태에서 리뷰가 찾았다.

## 관련

- `src/features/order/util/orderBulkStatus.ts`(`planConfirmOrders`, `findConfirmViolation`, `toMallSyncResult`), `src/features/order/server/orderStatusBulk.ts`(`runMallSyncedChange`), `src/features/order/util/orderStatusRule.ts`(신규주문 전이 제한)
- 같은 "몰 먼저 → DB" 순서의 선례: 연동상품 전송(`.claude/rules/domain-design.md` "규모 판단으로 하지 않기로 한 것")
- 원자적 쓰기: `neon-http-batch-and-cte-atomic-writes.md`
