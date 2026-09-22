---
title: 독립 스냅샷은 jsonb 통째로 두고, 검색 값은 생성 컬럼으로, 불변 식별값은 컬럼 한 벌만 둔다
date: 2026-09-23
category: architecture-patterns
module: "db/schema, features/mallLinkedProduct/util, app/api/shopping/linked-products"
problem_type: architecture_pattern
component: database
severity: medium
applies_when:
  - 원본 엔티티를 복사해 들고 있지만 원본과 동기화되지 않는 스냅샷 데이터를 DB로 옮길 때
  - 스냅샷 안의 일부 값으로 목록을 검색·필터해야 할 때
  - 스냅샷 안에 "바뀌면 안 되는 값"이 섞여 있을 때
tags:
  - snapshot
  - jsonb
  - generated-column
  - immutable-field
  - mallLinkedProduct
  - drizzle
---

# 독립 스냅샷은 jsonb 통째로 두고, 검색 값은 생성 컬럼으로, 불변 식별값은 컬럼 한 벌만 둔다

## Context

연동상품(`MallLinkedProduct`)은 전송 시점의 상품(`Product`)과 설정(`ShoppingSetting`)을 복사해 들고 있는 데이터다. 오리지널을 고쳐도 따라 바뀌지 않고, 수정·검색도 오리지널과 무관하게 이뤄진다(`domain-design.md`).

MSW에서 Neon으로 옮기면서 저장 형태를 정해야 했다. 2026-09-08 잠정안은 상품 스냅샷을 `products`와 같은 경계로 **컬럼 ~25개에 펼치는** 것이었다. 일괄수정이 필드 단위 부분병합(`Partial<Product>` + `clearKeys`)이라, jsonb면 `jsonb_set` 체인이 된다는 이유였다.

설계 라운드(2026-09-22)에서 두 사실이 이 근거를 뒤집었다.

- **부분병합은 이미 앱 메모리에서 한다.** 일괄수정은 "읽고 → 병합 → 통째 쓰기"다. jsonb여도 SQL 쪽 비용은 0이다.
- **컬럼으로 펴면 필드 추가 비용이 두 배가 된다.** `Product`에 필드가 하나 늘면 `products`와 연동 테이블을 함께 마이그레이션해야 한다. 같은 라운드에서 추가한 택배사 필드가 바로 그 경우였다.

## Guidance

**스냅샷은 한 덩어리(jsonb)로 두고, 그 안에서 검색에 쓰는 값만 Postgres 생성 컬럼으로 뽑는다. 불변 식별값은 스냅샷에서 빼서 top-level 컬럼 한 벌만 둔다.**

세 층으로 나눈다.

| 층 | 형태 | 예 |
|---|---|---|
| 불변 식별 | top-level 컬럼, `UPDATE`의 `SET`에 넣지 않음 | `mall_code`·`mall_account_id`·`mall_id` |
| 스냅샷 본문 | jsonb 통째 | `product_snapshot`, `setting_snapshot` |
| 검색 대상 | jsonb에서 파생한 생성 컬럼 | `product_name`·`product_state` |

```ts
productSnapshot: jsonb('product_snapshot').$type<Product>().notNull(),
productName: text('product_name').generatedAlwaysAs(sql`(product_snapshot->>'name')`),
productState: text('product_state').generatedAlwaysAs(sql`(product_snapshot->>'state')`),
```

**불변 식별값은 저장할 때 빼고, 읽을 때 컬럼 값으로 다시 합친다.** 컬럼을 스냅샷보다 뒤에 펼쳐서, 스냅샷에 같은 키가 섞여 들어와도 컬럼이 이긴다.

```ts
// 저장: 식별 5필드를 걷어낸다 (splitSettingSnapshot)
const { id, ownerId, mallCode, mallAccountId, mallId, ...rest } = setting;
return structuredClone(rest);

// 읽기: 컬럼이 마지막에 온다 (toMallLinkedProduct)
const settingSnapshot = { ...row.settingSnapshot, id: row.sourceShoppingSettingId, ownerId: row.ownerId,
  mallCode: row.mallCode, mallAccountId: row.mallAccountId, mallId: row.mallId };
```

