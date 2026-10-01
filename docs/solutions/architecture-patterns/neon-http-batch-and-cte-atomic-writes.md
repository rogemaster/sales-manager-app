---
title: neon-http에서 여러 쓰기를 원자적으로 묶는 두 방법 — 미리 정해진 문장은 db.batch, 앞 결과에 달린 문장은 CTE 한 문장
date: 2026-10-01
category: architecture-patterns
module: app/api/orders/[orderId], features/order/server/orderStatusBulk, db
problem_type: architecture_pattern
component: database
severity: medium
applies_when:
  - drizzle neon-http 드라이버에서 "본 데이터 변경 + 이력 기록"처럼 함께 성공하거나 함께 실패해야 하는 쓰기를 만들 때
  - db.transaction()이 "No transactions support in neon-http driver"로 막혀 원자성을 포기하려 할 때
  - 두 번째 쓰기의 대상이 첫 번째 쓰기의 결과(실제로 바뀐 행)에 달려 있을 때
symptoms:
  - 주문 상태는 바뀌었는데 수정 이력이 없다(두 번째 INSERT만 실패)
  - 일괄변경에서 이미 다른 사람이 바꾼 주문에도 이력이 남는다(UPDATE 결과를 모르고 이력을 썼다)
tags:
  - drizzle
  - neon
  - transaction
  - batch
  - cte
---

# neon-http에서 여러 쓰기를 원자적으로 묶는 두 방법

## Context

주문 DB화(라운드 1)에서 쓰기 두 곳이 "주문 변경 + 수정 이력 INSERT"를 함께 해야 했다. 이력만 실패하면 "바뀌었는데 기록이 없는" 주문이 생긴다.

neon-http에는 `db.transaction()`이 없다. 그래서 이 저장소는 한동안 **"neon-http에는 트랜잭션이 없다"** 고 이해했다(`no-transaction-driver-shapes-bulk-result-contract.md`). 정확히는 **대화형 트랜잭션이 없는 것**이다.

```
node_modules/drizzle-orm/neon-http/session.js
  async batch(queries) {
    ...
    const batchResults = await this.client.transaction(builtQueries, queryConfig);
  }
  async transaction(_transaction, _config = {}) {
    throw new Error("No transactions support in neon-http driver");
  }
```

`db.batch`는 Neon 클라이언트의 `transaction()`, 즉 **비대화형 트랜잭션**(문장 묶음을 한 번에 보내 한 트랜잭션으로 실행)이다. 운영 DB에서 실측했다: batch 안의 마지막 INSERT를 FK 위반으로 실패시키자 batch 전체가 실패했고, 앞의 UPDATE도 롤백됐다(2026-10-01).

## Guidance

원자성이 필요한 쓰기를 **두 번째 문장이 첫 번째 문장의 결과를 알아야 하는가**로 가른다.

| 두 번째 문장 | 방법 | 이 저장소의 예 |
|---|---|---|
| 실행 전에 이미 정해져 있다 | `db.batch([...])` | 주문 상세 저장 — `PATCH /api/orders/[orderId]`: 주문 UPDATE + (클레임 메모 UPDATE) + 이력 INSERT |
| 앞 문장이 실제로 바꾼 행에 달려 있다 | CTE 한 문장(`WITH ... UPDATE ... RETURNING` → `INSERT ... SELECT FROM`) | 상태 일괄변경 — `applyBulkStatusChange`(`features/order/server/orderStatusBulk.ts`) |

**batch** — 문장을 미리 다 만들어 넘긴다. 상세 저장은 바뀐 필드를 앱에서 먼저 계산하고(`diffOrderFields`), 바뀐 것이 없으면 쓰지 않는다. 그래서 이력 INSERT의 내용이 실행 전에 확정된다.

**CTE** — 일괄변경의 UPDATE는 WHERE에 "바꿀 수 있는 출발 상태" 조건이 있다. 확인한 뒤 다른 사람이 먼저 바꾼 주문은 UPDATE되지 않는다. 그래서 이력은 **실제로 UPDATE된 주문에만** 써야 하고, 그 목록은 UPDATE가 끝나야 안다. batch는 앞 결과를 다음 문장에 넘길 수 없으므로, `RETURNING`을 다음 INSERT의 입력으로 쓰는 한 문장으로 만든다. 한 문장은 그 자체로 원자적이다.

```sql
WITH updated AS (
  UPDATE orders SET order_status = $next
  WHERE owner_id = $owner AND order_number IN (...) AND order_status IN (...허용 출발 상태)
  RETURNING order_number
)
INSERT INTO order_edit_histories (...)
SELECT order_number, ... FROM updated
RETURNING order_number
```

CTE는 raw SQL이라 테이블·컬럼 이름을 타입이 지켜주지 않는다. 처음 쓸 때 `EXPLAIN`으로 쓰기 없이 문법·컬럼명을 확인했고, 함수 주석에 `schema.ts`와 이름을 맞춰야 한다고 적어 두었다.

## Why

- "트랜잭션이 없다"로 이해하면 이력 기록을 "본 쓰기 뒤 최선을 다해 INSERT"로 설계하게 된다. 그러면 이력이 빠진 변경이 정상 경로의 결과가 된다.
- 반대로 batch가 있다고 모든 것을 batch로 풀 수는 없다. **"세기 → 판정 → 쓰기"처럼 앞 결과를 보고 다음 동작을 정하는 흐름**은 여전히 한 트랜잭션으로 묶을 수 없다. 그래서 대량 처리의 부분 성공 계약(`{ successCount, failures }`)은 그대로 맞다. 판정을 SQL 안(WHERE·CTE)으로 넣을 수 있을 때만 한 문장으로 원자성을 얻는다.

## 관련

- `no-transaction-driver-shapes-bulk-result-contract.md` — 대량 처리의 부분 성공 계약(이 문서가 전제를 보정한다)
- `src/app/api/orders/[orderId]/route.ts` — batch 예
- `src/features/order/server/orderStatusBulk.ts` — CTE 예
