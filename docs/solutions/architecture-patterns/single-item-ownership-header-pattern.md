---
title: 단건 조회/수정 API의 ownerId 소유권 검증 — X-Owner-Id 헤더 패턴
date: 2026-07-13
category: architecture-patterns
module: mocks
problem_type: architecture_pattern
component: development_workflow
severity: high
applies_when:
  - 목록 조회는 ownerId로 필터링되지만 단건 조회(:id)는 아무 검증 없이 리소스를 반환할 때
  - GET처럼 body가 없는 요청에 ownerId를 실어 보내야 할 때
  - PATCH의 업데이트 payload를 ownerId 같은 인증 정보로 오염시키고 싶지 않을 때
  - 새 도메인 엔티티(매입처·매출처 등)의 단건 조회/수정 API를 설계할 때
symptoms:
  - 다른 테넌트(슈퍼계정)의 orderId/productId/id를 URL에 직접 넣으면 조회·수정이 그대로 성공한다
  - 하위 리소스(주문 클레임/코멘트/이력)는 부모 리소스가 아예 없어도 404 없이 null/빈 배열을 반환한다
  - PATCH 요청 body에 ownerId 필드를 포함시켜 보내면 리소스의 소유권이 그대로 바뀐다
related_components:
  - tooling
tags:
  - multi-tenant
  - ownerid
  - msw
  - authorization
  - data-isolation
  - architecture
  - x-owner-id
---

# 단건 조회/수정 API의 ownerId 소유권 검증 — X-Owner-Id 헤더 패턴

## Context

`user-hierarchy-ownerid-pattern.md`에서 확립한 `ownerId` 테넌트 격리를 이 프로젝트는 두 라운드에 걸쳐 적용했다.

