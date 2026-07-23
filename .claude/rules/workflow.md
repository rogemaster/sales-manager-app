# 개발 워크플로우

기능 개발 시 아래 5단계를 순서대로 진행한다.

## PHASE 1. BRAINSTORMING (/brainstorming)

스킬 호출 즉시 TaskCreate로 9개 단계를 생성하고 순서대로 완료한다.

| Task | 내용 |
|------|------|
| 1 | 프로젝트 컨텍스트 탐색 (파일, 문서, 최근 커밋) |
| 2 | 비주얼 컴패니언 제안 (레이아웃·다이어그램 질문 시 just-in-time) |
| 3 | 요구사항 파악 (1회 1개 질문) |
| 4 | 2~3가지 접근법 제안 + 추천 |
| 5 | 설계 섹션별 제시 → 사용자 승인 |
| 6 | 설계 문서 작성 (`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`) — 커밋은 하지 않는다 (CLAUDE.md Git/PR 규칙 참조) |
| 7 | 스펙 자체 검토 (placeholder·모순·모호성 인라인 수정) |
| 8 | 사용자 스펙 리뷰 게이트 (승인 대기, 변경 요청 시 Task 6으로 복귀) |
| 9 | writing-plans 스킬 호출 |

**HARD-GATE:** 설계 승인 전 코드 작성 금지. writing-plans 호출 전 구현 전환 금지.

## PHASE 2. WRITING PLANS

구현 계획을 `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`에 작성한다.

각 Task 구조:
- 생성/수정할 파일 목록 (정확한 경로)
- Interfaces (입력/출력 타입)
- `[ ]` 실패 테스트 작성 (코드 포함)
- `[ ]` 실패 확인 (명령어 + 예상 출력)
- `[ ]` 최소 구현 (코드 포함)
- `[ ]` 통과 확인 (명령어 + 예상 출력)
- `[ ]` 커밋 — **계획 문서상의 안내일 뿐, 실행 시 자동 실행하지 않는다.** 사용자가 명시적으로 요청한 경우에만 실제 git 명령을 실행한다 (CLAUDE.md Git/PR 규칙 참조)

계획 완료 후 실행 방식을 사용자에게 선택받는다:
- **서브에이전트 방식** (recommended): Task별 서브에이전트 디스패치 + 리뷰
- **인라인 방식**: executing-plans 스킬로 순차 실행

## PHASE 3. 구현 (Task 반복)

각 Task마다 TDD 사이클을 반복한다:

```
🔴 RED      실패 테스트 작성 → 실패 확인
🟢 GREEN    최소 구현 → 통과 확인
🔵 REFACTOR 정리 → 전체 통과 확인
```

**커밋은 자동 실행하지 않는다.** git add/commit을 포함한 모든 git 작업은 CLAUDE.md의 Git/PR 규칙을 따르며, 사용자가 그 시점에 명시적으로 요청한 경우에만 실행한다. subagent-driven-development 등 워크플로우 스킬의 기본 템플릿이 "Task 완료 후 커밋"을 표준 스텝으로 포함하고 있어도, 서브에이전트 디스패치 프롬프트에 git commit 지시를 넣지 않는다 — 이 규칙이 스킬 기본 템플릿보다 우선한다.

**`subagent-driven-development` 실행 전 확인할 것:** 실행 전 반드시 사용자에게 (1) 브랜치 준비 방식(새 브랜치 생성 여부), (2) Task별 로컬 커밋 허용 여부를 먼저 확인한다. 이 프로젝트에서는 보통 **Task마다 커밋 없이 진행하고, 모든 Task + 최종 리뷰가 끝난 뒤 Task 단위로 분리된 커밋을 제안**하는 방식을 선호해왔다. 이 경우:
- Task 리뷰는 커밋 범위(BASE..HEAD) 대신, 해당 Task가 건드린 파일로 스코프를 좁힌 working-tree diff로 대체한다.
- 최종 완료 시점에 Task 단위 커밋으로 분리할 때, 최종 리뷰의 fix pass가 여러 Task와 겹치는 파일을 다시 건드리는 경우가 있다 — 이때는 파일을 이전 Task 시점 상태로 정확히 되돌렸다 복원하는 정교한 방식 대신, **해당 파일의 최종 diff 전체를 가장 그럴듯한 커밋(대개 fix pass 커밋) 하나에 통째로 배정**하는 단순한 방식도 충분하다. 완벽한 1:1 대응보다 "합리적으로 설명 가능한 분리"면 된다.

Task 완료 후 `requesting-code-review` 스킬로 코드 리뷰:
- **Critical** → 즉시 수정 후 다음 Task
- **Important** → 다음 Task 전 수정
- **Minor** → 추후 처리

## PHASE 4. 지식 문서화 (/ce-compound)

**코드 리뷰 완료 후, 브랜치 마무리 전**에 실행한다.

비자명한 결정·버그·설계 패턴을 `docs/solutions/<category>/<filename>.md`에 문서화한다.
단순 작업이거나 코드만으로 맥락이 충분하면 생략 가능.

## PHASE 5. 브랜치 마무리

`finishing-a-development-branch` 스킬로 완료 처리한다:
1. 전체 테스트 통과 확인
2. 실행 방식 선택: 로컬 merge / Push + PR / 브랜치 유지 / 작업 폐기
