# API 추가 규칙 — route handler

## 기본은 route handler + Neon이다

새 API는 `src/app/api/.../route.ts`로 만들고 Neon(`@/db`)을 읽고 쓴다. 사용자·상품·쇼핑몰(계정·정보설정·연동상품)·주문(목록·상세·클레임·코멘트·이력)·홈 통계가 전부 이 방식이다.

- **인증:** `requireSession(req)` 또는 `requirePermission(req, '<동작>')`(`src/shared/utils/apiAuth.ts`)로 시작한다. 반환값이 `NextResponse`면 그대로 반환한다. `middleware.ts`는 페이지 경로만 보호하므로 route는 스스로 막아야 한다(`docs/solutions/architecture-patterns/api-route-session-auth-guard.md`).
- **테넌트:** `ownerId`는 클라이언트 값이 아니라 세션에서 꺼낸 값으로 거른다.
- **권한:** 등급 정책은 `src/shared/utils/permission.ts`의 `PERMISSIONS` 표가 정본이다. `requirePermission`을 단 route는 `src/app/api/routePermissions.test.ts` 표에도 추가한다.
- **요청 본문:** Zod 스키마로 검증한다. `parseRequestBody(req, schema)`(`src/shared/utils/requestBody.ts`)를 `try` 밖에서 부르면 파싱 실패·검증 실패가 400이 된다.
  - **보정과 거절의 기준:** 값을 바꿔도 결과의 의미가 같으면 보정하고(`page`·`pageSize`), 의미가 바뀌면 400으로 거절한다(날짜·필터 코드·선택 `ids`). 목록은 `src/shared/utils/listRequest.ts`를 쓴다(2026-09-26).
  - 선택한 행을 일괄 처리하는 요청은 `src/shared/utils/bulkRequest.ts`를 쓴다. `ids` 누락을 0건으로 답하지 않는다 — 화면이 "대상 없음"이라는 거짓 안내를 띄운다.
  - 필드 규칙을 한글로 돌려주는 도메인 검증 함수(`findProductWriteViolation` 등)가 있으면 입구는 `objectBodySchema()`로 모양만 본다 — 규칙을 Zod로 두 벌 쓰지 않는다.
  - 예외: 상품 확인 route 3개(자체 판독 함수로 이미 400), 외부몰 시뮬레이터(네이버 오류 형식을 흉내 내야 한다).
- 인증이 없는 route는 로그인(`auth/[...nextauth]`)·가입(`register`, `check-email`)과 외부몰 시뮬레이터(`external/naver/*`, 계정 API Key를 Bearer로 받음)뿐이다.

## MSW는 없다 (2026-10-01 제거)

모든 API는 route다. 주문 수집 DB화(주문 DB화 라운드 3)와 함께 `src/mocks/`·`MSWProvider`·`msw` 패키지를 걷어냈다.

- **서버 MSW(`setupServer`)를 다시 켜지 않는다.** Node의 MSW는 서버의 모든 `fetch`를 가로챈다. `neon-http`는 쿼리를 `fetch`로 보내므로 `[MSW] Warning`이 쿼리마다 SQL과 파라미터를 로그에 남긴다(2026-09-24, `auth-db-msw-boundary.md`의 "MSW를 켜는 범위" 절).
- 외부몰이 필요한 흐름은 mock이 아니라 **시뮬레이터 route**(`src/simulators/`, `/api/external/<몰>/...`)로 만든다. 앱은 시뮬레이터를 import하지 않고 HTTP로만 부른다.
- 주문 엑셀 대량등록(`bulkCreateOrders` → `POST /api/orders/bulk`)은 목적지 route가 없다 — 화면을 만들 때 route로 구현한다(`excel.md`).

## HTTP 메서드 선택 기준

REST 의미론보다 기존 패턴을 먼저 따른다.

| 메서드 | 용도 |
|--------|------|
| `POST` | 목록 조회, 필터가 있는 통계 조회, 리소스 생성 |
| `GET` | 단건 조회(`:id`), 파라미터 없는 단순 조회 |
| `PATCH` | 부분 수정 |
| `DELETE` | 삭제 |

**필터·검색 조건을 body로 전달하는 조회는 `POST`를 쓴다.** "조회니까 GET"만 보고 정하지 않는다.
