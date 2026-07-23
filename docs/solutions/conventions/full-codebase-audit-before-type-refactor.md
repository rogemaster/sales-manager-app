---
title: "타입 재정의"처럼 간단해 보이는 작업도 전체 재조사가 필요한 이유
date: 2026-07-12
category: conventions
module: project-wide
problem_type: convention
component: frontend_stimulus
severity: medium
applies_when:
  - 기존 타입/상수/필드를 정리하거나 리네이밍하는 작업을 시작할 때
  - 특정 키워드(타입 이름 등) 하나로 좁게 grep해서 작업 범위를 확정하려 할 때
  - "이건 그냥 이름만 바꾸는 거라 간단하다"고 판단한 리팩토링을 시작할 때
tags:
  - refactor
  - scope-creep
  - code-audit
  - subagent
  - type-cleanup
  - brainstorming
---

# "타입 재정의"처럼 간단해 보이는 작업도 전체 재조사가 필요한 이유

## Context

`ShoppingMalls` 관련 타입을 정리하는 작업은 처음엔 "`ShoppingMallType`의 미사용 `isActive` 필드 하나 지우면 되는" 수준으로 시작됐다. 그런데 관련 파일을 전수 조사하는 과정에서 범위가 계속 늘어났다:

1. 1차 조사(`ShoppingMalls`/`SHOPPING_MALLS` 사용처 grep) → 레거시 `MallAccount` 타입 발견
2. 사용자가 "범위가 더 늘어날 것 같으니 프로젝트 전체를 다시 조사해달라"고 요청 → 읽기 전용 탐색 서브에이전트로 6개 카테고리(중복 하드코딩, 삭제 예정 파일의 숨은 참조, 이름-의미 불일치 필드, ownerId 없는 엔티티, 놓친 타입, mock 데이터 정합성)를 광범위 조사
3. 그 결과 `MallAccountEntry`(세 번째 유사 타입), `mallAccountId`가 실제로는 `mallId`였던 문제(order/collect뿐 아니라 order/list에도 동일하게 존재), 테이블 헤더 명명 불일치(`shopId`), 그리고 범위 밖으로 명시적으로 미룬 `Order`/`CollectionJob`의 `ownerId` 테넌트 격리 공백까지 추가로 드러났다.

최종적으로 "타입 하나 정리"가 4개 Task, 27개 파일(20 수정/7 삭제/4 신규) 규모의 작업이 됐다.

## Guidance

**"간단한 이름 변경/타입 정리"로 보이는 작업일수록, 시작 전에 좁은 grep 대신 넓은 재조사를 한 번 거친다.**

1. **첫 번째 grep은 항상 범위를 과소평가한다.** 타입 이름 하나로 찾은 사용처만 보고 범위를 확정하지 않는다 — 그 타입과 "개념적으로 같은" 다른 이름의 타입/상수가 별도 위치에 있을 수 있다(레거시, 중복, 파생 등).
2. **"이 필드가 실제로 어떤 값을 담고 있는가"까지 추적한다.** 타입 정의만 보지 말고 mock 데이터의 실제 값, 그 값을 사용하는 UI 컴포넌트까지 대조한다 — 이름과 실제 의미가 어긋난 필드는 이름 검색만으로는 드러나지 않는다.
3. **범위가 의심되면 읽기 전용 탐색 서브에이전트를 병행한다.** 컨트롤러가 직접 파고들면 컨텍스트가 커지고, 좁은 방향으로만 파게 되기 쉽다. 서브에이전트에게 "이런 패턴이 더 있는지" 여러 카테고리를 나눠 병렬로 확인시키면 놓친 부분이 드러난다(이번 경우 6개 카테고리: 중복 하드코딩 / 삭제 예정 파일의 숨은 참조 / 이름-의미 불일치 필드 / ownerId 없는 엔티티 / 놓친 타입·파일 / mock 데이터 정합성).
4. **넓은 조사에서 나온 항목을 전부 이번 라운드에 넣지 않는다.** 범위가 커졌다고 전부 처리하려 하면 원래 작업이 무한정 커진다. 발견된 것 중 "이름 정리" 수준을 넘어서는 것(예: `ownerId` 테넌트 격리처럼 여러 엔드포인트에 새 인증 스코프를 배선해야 하는 작업)은 별도 라운드로 명시적으로 미루고 메모리/문서에 근거와 함께 기록한다.

## Why This Matters

- 좁은 grep만으로 범위를 확정하면, 리팩토링 도중이나 완료 후에 "이것도 같이 고쳤어야 했는데" 하는 상황이 반복돼서 결국 여러 번에 걸쳐 같은 파일을 다시 건드리게 된다.
- 이름-의미 불일치(`mallAccountId`가 실제로는 `mallId`) 같은 문제는 컴파일 에러도, 런타임 에러도 내지 않는다 — 우연히 정상 동작하기 때문에 좁은 검색으로는 절대 드러나지 않고, 오직 "실제 값 추적" 방식으로만 발견된다.
- 범위를 무제한으로 넓히는 것도 위험하다 — 이번에도 `ownerId` 테넌트 격리 공백을 발견했지만, 그걸 이번 라운드에 포함시켰다면 원래 "타입 재정의" 작업의 배 이상으로 커졌을 것이다. **발견과 처리를 분리**하는 것이 핵심이다.

## When to Apply

- 기존 타입/상수를 정리·리네이밍하는 작업을 브레인스토밍할 때, 1차 조사 후 바로 설계로 넘어가지 말고 "더 넓게 봐야 할 것 같다"는 감이 들면(또는 사용자가 그렇게 요청하면) 재조사 라운드를 한 번 더 넣는다.
- 재조사에서 나온 항목은 즉시 전부 처리하지 말고, 사용자와 함께 "이번 범위 vs 다음 라운드"를 명시적으로 나눈다.

## Examples

이번 작업에서 실제로 늘어난 범위:
- `docs/solutions/architecture-patterns/legacy-duplicate-entity-mallaccount-vs-shoppingaccount.md` — 1차 조사에서 발견
- `docs/solutions/logic-errors/mallaccountid-field-actually-stores-mallid.md` — 서브에이전트 재조사에서 발견, order/collect뿐 아니라 order/list에도 동일 패턴 존재 확인
- `project_order_ownerid_gap` 메모리 — 재조사에서 발견했지만 별도 라운드로 명시적으로 이월

## Related

- `[[legacy-duplicate-entity-mallaccount-vs-shoppingaccount]]`
- `[[mallaccountid-field-actually-stores-mallid]]`
- `docs/superpowers/specs/2026-07-12-shopping-malls-type-redefinition-design.md` — "범위 내 / 범위 외"를 명시적으로 나눈 설계 문서
