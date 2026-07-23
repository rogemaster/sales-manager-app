---
title: MSW/DB 경계 설계 — 인증·유저 정보는 DB, 비즈니스 데이터는 MSW
date: 2026-06-24
category: architecture-patterns
module: auth, account
problem_type: architecture_pattern
component: authentication, user-management
severity: medium
applies_when:
  - MSW 기반 개발 환경에서 특정 엔드포인트만 실제 DB로 전환할 때
  - route handler 생성 예외가 필요한 경우를 판단할 때
  - 새 기능을 MSW vs DB 중 어디서 처리할지 결정할 때
tags:
  - msw
  - neon-db
  - nextauth
  - architecture
  - route-handler
  - boundary
---

# MSW/DB 경계 설계 — 인증·유저 정보는 DB, 비즈니스 데이터는 MSW

## Context

이 프로젝트는 개발 환경에서 MSW(Mock Service Worker)로 모든 API를 처리하는 구조다. 그러나 MSW의 구조적 한계 및 DB와의 일관성 유지 필요로 인해 인증·유저 관련 엔드포인트는 실제 DB route handler로 전환했다.

## 현재 경계 (2026-06-24 기준)

**DB route handler로 전환한 엔드포인트:**

| 엔드포인트 | 이유 |
|-----------|------|
| `POST /api/login` (→ `authorize()` 직접 DB 조회) | NextAuth `authorize()`가 서버사이드에서 실행, MSW service worker 우회 불가 |
| `POST /api/register` | 등록 유저가 실제 DB에 있어야 로그인 가능 |
| `POST /api/check-email` | DB 기반 중복 확인이어야 register와 일관성 유지 |
| `POST /api/account/users/create` | sub-user도 로그인 가능해야 하므로 DB 저장 필수 |
| `POST /api/account/users/list` | DB에 저장된 실제 유저만 목록에 표시되어야 함 |
| `DELETE /api/account/users` | DB에서 삭제해야 로그인 불가 처리와 일관성 유지 |
| `PATCH /api/profile` | 프로필 수정 결과가 NextAuth 세션(DB 조회 기반)과 일치해야 함 |

**MSW에 유지한 엔드포인트:**

비즈니스 데이터 (상품, 주문, 쇼핑몰 계정, 매입처, 매출처 등)는 MSW 그대로 유지한다. 이 데이터들은 유저 인증·식별과 무관하며, mock 데이터로 개발하는 데 충분하다.

## 판단 기준

새 기능을 구현할 때 DB route handler로 전환할지 MSW로 유지할지 판단하는 기준:

```
"이 데이터가 유저 인증·식별에 직접 연관되는가?"
  YES → DB route handler
  NO  → MSW 유지
```

더 구체적으로:

- **로그인이 가능해야 하는 유저 데이터 (등록/수정/삭제)** → DB
- **인증 흐름 (가입/이메일 중복)** → DB (login 일관성)
- **유저 목록·프로필** → DB (DB에 저장된 실제 유저와 화면이 일치해야 함)
- **비즈니스 데이터 (상품/주문/매입처 등)** → MSW 유지

## 구현 패턴

### DB route handler 경로

```
src/app/api/
├── auth/[...nextauth]/route.ts        ← NextAuth
├── register/route.ts                  ← 회원가입
├── check-email/route.ts               ← 이메일 중복 확인
├── profile/route.ts                   ← 프로필 수정
└── account/users/
    ├── route.ts                       ← 사용자 삭제 (DELETE)
    ├── list/route.ts                  ← 사용자 목록 조회 (POST)
    └── create/route.ts                ← 사용자 등록 (POST)
```

### MSW route handler 제거 방법

DB로 전환한 경로의 MSW 핸들러 파일과 관련 utils를 함께 제거해야 브라우저 fetch가 실제 route handler에 도달한다. 핸들러 파일 자체를 삭제하고 `handlers.ts` 인덱스의 import/spread도 제거한다.

```typescript
// src/mocks/handlers/auth.ts — logout만 유지 (나머지는 route.ts로 처리)
export const authHandlers = [
  http.post(`${baseUrl}/api/logout`, () => {
    return new HttpResponse(null, {
      headers: { 'Set-Cookie': 'connect.sid=;HttpOnly;Path=/;Max-Age=0' },
    });
  }),
];
// users.ts, profile.ts 핸들러 파일은 삭제됨
```

## Why Not Full DB Migration

개발 단계에서 모든 기능을 DB화하면:
- 작업 볼륨이 과도하게 증가
- 도메인별 스키마 설계 부담
- 비즈니스 로직 테스트에 실제 DB 의존성 생김

MSW는 빠른 프로토타이핑과 UI 개발에 여전히 유효하다. **유저 데이터는 DB, 비즈니스 데이터는 MSW가 현 단계에서 가장 합리적인 경계**다.

## Related

- `docs/solutions/integration-issues/msw-timing-issue-auth-db-fix.md` — 이 설계를 도출한 근본 원인
- `docs/solutions/architecture-patterns/signup-vs-sub-user-create.md` — 두 사용자 등록 경로의 DB 저장 방식
- `[[api-route-session-auth-guard]]` — **중요**: 여기 나열된 DB route handler들은 `middleware.ts`의 보호를 받지 않는다(matcher가 페이지 경로만 포함). 2026-07-16에야 발견된 인증 공백이었다 — 새 route.ts를 이 경계 기준으로 추가할 때 반드시 함께 참고할 것
