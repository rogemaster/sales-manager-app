# MSW / API 규칙

## MSW Mock 구조

`src/mocks/handlers.ts`는 **인덱스 역할만** 하고, 실제 핸들러는 도메인별로 `src/mocks/handlers/` 안에 분리되어 있다. 비즈니스 로직은 `src/mocks/utils/`로 위임한다.

```
src/mocks/
├── handlers.ts              # 인덱스 — 도메인 핸들러를 spread만 담당
├── config.ts                # baseUrl 공유 상수
├── handlers/                # 도메인별 핸들러
│   ├── auth.ts              # check-email, register, login, logout
│   ├── home.ts              # home/stats, recent-products, order-stats
│   ├── orders.ts            # orders CRUD + comments/claim/history
│   └── collection.ts        # order/collection jobs + trigger
├── data/                    # 정적 mock 원본 데이터
└── utils/                   # 핸들러에서 호출하는 비즈니스 로직
```

- 조건문·반복문·데이터 조작 등 로직이 생기면 반드시 `utils/` 파일로 분리한다.
- 핸들러 안에서 직접 데이터를 가공하거나 mock 배열을 직접 수정하지 않는다.
- `baseUrl`은 `config.ts`에서 import한다. 핸들러 파일마다 직접 선언하지 않는다.

```typescript
// 올바른 예 — 핸들러는 위임만 한다
http.patch(`${baseUrl}/api/orders/:orderId`, async ({ request, params }) => {
  const update = (await request.json()) as Partial<OrderDetail>;
  const updated = updateMockOrder(params.orderId as string, update);
  if (!updated) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(updated);
}),
```

## API 추가 규칙

이 프로젝트는 **개발 환경에서 MSW가 모든 API 요청을 가로채므로 Next.js route handler 파일이 필요 없다.**

- **절대 금지:** `src/app/api/.../route.ts` 파일 생성
- **예외 1:** 유저 정보를 직접 조회·등록·수정해야 하는 API는 `route.ts`를 사용한다 (인증 구조상 MSW로 처리할 수 없기 때문). 해당 경로의 MSW 핸들러와 관련 utils/data는 함께 제거한다.
- **예외 2 — 서버 전용 시크릿이 필요한 API는 `route.ts`를 사용한다.** R2 업로드(`/api/products/image`)와 상품 DB 접근(`/api/products/*`)이 여기 해당한다. 엑셀 이미지 확인·가져오기(`/api/products/image/check`·`/import`)도 같은 예외다 — 확인은 시크릿을 쓰지 않지만 SSRF 방어가 걸린 외부 요청을 서버에서 해야 하므로 브라우저의 MSW로 처리할 수 없다. R2 자격증명과 `DATABASE_URL`은 서버 전용이라 브라우저에서 도는 MSW로 처리할 수 없다. 회원가입 route가 DB 때문에 예외인 것과 같은 구조다. 해당 경로의 MSW 핸들러와 관련 utils/data는 함께 제거한다.
  고객사 상품코드 중복 확인(`/api/products/customer-code/check`)도 상품 DB를 읽으므로 같은 예외다.
  쇼핑몰계정·정보설정·연동상품(`/api/shopping/*`)도 2026-09-21~22에 DB로 이전돼 같은 예외다. 연동상품 route는 외부몰(시뮬레이터)을 서버에서 HTTP로 부른다.
  홈 상품 통계·최근 상품(`/api/home/stats`·`/recent-products`)도 2026-09-24에 상품 DB를 직접 집계하는 route로 옮겼다. MSW의 홈 핸들러에는 주문 통계만 남는다.
  - 남아 있는 MSW 핸들러가 이전된 리소스를 필요로 하면, 브라우저에서 실제 route를 불러 받아 오는 어댑터를 만들기보다 **그 핸들러 자체를 route로 옮긴다.** 어댑터 방식은 목록 API를 "사실상 전체"로 불러 브라우저에서 세게 되어, 상한을 넘으면 결과가 조용히 틀린다(홈 통계가 1,000건 초과 시 그랬다).
- **그 외 route.ts가 필요하다고 판단되는 경우:** Claude가 먼저 이유를 설명하고 사용자에게 생성 여부를 확인한 후 진행한다.
- **올바른 방법:** 해당 도메인의 `src/mocks/handlers/*.ts` 파일에 핸들러를 추가한다. 새 도메인이면 새 파일을 생성하고 `handlers.ts` 인덱스에 spread를 추가한다.

```typescript
// 예: src/mocks/handlers/orders.ts 에 추가
http.post(`${baseUrl}/api/example`, async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json(data);
}),
```

## 경로 충돌 주의

고정 경로(`/status`)와 동적 경로(`/:id`)가 같은 prefix를 공유할 때, **고정 경로 핸들러를 반드시 먼저 등록**한다.

```typescript
// 올바른 순서(예시)
http.patch('.../shopping/accounts/status', ...),  // 먼저
http.patch('.../shopping/accounts/:id', ...),     // 나중
```

## HTTP 메서드 선택 기준

새 API를 추가할 때 **REST 의미론보다 기존 패턴을 먼저 확인한다.**

| 메서드 | 용도 |
|--------|------|
| `POST` | 목록 조회, 필터가 있는 통계 조회, 리소스 생성 |
| `GET` | 단건 조회 (`:id` 파라미터), 파라미터 없는 단순 조회 |
| `PATCH` | 부분 수정 |
| `DELETE` | 삭제 |

**핵심 규칙:** 필터·검색 조건을 body로 전달하는 조회는 `POST`를 사용한다. "조회니까 GET"이라는 REST 원칙만 보고 결정하지 않는다.
