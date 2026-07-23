---
title: ownerId 기반 슈퍼계정/종속계정 계층 구조
date: 2026-06-12
category: docs/solutions/architecture-patterns
module: features/account
problem_type: architecture_pattern
component: frontend_stimulus
severity: high
applies_when:
  - 서비스에 가입(회원가입)으로 생성되는 최상위 계정이 존재할 때
  - 최상위 계정이 하위 사용자를 등록·관리하는 구조일 때
  - 계정 간 데이터 격리(멀티 테넌트)가 필요할 때
  - 매입처·매출처 등 슈퍼계정에 종속되는 다른 도메인 엔티티를 설계할 때
tags:
  - multi-tenant
  - user-hierarchy
  - ownerid
  - super-admin
  - data-isolation
  - architecture
---

# ownerId 기반 슈퍼계정/종속계정 계층 구조

## Context

이 서비스는 B2B SaaS 구조로, 각 사업체(슈퍼계정)가 독립적으로 가입하고 자신의 팀원(하위 사용자)을 관리한다. 초기 mock 데이터는 모든 사용자를 동등한 독립 계정으로 설계했는데, 이는 다음 문제를 야기한다:

- A사 슈퍼계정이 B사의 하위 유저를 볼 수 있는 데이터 노출
- 사용자 관리 화면에서 타 계정의 유저가 혼재
- `super_admin` 등급을 사용자 등록 폼에서 부여 가능한 구조적 결함

## Guidance

**`ownerId` 필드로 계층 관계를 표현하고, 모든 목록 조회는 로그인 계정의 id로 필터링한다.**

> **2026-07-08 업데이트:** 슈퍼계정의 `ownerId`는 더 이상 `null`이 아니다. 아래 "슈퍼계정 ownerId: null → 자기참조로 변경" 절 참고.
> **2026-07-18 업데이트:** `AccountUser.ownerId` 타입 자체를 `string | null`에서 `string`으로 좁혔다. 아래 "AccountUser.ownerId 타입을 non-null로 좁힘" 절 참고.

### 계층 규칙

| 계정 유형 | 생성 경로 | `ownerId` | 부여 가능 등급 |
|-----------|-----------|-----------|---------------|
| 슈퍼계정 | 회원가입 | **자기 자신의 `id`** (자기참조) | `super_admin` (자동) |
| 하위 유저 | 사용자 관리 등록 | 슈퍼계정 id | `admin`, `operator` |

### 타입 설계

```typescript
// src/features/auth/types/Auth.ts
export type UserGrade = 'super_admin' | 'admin' | 'operator';
export type SubUserGrade = Exclude<UserGrade, 'super_admin'>; // 'admin' | 'operator'

// src/features/account/types/user.types.ts
export interface AccountUser extends User {
  id: string;
  status: UserStatus;
  ownerId: string; // 슈퍼계정은 자기 자신의 id(자기참조), 종속 유저는 슈퍼계정의 id. 2026-07-18부터 non-null (아래 "AccountUser.ownerId 타입을 non-null로 좁힘" 절 참고)
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserBody extends Omit<User, 'company' | 'location' | 'grade'> {
  password: string;
  status: UserStatus;
  grade: SubUserGrade; // super_admin 부여 불가
}
```

### 사용자 관리 목록 필터링

유저 관련 API는 MSW가 아닌 **Neon DB route handler**로 처리한다(msw-rules.md의 예외 규칙 — 인증 관련 API는 route.ts 사용). 클라이언트가 `workspaceOwnerIdAtom`으로 해석한 `ownerId`를 body로 전달하고, route handler는 그대로 `WHERE owner_id = :ownerId`로 필터링한다.

```typescript
// src/app/api/account/users/list/route.ts
export async function POST(req: NextRequest) {
  const { ownerId, filters, page, pageSize } = await req.json();
  const conditions = [eq(users.ownerId, ownerId), /* 날짜/등급/검색 조건 추가 */];
  const rows = await db.select().from(users).where(and(...conditions)).limit(pageSize).offset((page - 1) * pageSize);
  // ...
}
```

```typescript
// src/app/api/account/users/create/route.ts — 하위 유저 등록 시 ownerId를 body로 그대로 저장
const { ownerId, email, password, name, phone, grade, status } = await req.json();
await db.insert(users).values({ id, ownerId, email, /* ... */ });
```

### 데이터 구조 예시

```
슈퍼계정 A (id: 'usr_2f20748f', ownerId: 'usr_2f20748f' — 자기참조, grade: 'super_admin')
├── 홍길동   (id: 'usr_d889b47e', ownerId: 'usr_2f20748f', grade: 'admin')
└── 이서연   (id: 'usr_1771d2f0', ownerId: 'usr_2f20748f', grade: 'operator')
```