## Why This Matters

- **사본이 하나면 갈라질 수 없다.** 필터용으로 값을 컬럼에 "승격"하면서 스냅샷에도 남겨 두면, `mallAccountId`의 사본이 세 벌이 된다(폼 값, jsonb, 컬럼). 2026-09-08에 필터 값만 컬럼으로 올리던 안(A안)을 철회한 이유가 이것이다.
- **불변을 "되돌리기"가 아니라 "안 쓰기"로 지킨다.** 예전에는 폼이 돌려준 값에서 불변 필드를 원본으로 되돌리는 코드가 두 곳에 있었고, 되돌리는 범위가 곧 규칙의 실효 범위였다(`client-supplied-snapshot-immutable-field-restore-scope.md`). 지금은 불변 필드가 컬럼이고 `SET`에 없으니, 클라이언트가 무엇을 보내도 바뀌지 않는다. 한 곳을 빠뜨려서 뚫릴 여지가 구조적으로 사라진다.
- **생성 컬럼은 DB가 파생을 강제한다.** 앱이 사본 컬럼을 채우는 방식은 쓰기 경로를 하나 빠뜨리면 검색 결과가 틀어진다. 생성 컬럼은 스냅샷을 쓰는 순간 DB가 다시 계산한다.
- 계정 필터가 `settingSnapshot.mallAccountId`를 파던 비대칭(top-level에 계정 필드가 없어서 생긴 것)도 함께 사라졌다. 목록 필터는 전부 컬럼을 읽는다.

**대가:**
- 스냅샷 전체 모양은 DB가 보증하지 않는다. `PATCH`가 `{}`를 보내면 생성 컬럼이 null이 된다. 오리지널 쓰기 경로처럼 스키마 검증을 둘지는 별도로 정할 일이다.
- 생성 컬럼을 추가할 때마다 마이그레이션이 필요하다. 다만 "검색 조건이 늘 때"만 필요하고, "필드가 늘 때"는 필요 없다.

## When to Apply

- 스냅샷이 원본과 동기화되지 않는 독립 데이터일 때. 동기화된다면 조인이 맞다.
- 스냅샷의 수정이 앱에서 통째로 교체하는 방식일 때. SQL 단위의 부분 갱신이 잦다면 컬럼화가 다시 유리해진다.
- 검색 대상이 스냅샷 필드 중 일부일 때.

> **판별 질문:** 이 값은 "검색 조건"인가, "바뀌면 안 되는 식별값"인가, "그냥 스냅샷의 일부"인가. 앞의 둘만 컬럼이 되고, 식별값은 스냅샷에서 뺀다.

## Examples

**새 필터를 붙일 때**
- ❌ 앱에서 `product_brand` 컬럼을 채운다.
- ✅ `text('product_brand').generatedAlwaysAs(sql\`(product_snapshot->>'brand')\`)`를 추가한다.

**`Product`에 필드가 늘 때**
- 오리지널 `products` 테이블만 마이그레이션하면 된다. 연동 테이블은 jsonb라 손대지 않는다.

**불변 필드를 추가할 때**
1. top-level 컬럼으로 만든다.
2. `splitSettingSnapshot`의 제외 목록과 `toMallLinkedProduct`의 재조립 목록에 함께 넣는다.
3. 수정 route의 `SET`에 넣지 않는다.

관련: `client-supplied-snapshot-immutable-field-restore-scope.md` (이 문서가 대체한 이전 방어 방식), `server-reads-origin-instead-of-trusting-client-assembled-snapshot.md` (생성 경로의 원칙), `jsonb-columns-on-one-write-path-need-one-sanitization-policy.md`, `snapshot-entity-source-link-break-is-by-design.md`
