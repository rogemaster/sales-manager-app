---
title: 부분 유니크 인덱스의 조건은 아직 배포돼 있는 코드가 쓰는 "빈 값"까지 빼야 한다 — 인덱스와 코드의 반영 시점은 다르다
date: 2026-09-16
category: architecture-patterns
module: db/schema, lib, app/api/products
problem_type: architecture_pattern
component: database
severity: high
applies_when:
  - 선택 컬럼에 "값이 있을 때만 유일" 같은 부분 유니크 인덱스를 걸 때
  - 인덱스는 DB에 바로 반영되고 코드는 PR 병합·배포 후에 반영되는 구조일 때 (drizzle-kit push, 콘솔 SQL)
  - 앱이 저장 전에 값을 정규화(공백 제거·빈 값 → null)하도록 바꾸는 작업과 인덱스 추가가 같은 라운드에 있을 때
  - 앱의 중복 판정 규칙(공백·대소문자 무시 등)을 DB 제약으로도 강제하려 할 때
symptoms:
  - 인덱스만 먼저 반영된 사이, 코드를 비운 상품의 두 번째 등록이 500으로 실패할 수 있다
  - 앱은 "중복 아님"으로 통과시켰는데 DB가 거부해 사용자가 코드 없는 일반 문구만 본다
tags:
  - partial-index
  - unique-constraint
  - deploy-order
  - postgres
  - drizzle
  - normalization
---

# 부분 유니크 인덱스의 조건은 아직 배포돼 있는 코드가 쓰는 "빈 값"까지 빼야 한다

## Context

고객사 상품코드(`products.customer_code`)를 워크스페이스(`owner_id`) 안에서 겹치지 않게 막았다. 앱 규칙은 이렇다.

- 앞뒤 공백과 대소문자를 무시하고 비교한다 (`'cs-001'` = `' CS-001 '`)
- 빈 값은 "코드 없음"이라 비교하지 않는다 — 코드 없는 상품은 몇 개든 된다
- 저장 전에 앞뒤 공백을 지우고, 비었으면 `null`로 저장한다 (이번 라운드에서 추가)

앱 검사만으로는 두 탭에서 동시에 저장하는 경우를 못 막으므로 DB에 부분 유니크 인덱스를 함께 두기로 했다. 처음 떠올린 모양은 이것이었다.

```sql
-- 초안
CREATE UNIQUE INDEX ... ON products (owner_id, lower(customer_code))
  WHERE customer_code IS NOT NULL;
```

"`null`은 코드 없음이니 빼면 된다"는 판단이다. **새 코드 기준으로는 맞다.** 새 코드는 빈 값을 반드시 `null`로 저장하기 때문이다.

## Guidance

**인덱스 조건은 "새 코드가 쓰는 값"이 아니라 "지금 이 DB에 쓰고 있는 모든 코드가 쓰는 값" 기준으로 정한다.** 그리고 앱의 정규화를 인덱스 식 안에도 넣어, 인덱스가 앱 규칙과 **정규화 전 값에 대해서도** 같은 판정을 내리게 한다.

```ts
// src/db/schema.ts
uniqueIndex(CUSTOMER_CODE_UNIQUE_INDEX)
  .on(table.ownerId, sql`lower(btrim(${table.customerCode}))`)
  .where(sql`btrim(${table.customerCode}) <> ''`),
```

- `btrim(NULL) <> ''`은 NULL이라 **`null`도 조건에서 빠진다.** `IS NOT NULL`을 따로 적을 필요가 없다.
- `''`와 공백만 있는 값도 빠진다 — 정규화 전 코드가 쓰는 "빈 값"이다.
- 식에 `btrim`이 들어가 있어 정규화 전 값 `' CS-001'`과 `'cs-001'`도 같은 키가 된다.

앱의 중복 조회도 **같은 식**으로 비교한다. 그래야 "앱은 통과, DB는 거부"가 생기지 않는다.

```ts
// src/lib/customerCodeDuplicates.ts
const customerCodeKey = sql<string>`lower(btrim(${products.customerCode}))`;
```

그래도 앱 검사와 insert 사이에 끼어드는 동시 저장은 남는다. 이건 인덱스가 막고, 위반을 **500이 아니라 400**으로 돌려준다. drizzle은 드라이버 오류를 `cause`로 감싸 던지므로 사슬을 따라가 `code === '23505'`와 인덱스 이름을 확인한다(`src/lib/customerCodeUniqueViolation.ts`). 인덱스 이름은 상수 하나를 `schema.ts`와 판별 함수가 함께 import해서 어긋날 수 없게 했다.

## Why This Matters

**인덱스와 코드는 같은 PR에 있어도 반영 시점이 다르다.**

| 반영 대상 | 반영 방법 | 반영 시점 |
|----------|----------|----------|
| 인덱스 | `drizzle-kit push` 또는 콘솔 SQL | 실행하는 즉시 |
| 코드 | PR 병합 → 배포 | 나중에 |

