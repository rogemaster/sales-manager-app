# 판매 관리 시스템 (Sales Manager App)

Next.js 15와 TypeScript를 기반으로 구축된 판매 관리 시스템입니다. 상품 관리, 주문 처리, 쇼핑몰 연동 등의 기능을 제공합니다.

## 주요 기능

### 인증 시스템

- NextAuth.js를 활용한 이메일/패스워드 인증
- JWT 기반 세션 관리
- 보호된 라우트 및 권한 관리

### 상품 관리

- **상품 목록**: 카테고리별, 상태별 상품 조회 및 검색
- **상품 등록/수정**: 개별 상품 CRUD
- **대량 등록**: Excel 파일을 통한 상품 일괄 등록
- **상품 상태 관리**: 판매중, 판매대기, 품절, 판매중단 상태 관리

### 주문 관리 _(개발 예정)_

- 주문 목록 조회 및 관리
- 주문 상태 추적

### 쇼핑몰 연동 _(개발 예정)_

- 쇼핑몰 설정 관리
- 쇼핑몰 상품 등록 및 목록 관리

### 데이터 관리

- Excel 파일 업로드/다운로드
- 데이터 검증 및 미리보기
- 대량 데이터 처리

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 15, React 19, TypeScript |
| UI | Radix UI, Tailwind CSS |
| 서버 상태 | TanStack Query |
| 클라이언트 상태 | Jotai |
| 폼 관리 | React Hook Form + Zod |
| 인증 | NextAuth.js |
| 데이터 처리 | ExcelJS, XLSX |
| API Mocking | MSW (Mock Service Worker) |
| 아이콘 | Lucide React |
| 차트 | Recharts |

## 프로젝트 구조

```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/              # 인증 관련 페이지
│   ├── (authenticated)/     # 인증된 사용자 페이지
│   └── api/                 # API 라우트
├── components/              # 공통 컴포넌트
│   ├── auth/                # 인증 관련 컴포넌트
│   ├── common/              # 공용 조합 컴포넌트
│   ├── excel/               # Excel 처리 컴포넌트
│   ├── layout/              # 레이아웃 컴포넌트
│   ├── providers/           # Provider 컴포넌트
│   └── ui/                  # UI 컴포넌트
├── constant/                # 전역 상수
├── features/                # 기능별 모듈
│   ├── auth/                # 인증 기능
│   ├── home/                # 홈 기능
│   ├── order/               # 주문 기능
│   └── products/            # 상품 관리 기능
│       ├── api/             # 상품 API 호출
│       ├── constant/        # 상품 관련 상수
│       ├── store/           # 상품 검색/필터 상태
│       ├── types/           # 상품 타입
│       ├── ui/              # 상품 UI 컴포넌트
│       └── util/            # 상품 유틸
├── hooks/                   # 커스텀 훅
├── lib/                     # 공용 유틸/라이브러리
├── mocks/                   # MSW mock 핸들러/데이터
├── store/                   # 전역 상태 관리
├── types/                   # 공용 타입 정의
├── utils/                   # 보조 유틸
└── middleware.ts            # 인증/라우팅 미들웨어
```

## 시작하기

### 의존성 설치

```bash
npm install
```

### 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

> 개발 환경에서는 MSW가 자동으로 실행되어 API 요청을 가로채고 mock 데이터를 반환합니다.

### 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | `admin@example.com` | `password123` |
| 일반 사용자 | `user@example.com` | `password123` |

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
```
