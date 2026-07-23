# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules 파일

작업 유형에 따라 시작 전 해당 파일을 먼저 읽어라.

| 작업 유형 | 읽을 파일 |
|----------|----------|
| 기능 개발 전체 과정 | `.claude/rules/workflow.md` |
| UI 컴포넌트·화면 구현 | `.claude/rules/ui-conventions.md` |
| MSW 핸들러·API 추가 | `.claude/rules/msw-rules.md` |
| 도메인 설계·신규 엔티티·미구현 페이지 작업 | `.claude/rules/domain-design.md` |
| Excel 기능 구현·수정·전략 추가 | `.claude/rules/excel.md` |

### CLAUDE.md 관리 원칙

CLAUDE.md는 항상 로드되므로 간결하게 유지한다. 새 규칙을 CLAUDE.md에 추가할 때 Claude가 분량을 판단하여 사용자에게 먼저 의견을 제시한다.

- **1~3줄:** CLAUDE.md에 직접 추가 (별도 의견 없이 진행)
- **그 이상:** 추가 전 "`.claude/rules/*.md`로 분리하는 게 좋겠습니다"라고 사용자에게 먼저 제안한다. 기존 rules 파일에 맞는 주제면 해당 파일에, 새 주제면 새 파일을 생성한다.

### 대화 중 문서화 원칙