(위 id는 실제 개발 DB에 등록된 계정 예시. 새 워크스페이스가 가입하면 동일한 패턴으로 자기 자신의 id를 `ownerId`에 갖는 슈퍼계정이 하나 더 생긴다.)

## 슈퍼계정 ownerId: null → 자기참조로 변경 (2026-07-08)

### 무엇이 바뀌었나

이 문서는 원래 "슈퍼계정은 `ownerId: null`"이라고 설명했다. 실제로 `src/app/api/register/route.ts`도 그렇게 구현돼 있었다. 그런데 "쇼핑몰 정보설정" 기능을 붙이면서 문제가 드러났다:

- `MOCK_SHOPPING_ACCOUNTS_DATA`/`MOCK_SHOPPING_SETTINGS_DATA`의 `ownerId`는 예전 MSW mock 유저(`MOCK_USERS_DATA`, `usr_001`/`usr_005`) 시절 값으로 하드코딩돼 있었다.
- 그 사이 유저 관련 API가 Neon DB로 이전됐고(`feat/neon-db-auth`), 실제 가입 계정의 id는 `usr_2f20748f`처럼 매번 랜덤 생성되는 값이 됐다.
- 결과적으로 실제 로그인 계정으로 `/shopping/settings`, `/shopping/accounts`에 들어가면 mock 데이터가 전혀 안 보이는 상태였다 — `ownerId` 값이 실제 계정과 매칭되지 않았기 때문.

원인을 추적하는 과정에서, 슈퍼계정의 `ownerId`가 DB에 `null`로 저장되는 것 자체도 불필요한 특수 케이스라고 판단해 제거하기로 했다. `workspaceOwnerIdAtom`이 클라이언트에서 `ownerId ?? id`로 매번 null을 자기 id로 치환해주고 있었는데, 애초에 DB에 자기 id를 그대로 저장하면 이 fallback이 필요 없어진다.

### 변경 내용

```typescript
// src/app/api/register/route.ts
// Before
const id = `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
await db.insert(users).values({ id, ownerId: null, /* ... */ });

// After
const id = `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
await db.insert(users).values({ id, ownerId: id, /* ... */ }); // 자기참조
```

기존에 이미 가입된 계정(`ownerId: null`)도 실 DB에서 1회 backfill했다:

```sql
UPDATE users SET owner_id = id WHERE id = 'usr_2f20748f';
```

### mock 데이터를 실제 DB id와 맞추는 절차

이 프로젝트처럼 **일부 도메인은 실 DB(Neon), 일부는 MSW mock**을 쓰는 구조에서는, mock 데이터의 `ownerId`가 실제 DB의 계정 id와 반드시 일치해야 로그인 후 데이터가 보인다. 새 mock 도메인을 추가하거나 인증 흐름이 바뀔 때마다:

1. 실 DB에서 현재 가입 계정을 읽기 전용으로 조회한다 (예: `SELECT id, email, grade, owner_id FROM users`).
2. mock 데이터 파일(`MockShoppingAccountsData.ts` 등)의 `ownerId`를 조회된 실제 id로 맞춘다.
3. 대응하는 실제 계정이 없는 가짜 워크스페이스(과거 `usr_005` 같은 격리 데모용 데이터)는 삭제한다 — 실제로 로그인할 수 없는 워크스페이스의 mock 데이터는 확인할 방법이 없어 의미가 없다.

### `workspaceOwnerIdAtom`의 `?? id` fallback은 왜 남겨뒀나 (2026-07-18 제거됨)

당시엔 과거 `null`로 가입된 레거시 데이터나, 로그아웃 시 클라이언트 atom이 `null`로 초기화되는 경우에 대한 안전장치로 유지했다. 아래 절에서 이 fallback 자체를 제거한 경위를 설명한다.

## AccountUser.ownerId 타입을 non-null로 좁힘 (2026-07-18)

### 무엇이 바뀌었나

2026-07-08 업데이트로 신규 가입 계정은 항상 `ownerId`가 채워지게 됐지만, 타입은 과거 `null` 레거시 데이터에 대한 하위호환을 위해 `string | null`로 계속 남아 있었다. "타입 중복/불일치 정리" 라운드에서 이 하위호환이 실제로 아직 필요한지 검증하기로 했다.

**검증 방법:** 실 DB(Neon)에 읽기전용 쿼리를 직접 실행했다.
```sql
SELECT COUNT(*) FROM users WHERE owner_id IS NULL;
```
결과: 전체 유저 4명 중 `owner_id IS NULL`인 행 **0건**. 레거시 null 데이터가 실질적으로 존재하지 않음을 확인했다.

### 변경 내용

