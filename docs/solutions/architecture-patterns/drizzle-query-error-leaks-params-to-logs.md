---
title: 평문 비밀을 저장하는 테이블의 쓰기 route는 catch에서 error를 통째로 찍으면 안 된다
date: 2026-09-20
category: architecture-patterns
module: app/api/shopping/accounts, drizzle-orm
problem_type: architecture_pattern
component: error_handling
severity: high
applies_when:
  - 복호화가 필요해 해시할 수 없는 값(외부 서비스 로그인 정보·API key)을 평문 컬럼에 저장할 때
  - drizzle로 INSERT/UPDATE하는 route의 catch에서 `console.error('...', error)`를 쓸 때
  - "응답에 안 실으면 안전하다"고 판단하고 로그 경로를 따로 보지 않았을 때
symptoms:
  - 응답에는 비밀 필드가 없는데 서버 로그에 평문이 찍힌다
  - 쿼리 실패 로그에 `params: ...`로 컬럼 값이 통째로 남는다
  - 코드 어디에도 비밀을 로그에 넣는 문장이 없어 grep으로 찾히지 않는다
tags:
  - drizzle
  - logging
  - secret-handling
  - error-handling
  - neon
---

# 평문 비밀을 저장하는 테이블의 쓰기 route는 catch에서 error를 통째로 찍으면 안 된다

## Context

쇼핑몰계정(`shopping_accounts`)은 `password`·`apiKey`를 **평문으로** 저장한다. 외부몰
로그인·연동에 원래 값이 필요해 해시할 수 없기 때문이다(설계에서 수용한 비용).

대신 "브라우저로는 절대 안 나간다"를 지키는 장치를 촘촘히 뒀다 — 읽기 타입에서 두 필드를
지우고, 모든 읽기 경로가 공개 컬럼 객체 하나만 쓰게 하고, `.returning()`에도 그것을 넘겼다.
7개 엔드포인트를 전수 확인해 맨손 `db.select()`가 0건임을 검증했다.

**그런데 응답이 아닌 경로로 새고 있었다.** drizzle-orm 0.45.2는 모든 쿼리 실패를
`DrizzleQueryError`로 감싸고, 그 `message`에 SQL과 **바인딩 파라미터를 그대로 넣는다.**

```js
// node_modules/drizzle-orm/errors.cjs
super(`Failed query: ${query}\nparams: ${params}`)
```

따라서 아래 한 줄이 평문 패스워드와 API key를 로그에 찍는다.

```ts
} catch (error) {
  console.error('쇼핑몰 계정 등록 중 에러:', error);   // params: ...,naver456!,naver-sim-9b0c...
```

**이 코드에는 비밀을 로그에 넣는 문장이 없다.** `error`를 찍었을 뿐이고, 값을 담은 것은
라이브러리다. 그래서 "비밀 필드가 어디로 나가는가"를 grep으로 훑는 방식으로는 찾히지 않는다.

## Guidance

**평문 비밀이 파라미터로 들어가는 쿼리의 catch에서는 `error` 객체를 그대로 찍지 않는다.**
원인만 남긴다.

```ts
} catch (error) {
  // DrizzleQueryError.message는 SQL params(평문 password·apiKey)를 포함한다. cause만 남긴다.
  console.error('쇼핑몰 계정 등록 중 에러:', error instanceof Error ? (error.cause ?? error.name) : error);
  return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
}
```

적용 범위는 **비밀을 파라미터로 보내는 쿼리**가 있는 route다. 같은 테이블이라도 읽기
route(`SELECT`)는 파라미터가 id·필터값뿐이라 해당하지 않는다 — 전부 덮으면 디버깅만
어려워진다.

### 해시하는 테이블은 이 문제가 없다

이 저장소의 다른 쓰기 route(`api/register`, `api/account/users/create`)는 `hashPassword()`를
거친 해시를 파라미터로 넣는다. 그래서 같은 `console.error(..., error)`를 써도 로그에 남는
것은 해시다. **평문을 저장하기로 한 테이블에서만 새로 생기는 문제**이므로, 기존 route를
보고 "여기도 그렇게 하니 괜찮다"고 판단하면 틀린다.

### 남은 경로 — `error.cause`의 Postgres `DETAIL`

`cause`는 드라이버 원본 오류이고, Postgres는 NOT NULL 위반 등에서 `DETAIL`에
`Failing row contains (...)`로 **행 전체 값**을 넣는다(`@neondatabase/serverless`가 `.detail`로
노출). 지금은 쓰기 검증이 NOT NULL 텍스트 컬럼을 전부 막고 생략된 키는 SQL 층에서 기본값
`''`이 되어 도달 경로가 없지만, **이 테이블에 NOT NULL 컬럼을 추가하면서 쓰기 검증을 함께
갱신하지 않으면 열린다.**

## Why

응답 누출은 타입과 컬럼 화이트리스트로 막을 수 있다 — 타입 체커와 리뷰어가 본다. 로그
누출은 **라이브러리가 만든 문자열을 우리가 그대로 출력하는 형태**라 두 장치 모두 지나간다.
2026-09-20 최종 전체 브랜치 리뷰가 `node_modules`를 직접 읽어 찾아냈고, Task별 리뷰
여섯 번은 전부 놓쳤다.

판단 기준: **"이 값이 응답에 실리는가"와 "이 값이 로그에 실리는가"는 다른 질문이다.**
평문 비밀을 다루기로 했다면 두 번째 질문을 따로 물어야 한다.

## 관련

- `public-column-projection-as-single-leak-gate.md` — 같은 테이블의 응답 누출을 막는 장치
- `docs/superpowers/specs/2026-09-20-shopping-account-db-migration-design.md` — 평문 저장을 수용한 근거
