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
│   ├── products.ts          # products CRUD + bulk
│   ├── orders.ts            # orders CRUD + comments/claim/history
│   ├── mallAccounts.ts      # mall-accounts CRUD
│   ├── collection.ts        # order/collection jobs + trigger
│   ├── users.ts             # account/users CRUD
│   ├── profile.ts           # profile PATCH
│   └── shoppingAccounts.ts  # shopping/accounts CRUD
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
- **예외:** 유저 정보를 직접 조회·등록·수정해야 하는 API는 `route.ts`를 사용한다 (인증 구조상 MSW로 처리할 수 없기 때문). 해당 경로의 MSW 핸들러와 관련 utils/data는 함께 제거한다.
- **그 외 route.ts가 필요하다고 판단되는 경우:** Claude가 먼저 이유를 설명하고 사용자에게 생성 여부를 확인한 후 진행한다.
- **올바른 방법:** 해당 도메인의 `src/mocks/handlers/*.ts` 파일에 핸들러를 추가한다. 새 도메인이면 새 파일을 생성하고 `handlers.ts` 인덱스에 spread를 추가한다.

```typescript
// 예: src/mocks/handlers/products.ts 에 추가
http.post(`${baseUrl}/api/example`, async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json(data);
}),
```

## 경로 충돌 주의

고정 경로(`/status`)와 동적 경로(`/:id`)가 같은 prefix를 공유할 때, **고정 경로 핸들러를 반드시 먼저 등록**한다.

```typescript
// 올바른 순서 (shoppingAccounts.ts 참고)
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