그 사이에는 **새 인덱스 + 옛 코드**가 함께 돈다. 이 프로젝트의 옛 상품 폼은 비운 입력칸을 `''`로 보냈다. 초안 조건(`IS NOT NULL`)이면 `''`는 인덱스 대상이고, 같은 워크스페이스에서 코드를 비운 상품을 두 번째로 등록하는 순간 `(owner_id, '')`가 겹쳐 **500**이 난다. 기능을 추가하는 라운드가 아무 관계 없는 "코드 없는 상품 등록"을 깨뜨리는 것이다.

반대 순서(코드 먼저)라면 문제가 없다. 새 코드는 `''`를 쓰지 않는다. 하지만 **어느 쪽이 먼저 반영될지는 사람이 정하는 운영 순서라 설계가 기대면 안 된다.** 실제로 이번 라운드에서 인덱스 생성은 자동 권한 검사에 막혀 사용자가 콘솔에서 직접 실행했고, 코드는 아직 PR 병합 전이었다 — 계획과 다른 순서가 그대로 일어났다.

조건과 식을 앱 규칙과 똑같이 맞추면 **두 순서 모두 안전해진다.**

- 인덱스 먼저: 옛 코드의 `''`·`null`은 조건 밖이라 통과. 옛 코드가 `' CS-001'`을 `'cs-001'` 옆에 쓰려 하면 거부 — 원래 막으려던 것이다.
- 코드 먼저: 인덱스가 없으니 걸릴 일이 없다.

## When to Apply

- 부분 인덱스 조건을 정할 때, 이 DB에 쓰는 코드가 새 코드 하나뿐인지 먼저 묻는다. 배포 전 옛 코드, 스크립트, 다른 서비스가 있다면 그 코드들이 "빈 값"을 어떤 모양으로 쓰는지 확인한다.
- 앱이 정규화한 값만 저장한다고 해서 인덱스 식에서 정규화를 생략하지 않는다. 정규화 전 데이터와 옛 코드가 인덱스를 함께 통과하기 때문이다.
- 인덱스를 만들기 **직전에** 새 기준으로 기존 중복을 센다. 이번에는 대소문자 무시로 기준이 바뀐 뒤 한 번 더 셌다(두 번 다 0건). 기준을 바꾸면 결과도 바뀔 수 있다.

## Examples

**조건별로 새 인덱스 + 옛 코드 구간에서 일어나는 일**

| 옛 코드가 쓰는 값 | `WHERE customer_code IS NOT NULL` | `WHERE btrim(customer_code) <> ''` |
|------------------|-----------------------------------|------------------------------------|
| `null` (엑셀 경로) | 조건 밖 — 통과 | 조건 밖 — 통과 |
| `''` (화면 폼) | **조건 안 — 두 번째부터 500** | 조건 밖 — 통과 |
| `'CS-001'` 옆에 `' cs-001'` | 식에 `btrim`이 없으면 다른 키 — **통과(중복이 새어 들어감)** | 같은 키 — 거부 |

**남는 불일치 (알고 넘어간 것)**

- JS `trim()`은 탭·줄바꿈·NBSP까지 지우고 Postgres `btrim`은 공백만 지운다. 새로 쓰는 값은 JS로 정리돼 있어 어긋나지 않지만, 옛 코드가 탭이 붙은 값을 저장해 뒀다면 앱과 DB 모두 그 값을 다른 코드로 본다. 이번 데이터에는 해당 값이 0건이었다.
- JS `toLowerCase()`와 Postgres `lower()`는 일부 비ASCII 문자(그리스 문자 시그마 등)에서 결과가 다르다. 그 경우 앱은 통과시키고 인덱스가 막아 사용자가 일반 문구만 본다. 비교 키를 SQL 쪽에서 만들면 닫히지만, 코드가 사실상 영문·숫자라 미뤘다.

## Related

- [`db-null-vs-domain-undefined-boundary.md`](db-null-vs-domain-undefined-boundary.md) — 같은 `customer_code` 컬럼에서 `null`/`undefined`가 **읽기·표시** 쪽에서 어긋난 사례
- [`absent-optional-value-arrives-as-null.md`](absent-optional-value-arrives-as-null.md) — 선택 필드의 "값 없음"이 쓰기 경로에 `null`로 도착하는 문제. 이 문서의 정규화(빈 값 → `null`)가 전제로 삼는 사실
- [`customer-code-duplicate-block-is-not-a-reversal-of-sku-rule.md`](customer-code-duplicate-block-is-not-a-reversal-of-sku-rule.md) — 이 인덱스가 존재하게 된 도메인 결정
- 설계 근거: `docs/superpowers/specs/2026-09-16-product-customer-code-unique-design.md` §7 (로컬 전용)
