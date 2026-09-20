---
title: 응답에 나가면 안 되는 컬럼이 있으면 공개 컬럼 객체 하나를 유일 통로로 둔다
date: 2026-09-20
category: architecture-patterns
module: features/shoppingAccount/util/accountColumns.ts, app/api/shopping/accounts
problem_type: architecture_pattern
component: data_access
severity: high
applies_when:
  - 테이블에 브라우저로 내보내면 안 되는 컬럼이 있을 때(비밀번호·API key·내부 플래그)
  - 같은 테이블을 읽는 route가 둘 이상일 때
  - drizzle의 `db.select()`나 `.returning()`을 인자 없이 쓰는 코드가 있을 때
symptoms:
  - 읽기 타입에서 필드를 지웠는데도 응답 JSON에 그 값이 들어 있다
  - route를 새로 붙였더니 그 경로에서만 비밀이 샌다
  - 타입 체커가 통과시키는데 실제 응답에는 컬럼이 더 있다
tags:
  - drizzle
  - secret-handling
  - data-access
  - api-design
---

# 응답에 나가면 안 되는 컬럼이 있으면 공개 컬럼 객체 하나를 유일 통로로 둔다

## Context

`shopping_accounts`는 `password`·`apiKey`를 평문으로 갖고 있고, 둘 다 **어떤 응답에도
실리면 안 된다.** 키는 등록할 때 한 번 들어가고, 이후 외부몰 연동에서 서버가 DB에서 직접
읽어 쓴다 — 브라우저로 내보낼 이유가 없다.

첫 방어는 타입이다. 읽기 타입에서 두 필드를 지우고, 쓰기 타입에만 남긴다.

```ts
export interface ShoppingAccount { id: string; mallCode: ShoppingMalls; /* password·apiKey 없음 */ }
export type CreateShoppingAccountBody = Omit<ShoppingAccount, 'id' | 'ownerId' | ...> & {
  password: string; apiKey: string;
};
```

**이것만으로는 새지 않는다는 보장이 없다.** `db.select()`를 인자 없이 쓰면 drizzle은 전체
컬럼을 돌려주고, `NextResponse.json(row)`는 그것을 그대로 내보낸다. 타입이 `ShoppingAccount`로
선언돼 있어도 **런타임 객체에는 컬럼이 더 들어 있다** — 타입 체커는 여분의 프로퍼티를
문제 삼지 않는다.

## Guidance

**select 목록을 한 객체에 모으고, 읽기 경로가 전부 그것만 쓴다.**

```ts
// src/features/shoppingAccount/util/accountColumns.ts
/**
 * 읽기 경로가 쓰는 유일한 select 목록. password·apiKey가 없다.
 *
 * db.select()는 전체 컬럼을 돌려주므로, 읽기 route 셋과 INSERT/UPDATE의 .returning() 중
 * 한 곳이라도 이것을 안 쓰면 키가 새어 나간다. 새 읽기 경로를 붙일 때 이 객체를 먼저 확인할 것.
 */
export const SHOPPING_ACCOUNT_PUBLIC_COLUMNS = { id: shoppingAccounts.id, /* ... */ };
```

**`.returning()`도 읽기 경로다.** 생성·수정이 만든 행을 그대로 돌려주므로 여기 빠뜨리면
등록 직후 응답에 키가 실린다. 실수하기 쉬운 자리다 — `select`만 떠올리기 때문이다.

예외를 둘 때는 **더 좁은 쪽으로만** 둔다. 이 프로젝트의 `by-mall`은 `id`·`mallCode`·`mallId`
셋만 직접 고른다(옵션 Select를 채우는 용도라 그 이상이 필요 없다). 공개 컬럼 객체보다
넓은 예외는 두지 않는다.

### 검증은 "맨손 호출 0건"으로 한다

리뷰에서 물을 것은 "비밀이 새는가"가 아니라 **"인자 없는 `db.select()`·`.returning()`이
있는가"**다. 후자는 기계적으로 셀 수 있고, 0이면 전자가 따라온다. 2026-09-20 이 브랜치의
7개 엔드포인트를 이 기준으로 전수 확인했다.

## Why

타입에서 지우는 것은 **우리가 그 필드를 읽지 않겠다**는 선언이지, **서버가 그 값을 보내지
않겠다**는 보장이 아니다. 둘을 같은 것으로 여기면 route를 하나 추가하는 순간 무너진다 —
새 route의 작성자는 타입만 보고 안전하다고 판단한다.

객체 하나로 모으면 **집행 지점이 한 곳**이 되고, 그 파일의 주석이 다음 작성자에게 규칙을
전달한다. 분산된 규칙은 문서에 적어도 지켜지지 않는다.

## 관련

- `drizzle-query-error-leaks-params-to-logs.md` — 같은 값이 응답이 아니라 **로그**로 새는 경로
- `api-route-session-auth-guard.md` — 같은 route들의 소유권 판정
