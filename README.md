# Sales Manager App

쇼핑몰 판매자를 위한 **상품 · 주문 통합 관리 웹 애플리케이션**입니다.  
상품 등록/수정/대량 업로드, 주문 현황 조회, 판매 통계 대시보드 기능을 제공합니다.

<br />

## 주요 기능

| 기능 | 설명 |
|------|------|
| 인증 | 이메일/비밀번호 로그인, JWT 세션, 미인증 라우트 자동 차단 |
| 홈 대시보드 | 판매 현황 통계 카드, 상품 상태별 도넛 차트, 최근 등록 상품 목록 |
| 상품 목록 | 날짜·카테고리·판매 상태 복합 필터, 키워드 검색, 페이지네이션 |
| 상품 등록/수정 | 기본 정보, 가격/수량, 옵션 조합, 상품 고시 정보 등 전체 CRUD |
| 상품 대량 등록 | 엑셀 템플릿 다운로드 → 업로드 → 미리보기 → 일괄 제출 |
| 주문 관리 | 주문 목록 조회, 주문 수집, 주문 등록 |

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
| API Mocking | MSW 2 | 서비스 워커 레벨 인터셉트로 실제 네트워크와 동일한 개발 환경 |
| 엑셀 | ExcelJS + XLSX | 템플릿 생성(ExcelJS)과 업로드 파싱(XLSX) 역할 분리 |
| 차트 | Recharts | React 친화적 선언형 차트 API |

<br />

## 아키텍처 설계 포인트

### Feature-driven 모듈 구조

도메인(상품·주문·홈·인증)별로 `api / store / types / ui / util`을 각 feature 폴더에 응집시켰습니다.  
기능이 추가될 때 기존 코드를 수정하지 않고 새 feature 폴더를 추가하는 방식으로 확장합니다.

```
src/features/
├── products/   # 상품 관련 api, store, types, ui, util
├── order/      # 주문 관련 api, store, types, ui, util
├── home/       # 홈 대시보드
└── auth/       # 인증
```

### 3계층 상태 관리

| 레이어 | 도구 | 담당 |
|--------|------|------|
| 서버 상태 | TanStack Query | API 데이터 캐싱 · 동기화 |
| UI 상태 | Jotai atoms | 검색 필터, 페이지네이션 등 |
| 폼 상태 | React Hook Form | 입력값, 유효성 검사 |

각 상태를 하나의 도구로만 관리해 책임 범위를 명확히 분리했습니다.

### 엑셀 전략 패턴 (Strategy Pattern)

도메인마다 저장 전처리 로직이 달라 Strategy Pattern으로 분리했습니다.  
새 도메인이 추가되면 전략 함수 하나와 `switch` 분기 한 줄만 추가하면 됩니다.

```
components/excel/strategies/
├── productExcelSaveStrategy.ts  # 상품 ID · 등록일 주입
└── orderExcelSaveStrategy.ts    # 주문 번호 · 등록일 주입
```

### 기능 스코프 Provider

엑셀 상태는 특정 페이지 트리에서만 필요하므로, `ExcelProvider(JotaiProvider)`로 스코프를 제한해 전역 상태 오염을 방지했습니다.

<br />

## 로컬 실행

```bash
# 패키지 설치
npm install

# 개발 서버 실행 (MSW 자동 활성화)
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

> 별도의 백엔드 서버 없이 MSW(Mock Service Worker)가 API 요청을 가로채 응답합니다.

### 환경 변수

프로젝트 루트에 `.env.local` 파일을 생성하세요.

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 테스트 계정

| 이메일 | 비밀번호 |
|--------|----------|
| `admin@example.com` | `admin123` |

<br />

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router 페이지
│   ├── (auth)/                 # 로그인, 회원가입
│   └── (authenticated)/        # 홈, 상품, 주문 (인증 필요)
├── features/                   # 도메인별 Feature 모듈
│   ├── products/
│   ├── order/
│   ├── home/
│   └── auth/
├── components/
│   ├── common/                 # TablePagination, RangeDatePicker, FilterSelect 등
│   ├── excel/                  # 엑셀 업로드/다운로드/미리보기 + 전략 패턴
│   ├── layout/                 # 글로벌 헤더, 사이드바
│   ├── providers/              # SessionProvider, MSWProvider, ExcelProvider
│   └── ui/                     # Radix UI 기반 기본 컴포넌트
├── mocks/                      # MSW 핸들러 및 목업 데이터
│   ├── handlers.ts
│   └── data/                   # faker.js 기반 목업 데이터
├── types/                      # 공통 타입 정의
└── middleware.ts               # 인증 라우트 보호
```

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
```
