---
title: 주석 삭제 기준은 "문서에 있는가"가 아니라 "고치는 순간 그 문서를 찾아보는가"다
date: 2026-08-17
category: conventions
module: project-wide
problem_type: convention
component: development_workflow
severity: medium
applies_when:
  - 프로젝트 전반의 주석을 정리하며 "코드를 반복하는 주석"을 걷어낼 때
  - 삭제하려는 주석과 같은 주제가 CLAUDE.md·.claude/rules/·docs/에도 적혀 있는 것을 확인했을 때
  - 리뷰에서 "이건 문서에 있으니 주석은 지워도 된다"는 근거로 삭제를 승인하려 할 때
tags:
  - comments
  - documentation
  - code-review
  - refactoring
  - knowledge-locality
---

# 주석 삭제 기준은 "문서에 있는가"가 아니라 "고치는 순간 그 문서를 찾아보는가"다

## Context

2026-08-17 프로젝트 전반 주석 정리(PR #51, `3ea756d`)에서 16개 파일 88줄을 삭제했다. 삭제 대상은 대부분 코드를 그대로 한글로 반복하는 주석(`// 파일 업로드 핸들러`, `// 필터 옵션을 메모이제이션`)이었고 이 판단은 정확했다.

문제는 **"왜"를 담은 주석 중 같은 주제가 문서에도 적혀 있던 것들**이었다. "문서에 있으니 중복"이라는 기준으로 삭제했는데, 전수 대조해보니 그 기준이 네 가지 서로 다른 상황을 하나로 뭉개고 있었다. 3건을 1줄로 복원했다.

## Guidance

주석과 문서에 같은 주제가 있을 때, **문서에 언급이 있는지**가 아니라 **그 코드를 고치는 사람이 그 순간 그 문서를 펼쳐볼 것인지**로 판단한다. 아래 네 가지를 구분한다.

### 1. 삭제해도 되는 경우 — 전용 solutions 문서가 색인돼 있다

TanStack Query `enabled` 게이팅에서 `isLoading` 대신 `isPending`을 써야 하는 이유를 4줄 주석으로 3개 파일(`MallLinkedProductEditLayout`·`ShoppingAccountModifyLayout`·`ShoppingSettingModifyLayout`)에 동일 복제해두고 있었다.

`docs/solutions/ui-bugs/disabled-query-isloading-false-shows-not-found.md`가 `module:`에 세 모듈을 전부 명시하고 `symptoms:`에 "찾을 수 없습니다가 잠깐 떴다가 정상 화면으로 바뀐다"까지 적어둔 전용 문서였다. **증상으로 검색될 문서가 있으면 코드 주석은 지워도 된다.** 삭제 유지.

### 2. 삭제하면 안 되는 경우 — 문서에 단어는 있지만 담긴 정보가 다르다

`RangeDateFilter`의 `setResetKey((prev) => prev + 1)`는 근거가 없으면 의미 없는 state 증가로 보인다. 지우면 기간 버튼을 눌러도 달력 표시가 안 따라오는데 **컴파일 에러도 테스트 실패도 없다.**

`.claude/rules/ui-conventions.md`에 `resetKey`가 언급돼 있어 중복으로 판단했으나, 실제로 적힌 내용은 *"비자명한 트릭이 7벌 복제돼 있었다 → 2026-08-06 공용화 완료"*라는 **공용화 이력**이었다. 동작 원리(`RangeDatePicker`가 init 날짜를 내부 state로 복사해두고 `resetKey` 변화를 재동기화 신호로 쓴다)는 그 주석이 코드베이스의 유일한 기록이었다.

**같은 단어가 나온다고 같은 정보가 아니다.** 문서를 열어 그 문장이 실제로 무엇을 말하는지 읽고 판단한다.

### 3. 삭제하면 안 되는 경우 — 문서가 코드 주석에 근거를 남기라고 요구한다

`ResendMallLinkedProductsResult`와 `CreateMallLinkedProductsResult`는 필드가 완전히 같다. 분리 근거 주석을 지우자 근거 없이 동일한 인터페이스 두 개만 남아, 다음 사람이 합치는 게 자연스러운 상태가 됐다.

`.claude/rules/domain-design.md`가 **이 두 타입을 실명으로 지목**하며 이렇게 적어뒀다:

> `CreateMallLinkedProductsResult`와 `ResendMallLinkedProductsResult`가 그 예로, 분리 유지가 맞다 — 이런 판단은 **타입 주석에 근거를 남긴다.**

즉 문서가 코드 주석을 **대체**하는 게 아니라 코드 주석을 **요구**하고 있었다. 이 경우 주석 삭제는 규칙 위반이다.

### 4. 삭제하면 안 되는 경우 — 문서 종류가 상시 참조용이 아니다

`productExcelSaveStrategy`의 `modelName: r['모델명'] ? String(r['모델명']) : undefined`에서 `String()`을 고정하는 이유는 `docs/superpowers/specs/2026-08-14-product-common-fields-design.md:182`에 적혀 있다. 하지만 **스펙·플랜은 특정 라운드의 산출물**이라, 몇 달 뒤 엑셀 매퍼를 고치는 사람이 펼쳐볼 문서가 아니다. `docs/solutions/`처럼 주제로 검색되는 상시 참조 문서와 성격이 다르다.

(이 건은 위험 경로도 정확히 짚어야 했다 — `String()`을 그냥 지우면 타입 에러로 막히지만, `as string`으로 바꾸면 컴파일은 통과하고 런타임에 숫자가 들어가 모델번호 `007`이 `7`이 된다. 복원 주석에는 그 경로를 명시했다.)

## Why This Matters

- 이번에 복원한 3건은 전부 **컴파일 에러도 테스트 실패도 없이 조용히 깨지는** 종류다. 주석이 유일한 방어선이었다.
- 반대로 모든 "왜" 주석을 보존하면 정리가 성립하지 않는다 — 실제로 `isPending` 4줄 × 3파일처럼 문서로 대체 가능한 중복도 있었다. 기준은 "무조건 보존"이 아니라 **참조 지점(locality)** 이다.
- 정리 작업은 diff가 삭제 일색이라 리뷰에서 "주석이니까 안전하다"고 넘어가기 쉽다. 삭제된 주석 하나하나에 대해 "이 정보가 없으면 다음 사람이 무엇을 잘못할 수 있는가"를 물어야 한다.

## When to Apply

- 주석 정리·리팩터링에서 "왜"를 담은 주석을 지우려 할 때마다
- 특히 `.claude/rules/`나 `docs/`에서 같은 키워드를 찾았다는 이유로 삭제를 정당화하려 할 때 — 그 문서를 실제로 열어 문장을 읽고 위 4가지 중 어디인지 분류한다
- 복원할 때는 원문 전체가 아니라 **결론 1줄**이면 충분하다. 이번 3건 모두 1줄로 복원했다

## Related

- `[[disabled-query-isloading-false-shows-not-found]]` — 삭제가 타당했던 1번 사례의 그 문서
- `[[typescript-type-design-patterns]]` — 구조가 같은 타입을 합칠지 판단하는 기준(3번 사례의 배경)
- `[[full-codebase-audit-before-type-refactor]]` — 전수 대조 없이 일괄 변경했을 때 놓치는 것들
