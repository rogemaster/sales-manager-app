---
title: MSW/DB 경계 설계 — 인증·유저 정보는 DB, 비즈니스 데이터는 MSW
date: 2026-06-24
last_updated: 2026-09-24
category: architecture-patterns
module: auth, account
problem_type: architecture_pattern
component: authentication, user-management
severity: medium
applies_when:
  - MSW 기반 개발 환경에서 특정 엔드포인트만 실제 DB로 전환할 때
  - route handler 생성 예외가 필요한 경우를 판단할 때
  - 새 기능을 MSW vs DB 중 어디서 처리할지 결정할 때
  - 서버 전용 시크릿(외부 스토리지 키·DB 접속 정보)이 필요한 기능을 설계할 때
  - MSW에 남은 핸들러가 이미 DB로 옮긴 도메인의 데이터를 읽어야 할 때
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

## 경계 확장 (2026-09-01) — 상품이 DB로 넘어갔다

위 표의 "비즈니스 데이터는 MSW"에서 **상품이 빠졌다.** 상품 메인이미지를 Cloudflare R2에 저장하면서 상품 5개 엔드포인트(`list`·`create`·`bulk`·`image`·`[productId]`)가 실제 route handler + Neon으로 이전됐다.

전환 이유는 인증이 아니라 **서버 전용 시크릿**이다. R2 자격증명(`R2_SECRET_ACCESS_KEY` 등)과 `DATABASE_URL`은 브라우저에 내려보낼 수 없고, MSW는 브라우저에서 돈다. 즉 **"MSW가 그 일을 할 수 없는가"라는 같은 질문의 두 번째 답**이다 — 첫 번째는 `authorize()`가 서버에서 실행돼 service worker를 우회한다는 것이었다.

## 판단 기준

새 기능을 구현할 때 DB route handler로 전환할지 MSW로 유지할지 판단하는 기준:

```
"MSW가 이 일을 구조적으로 할 수 없는가?"
  ├ 서버사이드에서 실행되는가 (NextAuth authorize 등)      → DB route handler
  ├ 서버 전용 시크릿이 필요한가 (DB 접속·외부 스토리지 키) → DB route handler
  └ 둘 다 아니다                                           → MSW 유지
```

더 구체적으로:

- **로그인이 가능해야 하는 유저 데이터 (등록/수정/삭제)** → DB
- **인증 흐름 (가입/이메일 중복)** → DB (login 일관성)
- **유저 목록·프로필** → DB (DB에 저장된 실제 유저와 화면이 일치해야 함)
- **외부 스토리지·서드파티 API 키가 필요한 기능 (R2 업로드 등)** → DB route (2026-09-01 추가)
- **시크릿은 없어도 서버가 외부로 요청해야 하는 기능 (엑셀 이미지 확인 `/api/products/image/check`)** → route (2026-09-13 추가). 브라우저에서 도는 MSW는 SSRF 방어가 걸린 서버 측 요청을 대신할 수 없다 — [`server-side-remote-fetch-ssrf-connect-time-validation.md`](server-side-remote-fetch-ssrf-connect-time-validation.md)
- **그 데이터를 영속화해야 배포 환경에서 의미가 있는 기능** → DB route (상품이 이 경우다. 포트폴리오 특성상 배포 URL에서 등록한 상품이 남아야 한다)
- **나머지 비즈니스 데이터 (주문·수집·홈 주문 통계)** → MSW 유지. 쇼핑몰계정·정보설정·연동상품은 2026-09-21~22, 홈 상품 통계는 2026-09-24에 DB route로 옮겼다.

## 과도기 — MSW에 남은 도메인이 이전된 도메인의 데이터를 필요로 할 때 (2026-09-24 종료)

한 도메인만 DB로 옮기면 **MSW에 남은 핸들러가 그 데이터를 읽을 수 없게 된다.** 상품 이전 때 홈 대시보드 통계와 연동상품 스냅샷 생성이 정확히 여기 걸렸다(둘 다 `MOCK_PRODUCT_DATA`를 직접 import하고 있었다).

**당시 해결 — 어댑터 주입.** mock util이 상품 배열을 인자로 받게 바꾸고, MSW 핸들러가 브라우저에서 실제 `/api/products/list`를 불러 그 배열을 넘겼다. 그 경로에는 MSW 핸들러가 없어 요청이 bypass되어 실제 route로 나가고, 같은 오리진이라 세션 쿠키가 붙어 인증도 통과했다.

