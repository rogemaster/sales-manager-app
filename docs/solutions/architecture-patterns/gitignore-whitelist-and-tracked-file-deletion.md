---
title: .gitignore로 문서 공개 범위를 좁힐 때 — 화이트리스트여야 하는 이유와, 이미 추적 중인 파일은 지켜주지 못한다는 것
date: 2026-09-04
category: architecture-patterns
module: repo-config
problem_type: architecture_pattern
component: git
severity: high
applies_when:
  - 이미 커밋된 파일 일부만 남기고 나머지를 git 추적에서 빼려 할 때
  - 디렉토리 하위 중 특정 하나만 커밋하도록 .gitignore를 작성할 때
  - docs/ 등 문서 공개 범위를 좁히면서 로컬 파일은 유지하려 할 때
symptoms:
  - .gitignore에 제외 규칙을 넣었는데 파일이 계속 추적된다
  - "!"로 예외를 지정했는데 해당 파일이 되살아나지 않는다
  - 브랜치를 병합하거나 전환했더니 로컬에만 두려던 파일이 디스크에서 사라졌다
  - 나중에 만든 새 디렉토리가 의도치 않게 커밋됐다
tags:
  - gitignore
  - git-rm-cached
  - negation-pattern
  - fail-closed
  - documentation-scope
---

# .gitignore로 문서 공개 범위를 좁힐 때

