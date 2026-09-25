# Sales Manager App

여러 외부 쇼핑몰에서 각각 관리해야 하는 **관리 포인트(상품 · 주문 · 클레임 등)를 한 곳에서 일괄 처리**하는 판매자용 웹 애플리케이션입니다.
판매자가 몰마다 따로 들어가 하던 일을 여기서 한 번에 합니다 — 상품을 한 번 등록해 여러 몰로 전송하고, 흩어진 주문을 수집해 통합 조회합니다.

| 영역 | 방향 | 내용 |
|------|------|------|
| 상품 | **내보내기** | 오리진 상품 + 쇼핑몰 정보설정을 결합해 각 몰로 전송, 이후 수정·재전송 |
| 주문 · 클레임 | **가져오기** | 각 몰의 주문을 수집해 통합 목록으로 조회·처리 |

**[라이브 데모 →](https://sales-manager-app-nine.vercel.app/)** | 공개 테스트 계정: `admin@example.com` / `admin123@`

> - 샘플 데이터는 이 공개 계정에만 들어 있습니다. 데모에서 새로 가입한 계정은 빈 상태로 시작합니다.
> - 방문자 누구나 쓰는 계정이라 등록·수정한 내용이 다른 방문자에게도 보입니다. 민감한 정보는 입력하지 마세요.
> - 업로드한 이미지는 25일 후 자동 삭제됩니다.
> - 테스트 계정의 데이터는 언제든 초기화될 수 있습니다.

<br />

## 주요 기능

| 기능 | 설명 |
|------|------|
| 인증 | 이메일/비밀번호 로그인, 사업자 정보를 포함한 회원가입 |
| 홈 대시보드 | 기간(7·15·30일)별 상품·쇼핑몰 연동·주문·클레임 현황 통계, 최근 등록 상품 |
| 상품 | 목록(복합 필터·썸네일), 등록/수정(옵션 조합·상품정보고시), 메인이미지 R2 업로드 |
| 상품 대량 등록 | 엑셀 양식 다운로드 → 업로드 → 미리보기(행별 오류 표시) → 저장. 외부 이미지 주소는 R2로 가져와 저장 |
| 주문 | 쇼핑몰별 주문 수집, 통합 목록·일괄 상태변경, 상세(클레임·코멘트·수정이력) |
| 쇼핑몰 계정 · 정보설정 | 몰별 API 연동 계정 관리, 몰별 판매 정보와 네이버·카카오 고유 항목 설정 |
| 쇼핑몰 상품등록 · 연동상품 | 상품과 대상 몰을 골라 일괄 전송, 연동 건별 실패 사유 확인·수정·재전송 |
| 사용자 관리 | 슈퍼계정 아래 서브 사용자 등록·승인·삭제, 등급별 권한 |

<br />

## 기술 스택

| 분류 | 기술 | 선택 이유 |
|------|------|-----------|
| 프레임워크 | Next.js 15 (App Router) | 파일 기반 라우팅, 서버·클라이언트 컴포넌트 렌더링 전략 분리 |
| 언어 | TypeScript 5 (strict) | 도메인 모델을 타입으로 명확히 정의해 런타임 오류 사전 차단 |
| 스타일 | Tailwind CSS 4 + Radix UI | 유틸리티 클래스와 접근성이 보장된 헤드리스 컴포넌트 조합 |
| 클라이언트 상태 | Jotai | atom 단위 최소 구독으로 불필요한 리렌더링 방지 |
| 서버 상태 | TanStack Query 5 | 캐싱·자동 동기화·뮤테이션 후 무효화를 선언적으로 처리 |
| 폼 · 검증 | React Hook Form + Zod | 비제어 컴포넌트 기반 렌더링 최소화, 스키마 기반 유효성 검사 |
| 인증 | NextAuth.js | Credentials Provider + JWT 전략으로 커스텀 인증 구현 |
| DB | Neon (PostgreSQL) + Drizzle ORM | 유저·상품·쇼핑몰 연동 영속성 보장, 서버리스 환경에 맞는 serverless driver |
| 파일 저장소 | Cloudflare R2 | 상품 메인이미지 저장. S3 호환 API, egress 무료 |
| API Mocking | MSW 2 | 아직 DB로 옮기지 않은 주문 영역(주문·수집·홈 주문 통계)만 서비스 워커에서 mock |
| 엑셀 | ExcelJS + XLSX | 양식 생성(ExcelJS)과 업로드 파싱(XLSX) 역할 분리 |
| 테스트 | Vitest | 순수 비즈니스 로직 단위 테스트 (UI·fetch 래퍼 제외) |

<br />

## 설계 포인트

**공통 정보는 오리진에 모으고, 몰 고유값만 분리한다.** <br />
상품의 공통 정보는 오리진 상품(`Product`)에, 외부 쇼핑몰 고유값은 쇼핑몰 정보설정(`ShoppingSetting`)에 두고 전송 시점에 결합합니다. <br />
전송 결과인 연동 데이터는 그 시점 값을 스냅샷으로 복사한 독립 엔티티라, 오리진을 고쳐도 이미 연동된 건은 바뀌지 않습니다. <br />
→ [`snapshot-entity-source-link-break-is-by-design.md`](docs/solutions/architecture-patterns/snapshot-entity-source-link-break-is-by-design.md), <br />
→ [`product-vs-shoppingsetting-compliance-field-boundary.md`](docs/solutions/architecture-patterns/product-vs-shoppingsetting-compliance-field-boundary.md)

**`ownerId` 기반 멀티 테넌시.** <br />
가입한 계정이 최상위 테넌트(슈퍼계정)이고, 사용자 관리에서 만든 계정은 그 아래에 종속됩니다. <br />
모든 리소스는 `ownerId`로 격리되며, DB로 옮긴 API는 클라이언트가 보낸 값을 믿지 않고 세션에서 꺼낸 값으로 조회합니다. <br />
→ [`user-hierarchy-ownerid-pattern.md`](docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md), <br />
→ [`api-route-session-auth-guard.md`](docs/solutions/architecture-patterns/api-route-session-auth-guard.md)

**MSW와 실제 DB의 경계.** <br />
개발 초기에는 모든 API를 MSW로 데이터는 mock data로 처리 했습니다. <br />
서버에서 실행돼야 하는 인증부터 시작해, 서버 전용 시크릿(DB 접속·R2 자격증명)이 필요한 유저·상품·쇼핑몰 연동 API를 차례로 실제 route handler + Neon으로 옮겼습니다. <br />
지금 MSW에 남은 것은 주문 영역뿐이며, MSW는 로그인한 화면 안에서 브라우저 서비스 워커로만 동작합니다. <br />
→ [`auth-db-msw-boundary.md`](docs/solutions/architecture-patterns/auth-db-msw-boundary.md)

**몰별 설정은 discriminated union으로.** <br />
네이버·카카오처럼 몰마다 다른 설정 필드를 `mallCode` 기준 union 타입으로 표현합니다. 폼은 느슨한 flat 타입으로 다루고 제출 시점에만 도메인 타입으로 좁힙니다. <br />
→ [`typescript-type-design-patterns.md`](docs/solutions/architecture-patterns/typescript-type-design-patterns.md)

**외부 이미지 가져오기의 SSRF 방어.** <br />
엑셀에 적힌 외부 이미지 주소를 서버가 받아와 R2에 저장합니다. <br />
서버가 내부망을 대신 요청하지 않도록 주소는 연결 시점에 검사하고, 리다이렉트는 단계마다 다시 검사합니다. <br />
→ [`server-side-remote-fetch-ssrf-connect-time-validation.md`](docs/solutions/architecture-patterns/server-side-remote-fetch-ssrf-connect-time-validation.md)

**포트폴리오 규모 전제.** <br />
인프라는 Vercel Hobby · Neon · R2 로 구성되었습니다. <br />
→ [`.claude/rules/domain-design.md`](.claude/rules/domain-design.md)

그 밖의 설계 결정과 트레이드오프는 [`docs/solutions/architecture-patterns/`](docs/solutions/architecture-patterns/)에 정리돼 있습니다.

<br />

## 로컬 실행

```bash
npm install
npm run dev   # 주문 영역 MSW는 로그인 후 화면에서 자동 활성화
```

프로젝트 루트에 `.env.local`을 만듭니다.

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL=your-neon-database-url

# Cloudflare R2 — 서버 전용 자격증명
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name

# R2 버킷의 공개 읽기 주소 — 이미지 표시용, 브라우저에 공개되는 값
NEXT_PUBLIC_R2_PUBLIC_URL=your-r2-dev-url
```

새 Neon 데이터베이스에 스키마를 반영합니다(마이그레이션 파일 없이 `push`로 직접 반영).

```bash
npx drizzle-kit push
```

`/register`에서 가입한 뒤 사용합니다. **새 환경에는 샘플 데이터가 없어 목록이 비어 있습니다** — 상품·쇼핑몰 계정·정보설정은 직접 등록해 채울 수 있고(상품은 엑셀 대량등록도 가능), 주문 MSW mock 데이터는 데모 계정 소유라 새 계정에는 보이지 않습니다. 데이터가 채워진 화면은 라이브 데모에서 확인할 수 있습니다.

<br />

## 스크립트

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npm test             # 단위 테스트
npm run test:watch   # 테스트 감시 모드
```

<br />

## 프로젝트 구조

```
src/
├── app/               # App Router — (auth)·(authenticated) 페이지, api/ route handlers
├── features/          # 도메인별 모듈 (api · store · types · ui · util · constant · hook · server)
├── components/        # 공용 UI(ui · common · layout), 엑셀 업로드/다운로드, providers
├── shared/            # 도메인 간 공유 상수 · 유틸
├── hooks/             # 공용 훅 (알림, 주소 검색 등)
├── constant/          # 사이드바 메뉴 등 앱 전역 상수
├── utils/             # 코드 · 번호 생성기
├── lib/               # R2 저장소 · 원격 이미지 가져오기(서버 전용), cn() 등 헬퍼
├── db/                # Drizzle 클라이언트와 스키마
├── mocks/             # MSW 핸들러 · mock 데이터 (주문 영역)
├── simulators/        # 외부몰(네이버) API 시뮬레이터 — api/external/naver route가 사용
├── types/             # 공통 타입
└── middleware.ts      # 인증 라우트 보호
```