대화 중 중요한 결정·규칙·워크플로우가 확정되면 Claude가 먼저 문서화를 제안한다. 사용자가 명시적으로 요청하지 않아도 "이 내용을 CLAUDE.md 또는 rules 파일에 추가해 두는 게 좋겠습니다"라고 선제적으로 제안한다. 문서화되지 않은 중요 결정은 다음 대화에서 맥락을 잃는다.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run Vitest once
npm run test:watch  # Run Vitest in watch mode
```

Vitest is configured but test coverage is scoped to `src/mocks/utils/` (pure business logic, e.g. `getShoppingSettings.test.ts`) — UI components and API fetch wrapper functions don't have test files by convention. MSW (Mock Service Worker) handles API mocking in development automatically via `src/mocks/`.

## Architecture Overview

**Next.js 15 App Router** with feature-driven module organization. Authentication is handled by NextAuth.js (JWT strategy, Credentials provider). API calls in development are intercepted by MSW.

### Route Groups

- `(auth)/` — Public pages: login, register
- `(authenticated)/` — Protected pages: home, products/list, products/create, products/bulk, products/[id], order/list
- `src/middleware.ts` enforces auth: unauthenticated users redirect to `/login`

### State Management (3 layers)

1. **Jotai atoms** (`features/[feature]/store/`) — UI state: search filters, pagination, user profile fields
2. **TanStack Query** — server state, data fetching, cache invalidation on mutations
3. **React Hook Form + Zod** — form state with schema validation

### Feature Module Structure

Each domain lives in `src/features/[feature]/` with subfolders:
- `api/` — fetch functions (called by React Query hooks)
- `store/` — Jotai atoms
- `types/` — TypeScript interfaces
- `ui/` — React components for this feature
- `util/` — Feature-specific utilities
- `constant/` — Feature-specific constants

### API Layer

API functions in `features/[feature]/api/` call Next.js route handlers in `src/app/api/`. In development, MSW intercepts these at the route handler level. Pattern:

```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
  method: 'POST',
  body: JSON.stringify(data),
});
if (!response.ok) throw new Error('에러 메시지');
return response.json();
```

### Shared Components

- `src/components/ui/` — Radix UI primitives wrapped with Tailwind (shadcn/ui style)
- `src/components/layout/` — `globalHeader`, `globalSidebar`
- `src/components/common/` — Composite shared components (TablePagination, alert)
- `src/components/providers/` — `SessionProvider`, `MSWProvider`, `ExcelProvider`

### Styling

Tailwind CSS 4 with `cn()` (`clsx` + `tailwind-merge`) for conditional classes. CVA (class-variance-authority) for component variants. Path alias `@/*` maps to `src/*`.

### Excel

Strategy pattern in `src/components/excel/strategies/`. ExcelJS for generation, XLSX for parsing. Template download and bulk upload flows handled via `ExcelProvider`.

### Documented Solutions

`docs/solutions/` — 과거 버그·베스트 프랙티스·설계 패턴 문서 모음. 카테고리별 디렉토리 + YAML frontmatter(`module`, `tags`, `problem_type`)로 검색 가능. 관련 기능 구현·디버깅 시 참고.

## 스타일 수정 규칙

UI 스타일 작업 시 **폰트 크기와 폰트 색상은 절대 변경하지 않는다.** 사용자가 별도로 요청한 경우에만 수정한다.

## Key Conventions

- **Atoms naming:** `[name]Atom` — e.g., `searchValueAtom`, `currentPageAtom`
- **API functions:** verb-first — `getProducts`, `createProduct`, `updateProduct`
- **Components:** PascalCase files; `'use client'` only where needed (forms, hooks, interactive UI)
- **Prettier:** `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`
- **TypeScript:** strict mode; interface-based domain models; Zod schemas co-located with forms
- **연락처 필드:** 연락처(휴대폰) 필드를 추가할 때는 inline regex를 쓰지 않고 `src/shared/utils/phone.ts`에서 import한다.
  - `phoneSchemaRequired(emptyMsg?, formatMsg?)` — 필수 Zod 스키마
  - `formatPhone(value)` — 자동 하이픈 포맷터 (010-XXXX-XXXX)
  - `PHONE_REGEX` — 직접 regex가 필요한 경우
- **몰(mallCode)별 고유 필드 컴포넌트 분리 기준:** 몰 고유 필드 컴포넌트가 3개 이상이 되면 Excel 전략 패턴처럼 디렉토리로 분리한다. 자세한 내용은 [`.claude/rules/domain-design.md`](.claude/rules/domain-design.md) 참고.

## Claude Code 서브에이전트 (Agent)

대규모 파일 탐색이나 복합 분석이 필요할 때 서브에이전트를 실행한다. **실행 전 반드시 목적을 설명하고 승인을 받을 것.**

| 타입 | 용도 | 파일 수정 |
|------|------|----------|
| `Explore` | 파일 읽기/검색 전용 탐색 | 없음 (안전) |
| `Plan` | 구현 계획 설계 | 없음 |
| `general-purpose` | 복합 작업 | 가능 |

예시 설명: *"주문 기능 관련 파일 전체를 파악하기 위해 읽기 전용 탐색 에이전트를 실행하겠습니다."*

## Git / PR 규칙

- **작업 중 git 명령 절대 금지:** `git add`, `git commit`, `git push`, 브랜치 생성 등 모든 git 작업은 사용자가 명시적으로 요청할 때만 실행한다. 코드 작성·파일 저장 후 자동으로 commit하지 않는다. 모든 작업이 완료된 후 사용자가 직접 검토하고 git 작업을 진행한다.
- **이 규칙은 서브에이전트/스킬 위임 시에도 동일하게 적용된다.** `workflow.md`의 TDD 사이클이나 `subagent-driven-development` 등 워크플로우 스킬의 기본 템플릿이 "Task 완료 후 커밋"을 표준 스텝으로 포함하고 있어도, 서브에이전트 디스패치 프롬프트에 git commit 지시를 넣지 않는다. 커밋이 필요해 보이는 시점마다 매번 사용자에게 먼저 확인한다 — 과거 이 규칙을 스킬 기본 템플릿을 그대로 따르다 어긴 전례가 반복됐다.
- **작업은 항상 새 브랜치에서 진행:** `main`에 직접 커밋하지 않는다. git 작업 요청 시 현재 브랜치를 먼저 확인하고, `main`이면 사용자에게 안내하여 `feat/<작업명>` 브랜치를 먼저 생성한 뒤 진행한다.
- **git add/commit 전 반드시 `.gitignore`를 확인한다.** `CLAUDE.md`, `.claude/` 등은 `.gitignore`에 등록되어 있어 커밋 대상이 아니다. ignore된 파일은 스테이징에서 제외하고, 커밋 가능한 파일만 처리한다.
- **`docs/solutions/` 문서는 git 커밋 대상이 아니다.** 로컬에만 유지하며, 다른 파일과 함께 커밋할 때도 스테이징에서 제외한다 (`docs/superpowers/specs/`, `docs/superpowers/plans/` 등 다른 문서의 커밋 여부는 각 워크플로우 규칙을 따로 따른다).
- **`gh` CLI가 이 환경에 설치되어 있지 않다.** PR 생성은 GitHub 웹에서 직접 진행하거나, 사용자에게 URL을 안내하는 것으로 마무리할 것.
- **소프트웨어 설치 절대 금지:** `winget`, `npm install -g`, `choco` 등 시스템에 영구적인 변경을 주는 명령은 사용자가 명시적으로 요청한 경우에만 실행할 것. 도구가 없다고 해서 자동으로 설치를 시도하지 말 것.
- push 후 GitHub가 출력하는 PR 생성 URL을 사용자에게 안내하면 충분하다:
  ```
  https://github.com/rogemaster/sales-manager-app/pull/new/<브랜치명>
  ```
