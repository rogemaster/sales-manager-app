# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules 파일

작업 유형에 따라 시작 전 해당 파일을 먼저 읽어라.

| 작업 유형 | 읽을 파일 |
|----------|----------|
| 기능 개발 전체 과정 | `.claude/rules/workflow.md` |
| UI 컴포넌트·화면 구현 | `.claude/rules/ui-conventions.md` |
| API 추가(route handler·MSW 핸들러) | `.claude/rules/msw-rules.md` |
| 도메인 설계·신규 엔티티·미구현 페이지 작업 | `.claude/rules/domain-design.md` |
| Excel 기능 구현·수정·전략 추가 | `.claude/rules/excel.md` |
| 커밋·PR, 새 문서의 저장 위치 결정 | `.claude/rules/git.md` |

### CLAUDE.md 관리 원칙

CLAUDE.md는 항상 로드되므로 간결하게 유지한다. 새 규칙을 CLAUDE.md에 추가할 때 Claude가 분량을 판단하여 사용자에게 먼저 의견을 제시한다.

- **1~3줄:** CLAUDE.md에 직접 추가 (별도 의견 없이 진행)
- **그 이상:** 추가 전 "`.claude/rules/*.md`로 분리하는 게 좋겠습니다"라고 사용자에게 먼저 제안한다. 기존 rules 파일에 맞는 주제면 해당 파일에, 새 주제면 새 파일을 생성한다.

### 대화 중 문서화 원칙

대화 중 중요한 결정·규칙·워크플로우가 확정되면 Claude가 먼저 문서화를 제안한다. 사용자가 명시적으로 요청하지 않아도 "이 내용을 CLAUDE.md 또는 rules 파일에 추가해 두는 게 좋겠습니다"라고 선제적으로 제안한다. 문서화되지 않은 중요 결정은 다음 대화에서 맥락을 잃는다.

### 미착수·후속 항목은 출처를 함께 적는다

향후 작업 목록(스펙의 "다음 라운드로 넘기는 오픈 이슈", 메모리의 미착수 목록 등)에 항목을 적을 때는 **사용자가 요청한 것인지 Claude의 추정인지 반드시 구분해 표기한다.** 사용자 요구면 원문 표현을 함께 남기고, 추정이면 "(Claude 추정 — 미확인)"으로 명시한다. 추정 항목은 다음 라운드 착수 전 사용자에게 실재 여부를 먼저 확인한다.

- **Why:** Claude가 "범위 밖"으로 적은 항목이 스펙 → 메모리로 옮겨지는 사이 "1순위 작업"으로 승격된 전례가 있다(2026-08-11 전수 검토에서 3건 삭제).
- 사용자가 실제로 미뤄둔 항목은 **원문과 함께 그 의미도 적는다.** 단어만 옮기면 다음 라운드에서 해석할 수 없다(`giftBrandId`·"상품타입"이 신규 필드가 아니었던 사례, 2026-08-14).

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run Vitest once
npm run test:watch  # Run Vitest in watch mode
```

Vitest는 `vitest.config.ts`에 `include`를 두지 않아 전 경로의 `*.test.ts`를 실행한다. 테스트는 순수 로직(`src/shared/utils/`, `src/features/*/util/`, `src/lib/`, `src/simulators/`, `src/mocks/utils/`, Excel 전략)에 붙이고, **UI 컴포넌트와 API fetch 래퍼는 관례상 테스트 파일을 만들지 않는다.** 예외로 route의 **권한 거부 계약**(부족한 등급은 업무 데이터에 닿기 전에 403)은 `src/app/api/routePermissions.test.ts`가 표로 검사한다 — `requirePermission`을 단 route를 추가하면 이 표에도 넣는다.

## Architecture Overview

**Next.js 15 App Router** with feature-driven module organization. Authentication is handled by NextAuth.js (JWT strategy, Credentials provider). API는 `src/app/api/` route handler + Neon(Drizzle)이 처리하고, 아직 DB로 옮기지 않은 주문 영역(주문·수집·홈 주문 통계)만 MSW 브라우저 worker가 mock한다 (`MSWProvider`는 `(authenticated)` 레이아웃 안에만 있다).

### Route Groups

- `(auth)/` — Public pages: login, register
- `(authenticated)/` — Protected pages: home, profile, account(사용자관리), products, shopping(계정·정보설정·등록·연동상품), order
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

API functions in `features/[feature]/api/` call Next.js route handlers in `src/app/api/`. Pattern:

```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
throwIfUnauthorized(response); // 401 → UnauthorizedError → QueryClient가 signOut (src/shared/utils/unauthorized.ts)
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
- **시각 컬럼과 날짜 범위 필터:** 신규 테이블의 시각 컬럼은 `timestamp({ withTimezone: true })`를 쓴다. 날짜 범위 필터는 `src/shared/utils/date.ts`의 `toKstDateRange()`로 **KST 반개구간**(`>= start`, `< end + 1일`)을 만들어 비교한다. `lte(endDate)`로 비교하면 끝날짜 당일에 등록된 건이 통째로 누락되고, UTC 기준으로 자르면 KST 자정~오전 9시 등록 건이 하루 밀린다. `users` 테이블이 `text` `'YYYY-MM-DD'`인 것은 하위호환으로 유지하는 것이며 **선례로 삼지 않는다.** 서버에서 시각을 `'YYYY-MM-DD'`로 잘라 내려줄 때는 `toKstYmd()`를 쓴다 — Vercel은 UTC라 `dayjs(date).format()`은 KST 자정~오전 9시 건을 전날로 표시한다.
- **스키마 반영은 `npx drizzle-kit push`다(마이그레이션 파일 없음).** push는 식 유니크 인덱스(`products_owner_customer_code_unique`·`naver_products_seller_name_unique`)를 매번 DROP/CREATE해 그 사이 중복 차단이 사라지므로, 사용 중인 DB에는 돌리지 않는다. 마이그레이션 파일(`generate`+`migrate`) 전환은 주문 DB화 결정 때 함께 정한다(2026-09-25 보류).

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
- **커밋 범위:** `CLAUDE.md`·`.claude/rules/`는 전부, `docs/`는 `docs/solutions/architecture-patterns/`만 커밋한다(`scripts/`·나머지 `docs/`는 로컬 전용). 판단 기준·`.gitignore` 실측 방법은 [`.claude/rules/git.md`](.claude/rules/git.md).
- **`gh` CLI가 이 환경에 설치되어 있지 않다.** PR 생성은 GitHub 웹에서 직접 진행하거나, 사용자에게 URL을 안내하는 것으로 마무리할 것.
- **소프트웨어 설치 절대 금지:** `winget`, `npm install -g`, `choco` 등 시스템에 영구적인 변경을 주는 명령은 사용자가 명시적으로 요청한 경우에만 실행할 것. 도구가 없다고 해서 자동으로 설치를 시도하지 말 것.
- push 후 GitHub가 출력하는 PR 생성 URL을 사용자에게 안내하면 충분하다:
  ```
  https://github.com/rogemaster/sales-manager-app/pull/new/<브랜치명>
  ```
