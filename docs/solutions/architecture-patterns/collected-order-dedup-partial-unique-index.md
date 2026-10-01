---
title: 외부에서 가져온 행의 중복은 부분 유니크 인덱스 + ON CONFLICT … WHERE로 막는다 — 빈 키는 비교하지 않는다
date: 2026-10-01
category: architecture-patterns
module: db/schema(orders), features/order/server/orderCollection
problem_type: architecture_pattern
component: database
severity: medium
applies_when:
  - 외부몰에서 주문 등을 반복 수집해 같은 행이 다시 들어올 수 있을 때
  - 같은 테이블에 다른 입구(엑셀 등록)로 들어오는 행은 그 키가 비어 있을 수 있을 때
  - "있으면 건너뛰고 몇 건이 새로 들어왔는지" 세야 할 때
symptoms:
  - 같은 기간을 두 번 수집하면 같은 주문이 두 번 들어온다
  - 빈 쇼핑몰주문번호끼리 유니크 충돌이 나 키가 없는 정당한 행이 막힌다
tags:
  - postgres
  - drizzle
  - unique-index
  - on-conflict
  - order-collection
---

# 수집 중복은 부분 유니크 인덱스 + ON CONFLICT … WHERE로 막는다

## Context

주문 수집(주문 DB화 라운드 3)은 사용자가 고른 기간 전체를 매번 다시 묻는다. 기간이 겹치거나 같은 수집을 반복하면 같은 주문이 다시 온다. 사용자 결정은 "이미 있는 주문은 건너뛰고 새 주문만 추가"였다.

같은 `orders` 테이블에는 **엑셀 등록 주문**도 들어온다(API 없는 몰의 통합관리 — 사용자 요구 기능). 그런 몰의 주문에는 쇼핑몰주문번호가 없을 수 있다.

## Guidance

**중복 판정을 앱이 아니라 DB가 하게 하고, 빈 키는 인덱스에서 뺀다.**

```ts
// schema.ts — orders
uniqueIndex('orders_owner_mall_shop_order_unique')
  .on(table.ownerId, table.mallCode, table.shopOrderNumber)
  .where(sql`${table.shopOrderNumber} <> ''`),
```

```ts
// 삽입 — 대상과 WHERE가 인덱스와 같아야 Postgres가 이 부분 인덱스를 충돌 판정에 쓴다
const inserted = await db
  .insert(orders)
  .values(rows)
  .onConflictDoNothing({
    target: [orders.ownerId, orders.mallCode, orders.shopOrderNumber],
    where: sql`${orders.shopOrderNumber} <> ''`,
  })
  .returning({ orderNumber: orders.orderNumber });

newCount = inserted.length;            // 새로 들어온 수
duplicateCount = rows.length - newCount; // 이미 있어 건너뛴 수
```

- 키 범위는 `(워크스페이스, 몰, 쇼핑몰주문번호)`다. 주문번호는 몰 안에서만 유일하다.
- `RETURNING`이 실제로 들어간 행만 돌려주므로 신규·중복 집계에 별도 조회가 필요 없다. 한 INSERT 안에서 행끼리 겹쳐도 DO NOTHING이 처리한다.
- 인덱스를 걸기 전에 기존 데이터의 겹침을 센다(`GROUP BY … HAVING count(*) > 1`). 0건이어야 마이그레이션이 실패하지 않는다.

## Why

- **앱에서 "먼저 조회 → 없으면 삽입"을 하면** 조회와 삽입 사이에 같은 수집이 한 번 더 들어오는 순간 중복이 생긴다(동시 요청, 재시도). 유니크 인덱스는 그 틈이 없다.
- **전체 유니크로 걸면** 키가 빈 엑셀 주문끼리 충돌해, 사용자 요구 기능의 입구를 막는다. 빈 키는 "모른다"는 뜻이지 같은 주문이라는 뜻이 아니다.
- `ON CONFLICT`에 WHERE를 빼면 Postgres는 이 부분 인덱스를 추론 대상으로 쓰지 않아 오류가 난다 — 인덱스의 술어와 같은 WHERE를 반드시 붙인다.

## 관련

- `src/db/schema.ts`(orders), `src/features/order/server/orderCollection.ts`(`insertOrders`), `drizzle/0004_*.sql`
- `customerCode` 중복 차단(`products_owner_customer_code_unique`)도 "빈 값은 비교하지 않는다"는 같은 판단이다 — `.claude/rules/domain-design.md`