**이 방식의 한계.** 페이지네이션 API를 `pageSize: 1000`으로 부르는 근사치라 초과분이 **조용히** 사라졌다. 몰 연동 전송에서는 빠진 상품이 "없음"으로 판정돼 403(권한 문제로 오인), 홈 통계에서는 1,000건을 넘으면 숫자가 틀렸다. 게다가 전체 행을 내려받아 브라우저에서 세는 구조라 집계에 드는 비용도 행 수에 비례했다.

**종료.** 소비자 두 곳을 차례로 route로 옮기며 어댑터(`src/mocks/utils/fetchProducts.ts`)를 삭제했다 — 연동상품은 2026-09-22 DB화, 홈 상품 통계·최근 상품은 2026-09-24(`/api/home/stats`는 `COUNT … GROUP BY state`, `/api/home/recent-products`는 `LIMIT 5`).

**결론 — 다음에 같은 상황이 오면 어댑터를 만들지 말고 소비하는 핸들러를 route로 옮긴다.** 어댑터는 "잠깐 쓸 과도기 코드"로 만들었지만 3주 넘게 살아남았고, 그동안 상한이라는 조용한 오답 조건을 품고 있었다. 핸들러를 옮기는 비용은 대개 route 하나와 쿼리 하나라, 어댑터를 짜는 비용과 크게 다르지 않다.

## 구현 패턴

### DB route handler 경로

```
src/app/api/
├── auth/[...nextauth]/route.ts        ← NextAuth
├── register/route.ts                  ← 회원가입
├── check-email/route.ts               ← 이메일 중복 확인
├── profile/route.ts                   ← 프로필 수정
├── account/users/
│   ├── route.ts                       ← 사용자 삭제 (DELETE)
│   ├── list/route.ts                  ← 사용자 목록 조회 (POST)
│   └── create/route.ts                ← 사용자 등록 (POST)
├── products/                          ← 2026-09-01 추가 (Neon + R2)
│   ├── list/route.ts                  ← 상품 목록 조회 (POST)
│   ├── create/route.ts                ← 상품 등록 (POST)
│   ├── bulk/route.ts                  ← 상품 대량 등록 (POST)
│   ├── image/route.ts                 ← 메인이미지 R2 업로드 (POST)
│   ├── image/check/route.ts           ← 엑셀 외부 이미지 확인만 (POST, 2026-09-13)
│   ├── image/import/route.ts          ← 엑셀 외부 이미지 R2 가져오기 (POST, 2026-09-13)
│   └── [productId]/route.ts           ← 단건 조회·수정 (GET/PATCH)
├── shopping/                          ← 2026-09-21~22 추가 (계정·정보설정·연동상품)
│   ├── accounts/ …
│   ├── settings/ …
│   └── linked-products/ …
└── home/                              ← 2026-09-24 추가 (주문 통계는 MSW 유지)
    ├── stats/route.ts                 ← 기간 내 등록 상품의 상태별 건수 (POST)
    ├── linked-product-stats/route.ts  ← 기간 내 연동상품 성공·실패 건수 (POST)
    └── recent-products/route.ts       ← 최근 등록 상품 5건 (POST)
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

MSW는 빠른 프로토타이핑과 UI 개발에 여전히 유효하다. **MSW가 구조적으로 할 수 없는 일만 DB route로 옮기고, 나머지는 MSW에 두는 것이 현 단계에서 가장 합리적인 경계**다.

**단, 도메인을 하나씩 옮길 때마다 위 "과도기" 절의 비용이 발생한다.** 옮기는 도메인의 데이터를 MSW 잔존 도메인이 읽고 있는지 먼저 grep하고(상품의 경우 홈·연동상품 두 곳이었다), 걸리는 핸들러가 있으면 **그 핸들러도 함께 route로 옮기는 것을 이전 범위에 넣는다.**

## Related

- `docs/solutions/integration-issues/msw-timing-issue-auth-db-fix.md` — 이 설계를 도출한 근본 원인
- `docs/solutions/architecture-patterns/signup-vs-sub-user-create.md` — 두 사용자 등록 경로의 DB 저장 방식
- `[[single-item-ownership-header-pattern]]` — `X-Owner-Id` 헤더 패턴은 **MSW 잔존 도메인 전용**이다. DB route로 옮긴 도메인은 `requireSession`으로 세션에서 직접 읽는다
- `[[user-input-blocked-by-type-not-sanitizer]]` — R2 업로드 route의 키 조립·소유권 판정
- `[[api-route-session-auth-guard]]` — **중요**: 여기 나열된 DB route handler들은 `middleware.ts`의 보호를 받지 않는다(matcher가 페이지 경로만 포함). 2026-07-16에야 발견된 인증 공백이었다 — 새 route.ts를 이 경계 기준으로 추가할 때 반드시 함께 참고할 것
