---
title: 회원가입과 사용자 등록의 구조적 차이 및 단일 테이블 설계
date: 2026-06-24
category: architecture-patterns
module: auth/register, account/users
problem_type: architecture_pattern
component: user-management
severity: medium
applies_when:
  - 사용자 생성 로직을 추가/수정할 때
  - users 테이블 스키마를 변경할 때
  - 인증 관련 DB 쿼리를 작성할 때
tags:
  - user-hierarchy
  - signup
  - sub-user
  - single-table
  - ownerid
  - neon-db
---

# 회원가입과 사용자 등록의 구조적 차이 및 단일 테이블 설계

## 두 사용자 생성 경로

이 서비스에는 사용자를 생성하는 경로가 두 가지다.

| 구분 | 회원가입 (`/register`) | 사용자 등록 (`/account/users/create`) |
|------|----------------------|--------------------------------------|
| 생성 주체 | 본인 직접 | 슈퍼계정이 대신 등록 |
| 등급 | `super_admin` 고정 | `admin` / `operator` |
| `ownerId` | `null` | 등록한 슈퍼계정의 `id` |
| 회사 정보 필드 | 모두 입력 (13개 필드) | 없음 (7개 필드만) |
| 비밀번호 | 본인이 설정 | 슈퍼계정이 임시 비밀번호 설정 |
| 로그인 가능 | 즉시 가능 | 즉시 가능 |

## 단일 테이블 설계 결정

두 경로로 생성된 사용자를 **하나의 `users` 테이블로 관리**한다.

### 이유

1. **로그인 흐름이 동일하다.** `authorize()`가 이메일로 사용자를 조회할 때, 하나의 쿼리로 모든 유형의 사용자를 처리할 수 있다. 테이블이 분리되면 두 테이블을 모두 조회해야 한다.

2. **자연스러운 구분자가 이미 있다.** `ownerId: null`이 곧 슈퍼계정이고, `ownerId: string`이 종속 유저다. 별도 테이블 없이도 완벽히 구분된다.

3. **SaaS 표준 패턴이다.** Slack, Notion 등 대부분의 B2B SaaS가 role/discriminator 컬럼으로 단일 users 테이블을 운용한다.

## 회사 정보 필드 처리

회원가입에서만 수집하는 8개 필드 (`representativeName`, `businessNumber`, `businessCategory`, `businessLicenseName`, `contactEmail`, `settlementName`, `settlementEmail`, `settlementPhone`)는 **빈 문자열로 통일**한다.

```typescript
// sub-user 생성 시: 해당 필드 미전송 → DB default('') 적용
// super_admin 생성 시: 폼에서 입력된 값 저장
```

`optional` 타입(`?: string`) 대신 `string` + 빈 문자열로 유지하는 이유:
- 타입 변경 없이 기존 코드와 호환
- `ownerId`로 슈퍼계정/종속 유저를 이미 구분하므로, 필드 존재 여부로 타입을 추가 구분할 필요 없음
- 소비 측 코드에서 undefined 체크 불필요

## DB 스키마 구조

```typescript
// src/db/schema.ts
export const users = pgTable('users', {
  // 공통 필드 (모든 사용자)
  id, ownerId, status, email, password, name, avatar, phone, bio,
  company, location, grade, createdAt, updatedAt,

  // 회사 정보 (super_admin은 실제 값, sub-user는 '')
  representativeName, businessNumber, businessCategory,
  businessLicenseName, contactEmail,
  settlementName, settlementEmail, settlementPhone,
});
```

## 사용자 식별 패턴

```typescript
const isSuper = user.ownerId === null;        // 슈퍼계정 판단
const isSub   = user.ownerId !== null;        // 종속 유저 판단

// 목록 조회: 항상 ownerId로 필터
db.select().from(users).where(eq(users.ownerId, currentUserId));
```

## Related

- `docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md` — ownerId 계층 구조 원칙
- `docs/solutions/architecture-patterns/auth-db-msw-boundary.md` — 인증 DB 전환 경계 설계
- `src/db/schema.ts` — users 테이블 전체 컬럼
- `src/app/api/register/route.ts` — 회원가입 DB insert
- `src/app/api/account/users/create/route.ts` — sub-user DB insert