2026-09-04, `docs/`에 쌓인 117개 문서 중 `docs/solutions/architecture-patterns/`만 공개하고 나머지 83개는 로컬 보관으로 돌렸다(PR #61). 그 과정에서 `.gitignore`에 대해 코드만 봐서는 드러나지 않는 두 가지가 나왔다.

## 배경

2026-07-23 커밋 `cb0ac97`로 `docs/` 전체를 취업용 포트폴리오 자료로 공개했으나, 117개 중 56개가 specs·plans였다. 이건 특정 작업의 진행 기록이라 제3자가 읽을 동기가 없다. 재사용 가능한 설계 결론만 남기는 쪽이 신호 대 잡음 면에서 낫다고 판단해 범위를 좁혔다.

판단 기준은 **"재사용 가능한 설계 결론이냐, 특정 작업의 진행 기록이냐"**이고, 이것이 카테고리 디렉토리에 그대로 대응된다. 즉 **카테고리 선택이 곧 커밋 여부 결정**이다.

---

## 1. 부모 디렉토리를 닫으면 `!`로 되살릴 수 없다

git에는 이런 규칙이 있다.

> 부모 디렉토리가 제외되면, 그 안의 파일은 `!`로도 다시 포함할 수 없다.

git이 성능상 제외된 디렉토리를 **아예 열어보지 않기** 때문이다. 안에 뭐가 있는지 모르니 예외 처리도 못 한다.

```gitignore
# ❌ 작동하지 않는다
/docs/                                   # docs 디렉토리 자체를 닫아버림
!/docs/solutions/architecture-patterns/  # 무시됨 — git이 docs 안을 안 봄
```

`/docs/*`처럼 **`*`를 붙여 "안의 항목들"을 제외**하면 디렉토리 자체는 열려 있어, 한 단계씩 내려가며 예외를 되살릴 수 있다. 그래서 계단식 4줄이 된다.

```gitignore
# ✅ 실제 적용한 형태
/docs/*                                  # ① docs 바로 아래 전부 제외
!/docs/solutions/                        # ② 단, solutions 디렉토리는 예외
/docs/solutions/*                        # ③ solutions 바로 아래 전부 제외
!/docs/solutions/architecture-patterns/  # ④ 단, architecture-patterns는 예외
```

위에서 아래로 읽고 **나중 규칙이 앞 규칙을 덮는다.** 순서를 바꾸면 깨진다.

어느 규칙이 걸렸는지는 `git check-ignore -v <경로>`가 줄 번호까지 알려준다. 규칙 문구를 눈으로 읽고 추측하지 말 것.

---

## 2. 화이트리스트로 써야 한다 — 블랙리스트는 fail-open

같은 결과를 내는 방식이 둘 있다.

```gitignore
# A. 화이트리스트 — 전부 막고 하나만 열기 (위 4줄)

# B. 블랙리스트 — 제외할 것만 나열
/docs/superpowers/
/docs/research/
/docs/solutions/conventions/
/docs/solutions/logic-errors/
/docs/solutions/ui-bugs/
/docs/solutions/integration-issues/
```

B가 읽기 쉽다. 부정도 없고 계단식 함정도 없다. **작성 시점에는 두 방식의 결과가 완전히 같다.**

갈리는 건 **나중에 새 디렉토리가 생겼을 때**다. `/ce-compound`가 `docs/solutions/performance/`라는 새 카테고리를 만들면:

| 방식 | 새 디렉토리 | 성격 |
|------|------------|------|
| A. 화이트리스트 | 자동으로 **제외** | fail-closed |
| B. 블랙리스트 | 자동으로 **커밋** | fail-open ⚠️ |

B였다면 새 카테고리가 아무 신호 없이 공개된다. 그 순간 **"카테고리가 곧 커밋 여부를 결정한다"는 규칙이 거짓말이 된다** — 규칙은 "이것만 공개"라고 말하는데 동작은 "나열한 것만 비공개"이기 때문이다.

**의도가 화이트리스트면 규칙도 화이트리스트여야 의도와 동작이 일치한다.** 4줄을 6줄로 "단순화"하고 싶어지면 이 문서를 볼 것.

> 참고: B에서 새는 건 형제를 나열한 층뿐이다. `docs/superpowers/notes/`는 `/docs/superpowers/`가 하위 전체를 덮어서 새지 않는다. 누수는 `docs/solutions/`처럼 **일부만 나열한 층**에서 생긴다.

---

## 3. `.gitignore`는 이미 추적 중인 파일을 지켜주지 못한다

여기가 실제로 당한 지점이다.

`.gitignore`는 **untracked 파일에만 적용되는 규칙**이다. 그래서:

- **추적 중인 파일을 빼려면** `git rm --cached`로 인덱스에서 먼저 제거해야 한다. `.gitignore`에 넣기만 해서는 아무 일도 일어나지 않는다.
- 더 중요한 건 그 다음이다. **`.gitignore`에 넣어도, 다른 커밋에서 그 파일이 추적 중이면 체크아웃·병합 시 작업 트리에서 삭제된다.**

git은 "이전 커밋에서 추적되던 파일이 새 커밋에 없으면 작업 트리에서도 지운다"고 동작한다. 병합 대상 브랜치(`main`)가 아직 그 83개를 추적하고 있었으므로, 병합 시점에 전부 삭제 대상이 됐다.

```
브랜치에서 커밋·푸시        → 로컬 파일 유지 ✅
main에 병합하고 pull        → 83개가 디스크에서 삭제 ❌
```

`.gitignore`가 막아줄 거라 기대하기 쉬운데, 이 파일들은 병합 직전까지 **ignored가 아니라 tracked**였다. ignore 규칙이 개입할 자리가 없다.

### 대응

병합 전에 레포 바깥으로 복사해 두는 게 가장 확실하다.

```bash
cp -r docs ~/docs-backup-YYYY-MM-DD
```

백업을 놓쳤어도 히스토리에 남아 있으므로 복구된다. 기준점은 **변경 전 커밋**이다.

```bash
git restore --source=<변경-전-커밋> --worktree -- docs/solutions/conventions/ ...
```

`--worktree`만 지정하면 **작업 트리에만** 복원하고 인덱스는 건드리지 않는다. 복원된 파일은 이제 `.gitignore`에 걸려 untracked·ignored 상태로 남으므로 `git status`가 깨끗하게 유지된다.

### 복구 시 경로를 좁혀서 지정할 것

이번에 `docs/` 전체를 지정해 복원했다가 **추적 중인 `architecture-patterns/` 파일까지 변경 전 상태로 되돌렸다.** 링크 정리가 취소되고, 이동시킨 문서가 옛 위치로 돌아가 중복이 생겼다. 되돌린 자리를 다시 세 번 손봐야 했다.

복원 대상은 **제외한 경로만** 지정한다. 그리고 복원 뒤에는 백업본과 `diff -r`로 대조해 확인한다 — `git status`가 깨끗한 것만으로는 부족하다. 위 실수에서 `git status`는 깨끗했지만 로컬 보관 문서 2건의 내부 경로가 옛 값으로 되돌아가 있었고, `diff -r`이 그걸 잡아냈다.

---

## 4. 남기는 문서가 제외 대상을 마크다운 링크로 가리키면 404가 난다

공개되는 `architecture-patterns/` 문서들이 specs·plans를 참조하고 있었다. 마크다운 링크(`[텍스트](../../superpowers/...)`)로 된 9곳은 GitHub에서 **404**가 난다.

백틱 텍스트(`` `docs/superpowers/specs/xxx.md` ``)로 강등하면 로컬에서는 파일이 그대로 있어 참조가 유효하고, 외부에서는 내부 참조 표기로 읽힌다. 링크가 아니므로 깨지지 않는다.

`superseded_by` 안내처럼 **"현행은 저기 있다"고 독자를 보내는 문장**은 강등만으로 부족하다. 이번에는 공개되는 `.claude/rules/domain-design.md`의 해당 절을 가리키도록 대상 자체를 바꿨다.

---

## 이 조치가 하지 않는 것

**히스토리와 머지된 PR에는 그대로 남는다.** 현재 트리에서만 사라진다.

목적이 **큐레이션**(굳이 보여줄 필요가 없다)이면 이걸로 충분하다. 목적이 **노출 차단**이면 이 방법은 애초에 맞지 않는다 — `git filter-repo`로 히스토리를 재작성해도 GitHub의 PR 페이지는 diff를 따로 보관하므로 여전히 남고, 커밋 SHA가 전부 바뀌어 포트폴리오용 커밋 이력이 어긋난다. 그 경우 실제 선택지는 레포를 private으로 돌리는 것뿐이다.

**어느 쪽이 목적인지 먼저 확정하고 방법을 고른다.** 이번 라운드는 처음에 "노출이 부담"으로 출발해 히스토리 재작성까지 검토했다가, 목적이 큐레이션으로 정리되면서 그 검토가 통째로 불필요해졌다.

## 관련

- `.claude/rules/git.md` — 커밋 범위와 판단 기준 (2026-09-25 `CLAUDE.md` Git/PR 규칙에서 분리)
- `.claude/rules/workflow.md` PHASE 4 — 카테고리 선택이 곧 커밋 여부 결정
