---
title: 트랜잭션이 없는 드라이버에서 대량 처리는 "전부 아니면 전무"를 약속하지 않는다
date: 2026-09-20
category: architecture-patterns
module: app/api/shopping/accounts/delete, app/api/shopping/accounts/status, db
problem_type: architecture_pattern
component: api_design
severity: medium
applies_when:
  - 여러 건을 한 번에 삭제·수정하는 API를 설계할 때
  - 요청에 남의 리소스나 이미 사라진 id가 섞일 수 있을 때
  - drizzle의 neon-http 드라이버를 쓸 때(`db.transaction()`이 없다)
  - 기존 코드가 "하나라도 어긋나면 403 전체 거부"로 돼 있을 때
symptoms:
  - 목록을 띄워둔 채 다른 곳에서 지워진 건 때문에 정상 건까지 통째로 실패한다
  - 5건을 골랐는데 4건만 처리되고 화면은 그냥 성공으로 보인다
  - 사전 조회로 막아도 조회와 실행 사이에 끼어든 요청 때문에 결국 부분 처리가 된다
tags:
  - drizzle
  - neon
  - bulk-operation
  - api-design
  - transaction
---

# 트랜잭션이 없는 드라이버에서 대량 처리는 "전부 아니면 전무"를 약속하지 않는다

## Context

쇼핑몰계정의 대량 삭제·사용여부 변경을 설계하면서 세 안이 차례로 나왔다.

| 안 | 내용 | 판정 |
|---|---|---|
| A. 조용히 제외 | WHERE에 ownerId를 넣어 자기 것만 처리, 200 + count | 기각 — 5건을 골랐는데 4건만 돼도 화면이 성공으로 보인다 |
| B. 403 전체 거부 | 사전 조회 후 개수가 다르면 아무것도 안 함 | 기각 — 아래 |
| C. 건별 결과 | 정상 건은 처리하고 실패는 사유와 함께 돌려줌 | **채택** |

**B가 이 저장소의 기존 관행이었다.** 대량 처리 9곳(MSW 8 + 실제 route `account/users` DELETE 1)이
전부 403 전체 거부였다. 일관성만 보면 B가 맞다.

그런데 **B는 약속을 지킬 수 없다.**

```
node_modules/drizzle-orm/neon-http/session.js
  async transaction(_transaction, _config = {}) {
    throw new Error("No transactions support in neon-http driver");
  }
```

"하나라도 어긋나면 아무것도 처리하지 않는다"를 보장하려면 `세기 → 판정 → 지우기`가 한
트랜잭션이어야 한다. 쿼리 2회로 흉내내면 그 사이에 다른 요청이 끼는 순간 **결국 부분
처리**가 된다. 검사 쿼리만 늘고 보장은 못 한다.

## Guidance

**드라이버가 원자성을 못 주면, 원자성을 전제한 응답 계약을 쓰지 않는다.** 부분 성공을
약속 자체로 만든다.

```ts
type BulkAccountResult = {
  successCount: number;
  failures: { id: string; message: string }[];
};
```

```
POST /accounts/delete  { ids: ['sa_1','sa_2','sa_3','sa_4','없는것'] }
→ 200 { successCount: 4, failures: [{ id: '없는것', message: '존재하지 않는 계정입니다.' }] }
```

구현은 사전 조회 없이 **WHERE에 소유자 조건을 넣고 `.returning()`으로 실제 처리된 id를
받아, 요청 id와의 차집합을 실패로 돌린다.** 쿼리 1회면 된다.

**실패 문구는 하나로 통일한다.** 남의 계정이든 없는 계정이든 `'존재하지 않는 계정입니다.'`.
구분해 답하면 남의 id를 탐색하는 도구가 된다. 그리고 이 동일성은 **보안 요건**이므로 두
route가 같은 상수를 import하게 만든다 — 각자 정의하면 한쪽만 바뀌어도 컴파일러가 잡아주지
않는다.

알림은 결과를 그대로 반영한다(엑셀 저장의 `formatExcelFailureSummary`와 같은 방침 — 첫
사유 + 나머지 건수).

| 결과 | 알림 |
|---|---|
| 전부 성공 | `success` — "5건이 삭제되었습니다." |
| 일부 실패 | `warning` — "4건이 삭제되었습니다. 존재하지 않는 계정입니다. (외 1건 오류)" |
| 전부 실패 | `error` |

## Why

세 안의 차이는 취향이 아니라 **무엇을 약속하느냐**다.

- A는 실패를 숨긴다 — 사용자가 "왜 4건이지"를 추측해야 한다.
- B는 지킬 수 없는 것을 약속한다 — 게다가 이 워크스페이스는 슈퍼계정과 종속 유저가 같은
  목록을 동시에 보므로, 한 명이 방금 지운 건 때문에 다른 사람의 정상 5건이 통째로 막히는
  상황이 **드물지 않다.**
- C는 드라이버 제약과 모순이 없고, 사용자의 의도("이것들이 없는 상태")에 가장 가깝다.

**선례가 이미 있었다.** 엑셀 저장이 같은 모양이다 — `ExcelSaveResult { savedCount, failures }`.
"일부 성공은 오류가 아니라 정상 결과"가 그 경로의 전제다. 즉 이 프로젝트에는 대량 처리에
대해 **서로 다른 두 관행**이 있었고, 트랜잭션 제약이 어느 쪽이 맞는지를 판정해 줬다.

기존 9곳을 이 모양으로 바꾸는 것은 별도 작업이다. 다만 **새 대량 API는 C를 따른다.**

> **2026-09-25 현황:** 9곳 중 MSW 8곳은 도메인을 DB로 옮기면서 사라졌다(쇼핑몰계정·정보설정의 삭제·상태변경은 C 모양 `{ successCount, failures }`으로 새로 만들어졌다). 전부-아니면-전무(403) 방식으로 남은 곳은 사용자 삭제 `DELETE /api/account/users` **1곳**이다.

## 관련

- `.claude/rules/excel.md` — `ExcelSaveResult` 부분 성공 모양(선례)
- `docs/superpowers/specs/2026-09-20-shopping-account-db-migration-design.md` — 세 안의 기각 기록