- `AccountUser.ownerId`, `UserWithId.ownerId`, `ownerIdAtom`(기본값 `null`→`''`), `next-auth.d.ts`의 `User`/`Session.user`/`JWT` 3곳 — 전부 `string | null` → `string`으로 좁힘
- `src/shared/utils/apiAuth.ts`의 `token.ownerId ?? token.id`, `auth.store.ts`의 `workspaceOwnerIdAtom`(`ownerId ?? id`) — fallback 전부 제거. 로그아웃 상태는 `ownerIdAtom`이 `''`(falsy)로 리셋되므로 `enabled: !!workspaceOwnerId` 게이팅은 fallback 없이도 동일하게 동작한다.
- **DB 스키마(`src/db/schema.ts`의 `owner_id` 컬럼)는 그대로 nullable로 남겨뒀다** — 마이그레이션 없이 앱 레벨 타입만 좁혔다. 그 결과 NextAuth `authorize()` 콜백 한 곳(`src/app/api/auth/[...nextauth]/route.ts`)에서만 `ownerId: user.ownerId as string` 단일 assertion이 필요하다(DB row는 여전히 `string | null`로 추론되기 때문).

```typescript
// src/app/api/auth/[...nextauth]/route.ts — DB 행 → non-null 앱 타입 경계
return {
  id: user.id,
  // DB 컬럼(owner_id)은 nullable이지만 앱 레벨에서는 항상 non-null로 기록됨
  // (가입/사용자등록 시 자기 id 또는 세션 ownerId로 채움). 2026-07-17 실 DB 확인: null 0건.
  ownerId: user.ownerId as string,
  // ...
};
```

### 알려진 잔여 리스크 (정보성, fail-closed라 데이터 유출 없음)

`?? token.id` fallback 제거로, 2026-07-08 마이그레이션 이전에 발급된 JWT가 아직 살아있다면(세션 `maxAge` 30일) `ownerId: null`을 그대로 들고 있을 수 있다. `isOwnerMatch` 등 fail-closed 패턴 덕분에 데이터 유출은 없고, 해당 세션은 재로그인이 필요해지는 수준이다. 이 작업에서는 로컬 `NEXTAUTH_SECRET`을 로테이션해 로컬 세션을 전부 무효화했고, 운영 환경 로테이션은 별도로 처리하기로 했다.

**타입만 좁히고 DB 스키마는 건드리지 않는 게 언제 맞는가:** "실제로 null이 없다"를 검증할 수 있고, 그 검증이 유효한 범위가 명확할 때(이번 경우 실 DB 직접 조회)는 앱 타입만 좁히는 게 훨씬 저위험이다. DB 컬럼에 `NOT NULL` 제약을 추가하는 건 별도의 신중한 마이그레이션 작업으로 분리한다.

## 다른 도메인으로 확장

매입처, 매출처 등 슈퍼계정에 종속되는 모든 엔티티에 동일한 `ownerId` 패턴을 적용한다.

```typescript
// 예: 매입처 엔티티
interface PurchaseSource {
  id: string;
  ownerId: string; // 항상 슈퍼계정 id (null 없음 — 슈퍼계정 자신은 매입처가 아님)
  name: string;
  // ...
}
```

목록 조회 API는 반드시 로그인 슈퍼계정의 id로 `ownerId` 필터링을 적용해야 한다.

## Why This Matters

- **데이터 격리**: `ownerId` 없이는 A사 슈퍼계정이 B사 유저를 조회·수정하는 경로가 열린다.
- **등급 무결성**: `CreateUserBody.grade: SubUserGrade`로 타입 레벨에서 `super_admin` 부여를 차단한다. UI에서만 옵션을 숨기는 것으로는 부족하다.
- **확장 일관성**: 새 도메인 엔티티가 추가될 때마다 동일한 `ownerId` 패턴을 따르므로 격리 누락 위험이 줄어든다.

## When to Apply

- 새로운 도메인 엔티티(매입처, 매출처 등)를 설계할 때 → `ownerId: string` 포함
- 목록 조회 MSW handler 또는 API를 작성할 때 → `ownerId` 필터 필수
- 사용자 등록 Zod 스키마를 작성할 때 → `grade`를 `SubUserGrade`로 제한

## Related

- `src/features/account/types/user.types.ts` — `AccountUser.ownerId`, `CreateUserBody.grade: SubUserGrade`
- `src/features/auth/types/Auth.ts` — `UserGrade`, `SubUserGrade`
- `src/features/auth/store/auth.store.ts` — `workspaceOwnerIdAtom` (2026-07-18부터 `ownerIdAtom`을 그대로 노출, `?? id` fallback 없음)
- `src/app/api/register/route.ts` — 회원가입 시 `ownerId` 자기참조 저장
- `src/app/api/account/users/list/route.ts`, `create/route.ts` — Neon DB 기반 사용자 목록/등록
- `src/mocks/data/MockShoppingAccountsData.ts`, `MockShoppingSettingsData.ts` — 실제 계정 id로 동기화된 mock 데이터 예시
- `docs/solutions/conventions/typescript-type-design-patterns.md` — `Exclude<>` 기반 SubUserGrade 패턴 (Pattern 5)
