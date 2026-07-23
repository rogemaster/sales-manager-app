---
title: 편집 직후 뜨는 IDE 진단(diagnostics)은 tsc --noEmit로 먼저 재검증한다
date: 2026-07-16
category: conventions
module: project-wide
problem_type: convention
component: development_workflow
severity: low
applies_when:
  - 서브에이전트나 자기 자신이 파일을 수정한 직후 시스템이 IDE 진단(타입 에러/미사용 변수 등)을 보고할 때
  - 여러 파일을 순서대로 수정하는 도중(예: 함수 시그니처를 바꾸는 파일과 그 호출부 파일을 각각 수정) 진단이 뜰 때
tags:
  - ide
  - typescript
  - tsc
  - false-positive
  - verification
  - subagent-driven-development
---

# 편집 직후 뜨는 IDE 진단(diagnostics)은 tsc --noEmit로 먼저 재검증한다

## Context

ownerId fail-closed 통일 작업(9개 Task, subagent-driven-development)을 진행하는 동안, 서브에이전트가 파일 수정을 마쳤다고 보고한 직후 IDE 진단 시스템이 "인자 개수 불일치", "미사용 변수", "타입 오버로드 불일치" 같은 에러를 반복적으로 띄웠다. 총 5회 발생(Task 6 profile 관련, Task 7·8의 훅 파일 2건씩, Task 9의 collection 핸들러, 최종 리뷰 fix pass). 매번 다음 순서로 확인했다:

1. 해당 파일을 직접 Read로 다시 읽어 현재 내용 확인
2. `npx tsc --noEmit -p tsconfig.json`을 새로 실행

5번 모두 파일 내용은 이미 올바르게 수정돼 있었고, `tsc --noEmit`도 0 errors(빈 출력)였다 — 즉 전부 **가짜 경고(stale diagnostic)**였다.

## Guidance

**IDE/에디터의 진단 시스템(language server)은 여러 파일이 근접한 시점에 수정될 때 갱신이 한 박자 늦게 따라온다.** 특히 다음 패턴에서 자주 발생했다:

- 함수 시그니처를 바꾸는 파일(예: `deleteShoppingAccounts.ts`에 `ownerId` 파라미터 추가)과 그 호출부 파일(`useDeleteShoppingAccounts.ts`)을 서브에이전트가 순서대로 수정할 때, 언어 서버가 아직 이전 시그니처를 캐시하고 있어서 "인자 개수 불일치"를 잘못 보고한다.
- 서브에이전트가 마지막 파일 저장을 마친 직후, 진단이 그 저장 이벤트를 아직 반영하지 못한 상태에서 스냅샷을 찍는다.

**IDE 진단이 뜨면 다음을 반드시 거친다 — 진단 메시지만 보고 "버그가 있다"고 판단하지 않는다:**

1. 진단이 가리키는 파일을 Read 도구로 직접 읽어 실제 현재 내용을 확인한다.
2. `npx tsc --noEmit -p tsconfig.json`(또는 프로젝트의 동등한 타입체크 커맨드)을 새로 실행해 exit code와 출력을 확인한다.
3. 두 확인 모두 문제 없으면 스테일 진단으로 간주하고 계속 진행한다. 리뷰어(서브에이전트)에게도 "이 진단은 스테일일 가능성이 있으니 네가 직접 재검증하라"고 명시적으로 알려서, 리뷰가 컨트롤러의 주장만 믿고 넘어가지 않게 한다.

## Why This Matters

- 진단을 그대로 믿고 "고쳐야 한다"고 판단하면, 이미 올바른 코드를 불필요하게 다시 건드리거나(회귀 위험), 존재하지 않는 버그를 좇느라 시간을 쓰게 된다.
- 반대로 모든 진단을 무조건 스테일로 치부하면 실제 회귀를 놓친다 — 그래서 "무시"가 아니라 "직접 재검증"이 핵심이다. `tsc --noEmit`처럼 파일을 새로 파싱하는 권위 있는 도구 실행 + 실제 파일 내용 확인, 이 두 가지를 항상 거친다.
- 서브에이전트 리뷰 단계에서도 동일하게 적용된다 — 컨트롤러가 "스테일이었다"고 노트에 적어 리뷰어에게 넘기더라도, 리뷰어는 그 주장을 그대로 믿지 말고 스스로 `tsc --noEmit`을 재실행해 확인해야 한다("Do Not Trust the Report" 원칙과 동일한 이유).

## When to Apply

- 파일 수정 직후 IDE/에디터 진단(diagnostics) 시스템 알림이 뜰 때마다
- 특히 subagent-driven-development처럼 여러 파일을 짧은 간격으로 연쇄 수정하는 워크플로우에서

## Related

- `[[api-route-session-auth-guard]]` — 이 패턴이 반복 관찰된 작업
- `[[typescript-type-design-patterns]]` — ShoppingSetting discriminated union 전환 작업(Pattern 7~9)에서도 동일한 stale diagnostic이 반복 관찰됨(매번 `tsc --noEmit` 재검증으로 확인, 전부 가짜였음)
