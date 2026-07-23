---
title: 사용자 등록 폼에서 super_admin 등급 부여 가능한 버그
date: 2026-06-15
category: logic-errors
module: features/account
problem_type: logic_error
component: frontend_stimulus
severity: high
symptoms:
  - 사용자 등록 폼에서 등급 드롭박스에 super_admin 옵션이 노출됨
  - super_admin 등급으로 하위 유저를 등록할 수 있는 정책 위반 경로 존재
  - Zod 스키마가 super_admin을 허용하여 타입 레벨 차단이 없음
root_cause: logic_error
resolution_type: code_fix
tags:
  - zod
  - user-grade
  - super-admin
  - type-safety
  - policy
---

# 사용자 등록 폼에서 super_admin 등급 부여 가능한 버그

## Problem

`UserCreateForm`의 Zod 스키마가 `grade`를 `z.enum(['super_admin', 'admin', 'operator'])`로 정의하여, 사용자 등록 화면에서 `super_admin` 등급을 부여할 수 있는 경로가 열려 있었다. `UserCreateLayout`에서 `isSuperAdmin` 조건으로 옵션 필터링을 시도했으나 필터 로직이 반대로 작성되어 super_admin 로그인 시 오히려 전체 옵션(super_admin 포함)이 노출됐다.

아키텍처 패턴 문서(`user-hierarchy-ownerid-pattern.md`)는 이 정책을 명시하고 있었으나 구현 시 반영되지 않았다.

## Symptoms

- 사용자 등록 폼 등급 Select에 `super_admin` 항목이 노출됨
- `super_admin` 계정으로 로그인 시 모든 등급 옵션이 표시되는 역설적 상황
- `TypeScript` 컴파일 에러: `CreateUserBody.grade: SubUserGrade`와 `CreateUserFormData.grade: UserGrade` 간 타입 불일치 (line 32 `UserCreateLayout.tsx`)

## What Didn't Work

초기 구현에서 `UserCreateLayout`은 `isSuperAdmin`일 때 전체 옵션(`USER_GRADE_OPTIONS`)을 노출하고, 아닐 때만 `super_admin`을 필터링하는 조건을 추가했다. 이는 정책과 정반대다 — super_admin도 하위 유저 등록 시 `super_admin` 등급을 부여할 수 없어야 한다.

```typescript
// ❌ 잘못된 구현 — super_admin 사용자에게 super_admin 포함 전체 옵션 노출
const gradeOptions = isSuperAdmin
  ? USER_GRADE_OPTIONS                                          // super_admin 포함
  : USER_GRADE_OPTIONS.filter((o) => o.id !== 'super_admin'); // super_admin 제외
```

또한 Zod 스키마도 `super_admin`을 포함하여 `CreateUserBody.grade: SubUserGrade`와 타입 충돌이 발생했다.

## Solution

**1. `UserCreateForm.tsx` — Zod 스키마에서 super_admin 제거:**

```typescript
// Before
grade: z.enum(['super_admin', 'admin', 'operator'], { message: '등급을 선택해주세요.' }),

// After
grade: z.enum(['admin', 'operator'], { message: '등급을 선택해주세요.' }),
```

**2. `UserCreateLayout.tsx` — 조건 없이 항상 super_admin 제외:**

```typescript
// Before
const gradeOptions = isSuperAdmin
  ? USER_GRADE_OPTIONS
  : USER_GRADE_OPTIONS.filter((o) => o.id !== 'super_admin');

// After
const gradeOptions = USER_GRADE_OPTIONS.filter((o) => o.id !== 'super_admin');
```

## Why This Works

`super_admin`은 회원가입(`/register`) 경로로만 생성되는 최상위 계정이다. 사용자 관리 화면의 등록 기능은 슈퍼계정이 자신의 워크스페이스에 속할 하위 유저(`admin`, `operator`)를 추가하는 용도이므로, 어떤 로그인 등급이든 `super_admin` 부여는 불가능해야 한다.

`CreateUserBody.grade: SubUserGrade`(`Exclude<UserGrade, 'super_admin'>`) 타입이 이미 정책을 표현하고 있으므로, Zod 스키마도 이에 맞춰야 런타임·타입 레벨이 일치한다.

## Prevention

- **사용자 등록 Zod 스키마 작성 시:** `grade` 필드는 반드시 `z.enum(['admin', 'operator'])`로 제한한다. `UserGrade` 전체를 넣지 않는다.
- **아키텍처 패턴 문서 선확인:** `features/account` 관련 작업 전 `docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md`를 참조한다.
- **UI 옵션 제거만으로는 부족:** 타입 레벨(`SubUserGrade`)과 스키마 레벨(Zod enum) 모두 차단해야 방어가 완성된다.

## Related

- `docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md` — 계층 구조 및 등급 부여 정책
- `src/features/account/types/user.types.ts` — `CreateUserBody.grade: SubUserGrade`
- `src/features/auth/types/Auth.ts` — `SubUserGrade = Exclude<UserGrade, 'super_admin'>`
- `src/features/account/ui/user/create/UserCreateForm.tsx` — 수정된 Zod 스키마
- `src/features/account/ui/user/create/UserCreateLayout.tsx` — 수정된 gradeOptions 로직