1차 라운드(PR #23)는 **목록 조회 + 생성**(`orders/list`, `products/create`, `home/stats` 등)만 다뤘다. 목록/생성 API는 이미 필터 조건이나 생성 payload를 JSON body로 보내고 있었으므로, 그 body에 `ownerId`를 얹는 것이 자연스러웠다.

그런데 그 작업 도중 **단건 조회(`GET /api/orders/:orderId`, `GET /api/products/:productId`, `GET /api/shopping/accounts/:id` 등)는 5개 도메인 전부 예외 없이 `ownerId` 검증이 전혀 없다**는 게 드러났다. 리소스 타입에 `ownerId` 필드는 있지만 아무도 확인하지 않는 상태였다. 특히:

- 주문 하위 리소스(`claim`/`comments`/`history`)는 부모 order가 아예 없어도 404 없이 `null`/`[]`를 관대하게 반환하고 있었다.
- `order/collection/trigger`는 `jobIds` 배열을 받아 여러 작업을 한 번에 실행하는데, 일부 job이 다른 테넌트 소유여도 그대로 실행됐다.

목록/생성 라운드에서는 이 단건 조회 공백을 의도적으로 범위 외로 미뤘다 — `Order`만 먼저 고치면 도메인마다 격리 수준이 들쭉날쭉해지므로, 다음에 착수할 때는 `ShoppingAccount`/`ShoppingSetting`까지 포함한 전 도메인을 한 번에 다루기로 했다(`user-hierarchy-ownerid-pattern.md`의 "다른 도메인으로 확장" 원칙과 동일한 이유). 2차 라운드(PR #24)에서 이 공백을 전 도메인 일괄로 해소했다.

## Guidance

### 왜 쿼리파라미터/body가 아니라 헤더인가

단건 조회 라운드에서 목록/생성과 **다른 전송 방식**을 선택했다. 세 가지를 비교했다:

| 방식 | 문제 |
|---|---|
| A. 커스텀 헤더(`X-Owner-Id`) 통일 | 선택됨 |
| B. GET은 쿼리파라미터, PATCH는 body | `ownerId`가 로그 등에 노출될 수 있고, 메서드마다 ownerId를 읽는 위치가 갈라져 검증 로직이 나뉜다 |
| C. 서버가 인증 세션에서 직접 ownerId 추출 | 이 프로젝트는 MSW가 API를 가로채는 구조라 핸들러가 NextAuth 세션에 접근할 수 없다. 가능하게 하려면 해당 도메인을 전부 실제 `route.ts` + 실 DB(Neon)로 옮겨야 하는데, 이는 "mock 제거 + DB 마이그레이션" 규모의 별개 프로젝트다 |

**A(헤더 통일)를 택한 이유:** GET(body 없음)과 PATCH(도메인 업데이트 payload를 오염시키고 싶지 않은 경우) 모두 동일한 방식으로 처리되어, 서버 쪽 검증 로직이 메서드에 상관없이 통일된다.

**목록/생성 엔드포인트(body 방식)는 그대로 둔다.** 이미 병합·검증된 15개 엔드포인트를 전부 헤더로 재작업하는 것은 "일관성 확보"라는 명분은 있지만 별도 리팩터링이고 회귀 위험만 늘어난다고 판단해 보류했다. body에 이미 필터/생성 payload가 있는 요청은 body로, body가 없거나 오염시키고 싶지 않은 요청은 헤더로 — "상황에 맞는 전송 방식을 쓴다"는 일관된 원칙이지 임의의 불일치는 아니다.

### 공통 검증 유틸

```typescript
// src/mocks/utils/verifyOwnership.ts
export const isOwnerMatch = (resourceOwnerId: string, requestOwnerId: string | null): boolean =>
  !!requestOwnerId && resourceOwnerId === requestOwnerId;
```

### 핸들러 패턴 (GET/PATCH 공통)

```typescript
// src/mocks/handlers/products.ts
http.get(`${baseUrl}/api/products/:productId`, ({ params, request }) => {
  const ownerId = request.headers.get('X-Owner-Id');
  const data = MOCK_PRODUCT_DATA.find((item) => item.productId === params.productId);
  if (!data || !isOwnerMatch(data.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
  return HttpResponse.json(data);
}),
```

**불일치와 리소스 없음을 항상 같은 404로 응답한다.** 다른 테넌트 리소스가 "존재는 하지만 접근 불가"인지 "아예 없음"인지 구분해서 알려주면 존재 여부 자체가 유출된다.

### 클라이언트 — 헤더 첨부

```typescript
// src/features/products/api/getProduct.ts
export const getProduct = async (productId: string, ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  // ...
};
```

호출부(레이아웃 컴포넌트 또는 훅)에서 `workspaceOwnerIdAtom`(`@/features/auth/store/auth.store`)을 읽어 넘긴다. 목록 조회와 동일하게 `enabled: !!workspaceOwnerId` 가드를 유지한다.

### 하위 리소스는 부모의 소유권을 기준으로 검증한다

`orders/:orderId/claim`, `/comments`, `/history`처럼 자기 자신에 `ownerId`가 없는(또는 확인이 번거로운) 서브 리소스는, 부모 리소스를 먼저 찾아 소유권을 확인하는 헬퍼로 통일한다.

```typescript
// src/mocks/handlers/orders.ts
const findOwnedOrder = (orderId: string, ownerId: string | null) => {
  const order = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
  return order && isOwnerMatch(order.ownerId, ownerId) ? order : null;
};
```

이렇게 하면 부모 order가 아예 없는 경우와 다른 테넌트 소유인 경우가 똑같이 404로 처리되어, 예전처럼 "order 없음 → null 관대 반환" 같은 예외 경로가 사라진다.

### ~~예외: 다건 액션은 필터링, 거부하지 않는다~~ → 2026-07-16 폐기, fail-closed로 통일

> **이 절의 원래 내용(아래 취소선)은 2026-07-16 설계 누수 점검에서 뒤집혔다.** 소유하지 않은 id가 섞여 들어왔다는 것 자체가 이미 비정상 신호(캐시 오염, 클라이언트 버그, 또는 탐색성 공격 시도)인데, 조용히 필터링하고 성공 처리하면 그 신호가 사라진다. 게다가 부분 성공/실패의 차이(예: `triggeredCount`가 요청한 개수보다 적음)가 공격자에게 "이 id는 존재하고 저 id는 남의 것"이라는 정보를 흘려줄 수 있다. **다건(bulk) id를 받는 액션도 단건과 동일하게 fail-closed(하나라도 불일치 시 전체 거부, 아무것도 처리하지 않음)를 기본 원칙으로 한다.**
>
> 새 헬퍼 `allOwnedBy`(`src/mocks/utils/verifyOwnership.ts`)를 핸들러에서 직접 호출해, 전부 소유일 때만 뮤테이션 함수를 호출한다:
>
> ```typescript
> // src/mocks/handlers/collection.ts
> const ownerId = request.headers.get('X-Owner-Id');
> const { jobIds } = (await request.json()) as TriggerCollectionBody;
> if (!allOwnedBy(jobIds, ownerId, MOCK_COLLECTION_JOBS)) {
>   return new HttpResponse(null, { status: 403 });
> }
> const triggeredCount = triggerOrderCollectionMock(jobIds); // 이제 ownerId 파라미터 없음 — 사전 검증된 jobIds만 받는 순수 함수
> ```
>
> `triggerOrderCollectionMock`은 자기 안에서 하던 `isOwnerMatch` 필터링을 잃고, 호출 전에 이미 소유가 보장된 `jobIds`만 트리거하는 순수 함수로 단순화됐다. 이 fail-closed 원칙은 `order/collection/trigger`뿐 아니라, 같은 조사에서 함께 발견된 **ownerId 검증이 아예 없던** `shopping/accounts`/`shopping/settings`의 bulk delete·status 핸들러에도 동일하게 적용했다. 자세한 내용은 `[[api-route-session-auth-guard]]` 참고.
>
> ~~`order/collection/trigger`처럼 여러 id를 한 번에 받는 액션은 위 404 규칙의 예외다. 요청 전체를 거부하는 대신 **요청자가 소유한 것만 걸러서 실행**하고, 실제로 실행된 개수를 응답한다.~~
>
> ~~전부 다른 테넌트 소유여도 `200`과 `triggeredCount: 0`을 반환한다 — 클라이언트 UI가 애초에 자기 소유 job만 보여주고 선택하게 하므로, 섞여 있는 것 자체가 비정상 상황이라는 전제다.~~

**여전히 유효한 것:** 필터링/검증 로직을 반드시 `utils/`로 분리해 핸들러 안에 데이터 조작을 직접 넣지 않는다는 원칙(`msw-rules.md`)은 fail-closed 전환 후에도 그대로 유지된다 — `allOwnedBy`도 `verifyOwnership.ts`에 있다.

### PATCH 시 클라이언트가 보낸 ownerId를 재고정한다

PATCH 핸들러는 *읽기* 접근을 소유권 체크로 막지만, 업데이트 payload 자체(도메인 타입에 `ownerId` 필드가 있는 경우)를 그대로 spread하면 클라이언트가 보낸 `ownerId`로 리소스 소유권이 조용히 바뀔 수 있다. `updateMockX` 유틸에서 기존 레코드의 `ownerId`를 항상 재고정한다.

```typescript
// src/mocks/utils/updateProduct.ts
MOCK_PRODUCT_DATA[index] = { ...MOCK_PRODUCT_DATA[index], ...update, ownerId: MOCK_PRODUCT_DATA[index].ownerId };
```

현재 UI 폼에 `ownerId`를 편집 가능한 필드로 노출한 곳은 없어 당장 악용 가능한 권한 상승은 아니지만(최악의 경우 자기 리소스를 자기 테넌트에서 스스로 이탈시키는 정도), 이 작업의 목적 자체가 테넌트 격리 강화이므로 재고정을 함께 넣었다.

### 시그니처 변경 시 스텔 콜러(stale caller)를 반드시 grep한다

`getOrder`/`updateOrder` 같은 함수의 시그니처에 `ownerId` 인자를 추가하면 TypeScript가 모든 호출부에서 에러를 내주지만, **빌드 에러가 아니라 예상치 못한 다른 호출부를 놓치는 실수**가 실제로 발생했다. `updateOrder(orderId, data)` → `updateOrder(orderId, data, ownerId)`로 바꾸면서 `bulkUpdateOrderStatus.ts`(주문 목록의 일괄 상태변경 액션)가 내부적으로 `updateOrder`를 호출하고 있다는 걸 계획서 작성 시점에는 놓쳤다. 다행히 TypeScript 컴파일 에러로 즉시 드러나 그 자리에서 같은 패턴(`workspaceOwnerIdAtom` 스레딩)으로 고쳤지만, **API 함수 시그니처를 바꾸는 작업은 계획 단계에서부터 `grep -r "함수명("`으로 전체 호출부를 확인하고 시작해야** 이런 재작업을 피할 수 있다.

## Why This Matters

- 헤더 통일 덕분에 GET/PATCH/서브액션 전부 같은 위치(`request.headers.get('X-Owner-Id')`)에서 ownerId를 읽어, 검증 로직이 메서드마다 갈라지지 않는다.
- 404 통일은 리소스 존재 여부 자체가 다른 테넌트에게 유출되지 않게 막는다 — "없음"과 "네 것이 아님"을 구분해서 응답하면 그 자체로 정보 누출이다.
- (2026-07-16 갱신) `trigger`의 옛 "필터링-not-거부" 예외를 별도 문서화 없이 묵시적 관행으로 남겨뒀더니, 이후 같은 카테고리(bulk id 액션)의 다른 엔드포인트 4곳(`shopping/accounts`/`shopping/settings`의 delete·status)이 아예 ownerId 검증 자체가 없는 채로 방치돼 있었다 — "예외를 문서화하지 않으면 다음 사람이 404를 복붙한다"던 우려가, 실제로는 "예외 자체가 뒤집혀야 했는데 아무도 재검토하지 않아 검증 누락이 반복됐다"는 정반대 형태로 나타난 것. 지금은 fail-closed로 통일해 이 예외 자체가 없어졌다.

## When to Apply

- 새 도메인 엔티티(매입처·매출처 등)의 단건 조회/수정 API를 설계할 때 → GET/PATCH 모두 `X-Owner-Id` 헤더 + `isOwnerMatch` 검증
- 여러 id를 한 번에 받는 액션(일괄 실행/일괄 삭제 등)을 설계할 때 → **기본값은 fail-closed**(`allOwnedBy`로 전부 소유 확인 후 진행, 하나라도 불일치 시 전체 거부). 필터링-후-진행으로 갈 정당한 이유가 있다면 그 이유를 문서에 명시할 것
- 기존 API 함수 시그니처에 인자를 추가할 때 → 커밋 전에 반드시 전체 호출부 grep

## Related

- `docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md` — ownerId 계층 구조의 원 설계 문서
- `docs/solutions/architecture-patterns/msw-domain-split-handlers.md` — 핸들러의 utils/ 분리 원칙(고정경로 vs 동적경로 순서 포함)
- `[[api-route-session-auth-guard]]` — 2026-07-16 fail-closed 전환 및 실 API 인증 가드 작업 전문
- `src/mocks/utils/verifyOwnership.ts` — `isOwnerMatch`/`allOwnedBy` 공통 유틸
- `src/mocks/handlers/orders.ts` — `findOwnedOrder` 하위 리소스 소유권 헬퍼
- `src/mocks/utils/triggerOrderCollection.ts` — fail-closed 전환 후 ownerId 파라미터 없는 순수 함수
- `docs/superpowers/specs/2026-07-13-single-item-ownership-validation-design.md` — 설계 문서(A/B/C 방식 비교 전문)
- `docs/superpowers/plans/2026-07-13-single-item-ownership-validation.md` — 구현 계획
