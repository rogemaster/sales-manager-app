---
title: push로 운영하던 DB를 drizzle 마이그레이션 파일로 옮긴다 — 기준점은 실행하지 않고 "적용됨"으로만 기록한다
date: 2026-09-30
category: architecture-patterns
module: drizzle, db/schema, simulators/naver/schema
problem_type: architecture_pattern
component: database
severity: medium
applies_when:
  - drizzle-kit push로 스키마를 반영해 온 DB를 generate + migrate 방식으로 바꿀 때
  - 식 인덱스(lower(btrim(...)) 등)가 있는데 push가 매번 그 인덱스를 DROP/CREATE할 때
  - 로컬과 배포 환경이 같은 DB를 써서 마이그레이션 실행이 곧 운영 반영일 때
symptoms:
  - 스키마를 안 바꿨는데도 push가 식 유니크 인덱스를 지웠다 다시 만든다 — 그 사이 중복 차단이 사라진다
  - 기준점 마이그레이션을 그대로 migrate하면 이미 있는 테이블에 CREATE TABLE이 시도돼 실패한다
tags:
  - drizzle
  - migration
  - baseline
  - expression-index
  - postgres
  - neon
---

# push로 운영하던 DB를 drizzle 마이그레이션 파일로 옮긴다

## 문제

이 프로젝트는 2026-09-30까지 `drizzle-kit push`로 스키마를 반영했다. push는 스키마를 바꾸지 않아도 식 유니크 인덱스 두 개(`products_owner_customer_code_unique`, `naver_products_seller_name_unique`)를 **매번 DROP 후 CREATE**했다. 그 사이에는 중복 차단이 없다. 로컬과 Vercel이 같은 Neon DB를 쓰므로 이 틈은 늘 운영 데이터에서 열렸다.

## 원인 — push는 DB가 저장한 식 표기와 비교한다

push는 DB를 introspect해 코드의 스키마와 문자열로 비교한다. 그런데 Postgres는 식을 저장할 때 정규화한다.

| 코드(`schema.ts`) | DB가 돌려주는 표기 |
|---|---|
| `lower(btrim("customer_code"))` | `lower(btrim(customer_code))` |
| `btrim("products"."customer_code") <> ''` | `(btrim(customer_code) <> ''::text)` |
| `(product_snapshot->>'name')` | `(product_snapshot ->> 'name'::text)` |

의미는 같아도 문자열이 달라 push는 매번 "바뀌었다"고 판단한다. 인덱스는 ALTER가 안 되므로 DROP/CREATE가 된다.

`generate`는 DB가 아니라 **직전 스냅샷 JSON**(`drizzle/meta/*_snapshot.json`)과 비교한다. 스냅샷에는 코드 표기 그대로 저장되므로 이 문제가 없다. 전환 직후 `db:generate`가 "No schema changes"를 낸 것으로 확인했다.

## 전환 절차

### 1. 먼저 DB와 코드가 실제로 같은지 확인한다

기준점은 "지금 DB = 지금 `schema.ts`"라는 전제다. 어긋난 채로 기준점을 찍으면 이후 마이그레이션이 없는 컬럼을 고치려 하거나 있는 컬럼을 또 만든다.

- `drizzle-kit pull --out <임시폴더>`로 실제 DB 스냅샷을 뽑는다(읽기 전용).
- `drizzle-kit generate --config <임시 설정>`으로 코드 스냅샷을 **임시 폴더에** 만든다.
- 두 스냅샷의 테이블·컬럼(타입, NOT NULL, 기본값, PK, 생성 컬럼)·인덱스·FK를 비교한다. 위 표 같은 **표기 차이만** 남으면 통과다.

함정: `drizzle-kit generate --schema a.ts --schema b.ts`는 마지막 파일만 읽는다. 스키마 파일이 여러 개면 설정 파일로 넘긴다. 이걸 모르고 비교하면 "테이블 7개가 DB에만 있다"는 가짜 드리프트가 나온다.

### 2. 기준점을 생성한다

`npx drizzle-kit generate --name baseline` → `drizzle/0000_baseline.sql` + 스냅샷 + journal. DB에는 아무것도 하지 않는다.

### 3. 기준점을 실행하지 않고 "적용됨"으로 기록한다

drizzle migrator(`drizzle-orm/pg-core/dialect.js`의 `migrate`)의 판정은 이것뿐이다.

- `drizzle.__drizzle_migrations`에서 `created_at`이 가장 큰 행을 읽는다.
- journal 항목 중 `when`(folderMillis)이 그보다 **큰 것만** 실행한다.
- `hash`는 기록만 하고 검증하지 않는다.

그래서 `drizzle` 스키마와 테이블을 migrator와 같은 DDL로 만들고, 기준점의 `hash`·`folderMillis` 행 하나를 넣으면 된다. 값은 `drizzle-orm/migrator`의 `readMigrationFiles`로 얻는다. 직접 계산하지 않는다.

기록 스크립트에는 멈춤 조건을 둔다(`scripts/markMigrationBaselineApplied.ts`, 로컬 전용).

- 기준점 테이블이 DB에 하나라도 없으면 멈춘다. 빈 DB라면 기준점을 **실제로 실행**해야 하므로 이 스크립트가 아니라 `db:migrate`를 쓴다.
- 기록이 이미 있으면 쓰지 않는다.

### 4. 검증

- `npm run db:migrate` — 적용할 것이 없어도 "migrations applied successfully!"를 출력한다. **출력으로 판단하지 말고** `__drizzle_migrations` 행 수가 1인지 직접 조회한다.
- `npm run db:generate` — "No schema changes"여야 한다. 새 파일이 생기면 기준점이 코드와 어긋난 것이다.

## 운영 규칙

- 흐름: `schema.ts` 수정 → `db:generate` → SQL 검토 → `db:migrate`.
- **migrate는 로컬에서 수동 실행한다.** build 단계에 넣으면 프리뷰 배포마다 같은 운영 DB에 마이그레이션이 돈다.
- **push는 쓰지 않는다.** 한 번이라도 push하면 스냅샷과 DB가 갈라지고, 식 인덱스 DROP/CREATE 틈도 다시 생긴다.
- 인덱스는 migrate 즉시 반영되고 코드는 병합·배포 후에 반영된다. 반영 시점이 다르다는 문제는 그대로다 — `partial-unique-index-predicate-must-match-deployed-writers.md`
- 되돌리기: `DROP SCHEMA drizzle CASCADE` — 기록만 사라지고 업무 테이블은 그대로다.
