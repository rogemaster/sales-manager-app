# 커밋 범위 — 무엇이 git에 들어가는가

git 작업 자체의 규칙(작업 중 git 금지, 새 브랜치, 설치 금지)은 `CLAUDE.md`의 "Git / PR 규칙"에 있다. 이 파일은 커밋할 때와 새 문서를 어디에 쓸지 정할 때 필요한 **범위** 규칙이다.

## AI 협업 문서 중 커밋 대상은 일부다 (2026-09-04 범위 축소)

`CLAUDE.md`와 `.claude/rules/`는 전부 커밋한다. `docs/` 아래는 **`docs/solutions/architecture-patterns/`만** 커밋하고, `docs/superpowers/`(specs·plans), `docs/research/`, 나머지 `docs/solutions/` 카테고리(`conventions`·`logic-errors`·`ui-bugs`·`integration-issues`)는 `.gitignore`로 제외해 로컬에만 보관한다.

- **판단 기준:** 재사용 가능한 **설계 결론**은 커밋하고, 특정 작업의 **진행 기록**은 커밋하지 않는다. 새 문서를 어디에 쓸지 정할 때 이 기준으로 디렉토리를 고른다 — 디렉토리가 곧 커밋 여부를 결정한다.
- **Why:** 2026-07-23 `cb0ac97`로 `docs/` 전체를 취업용 포트폴리오 자료로 공개했으나, 2026-09-04 시점에 117개 중 56개가 specs·plans여서 제3자가 읽을 동기가 없는 진행 기록이 대부분을 차지했다. 정제된 설계 패턴만 남기는 쪽이 신호 대 잡음 면에서 낫다고 판단해 범위를 좁혔다.
- **이미 공개된 것은 되돌아가지 않는다.** 제외 처리는 현재 트리에만 적용되며, `cb0ac97` 이후 커밋의 히스토리와 머지된 PR 페이지에는 그대로 남아 있다. 이 조치의 목적은 노출 차단이 아니라 **큐레이션**이므로 히스토리 재작성은 하지 않기로 했다 — "완전히 지워달라"는 요청이 아닌 한 `filter-repo`·force push를 제안하지 말 것.
- `docs/solutions/architecture-patterns/`의 문서가 제외 대상 문서를 참조할 때는 **마크다운 링크를 쓰지 않는다**(GitHub에서 404가 난다). 백틱 텍스트로만 경로를 적으면 로컬에서는 그대로 유효하고 외부에서는 내부 참조 표기로 읽힌다. `scripts/`도 같다.

## `.gitignore`가 무시하는 것 — 커밋 전 실측한다

프로젝트 고유 항목은 `.claude/settings.json`, `.claude/settings.local.json`, `/.superpowers/`, `.gstack/`, `/scripts/`(시드·데이터 이전 스크립트, 로컬 전용), 그리고 위 `docs/` 제외 규칙이다. `.env*`도 무시된다.

커밋 전 확신이 안 서면 규칙 문구가 아니라 `git ls-tree -r --name-only HEAD -- <경로>` 또는 `git check-ignore -v <경로>`로 실측할 것 — [`gitignore-whitelist-and-tracked-file-deletion.md`](../../docs/solutions/architecture-patterns/gitignore-whitelist-and-tracked-file-deletion.md)
