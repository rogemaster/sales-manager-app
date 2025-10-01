# 판매 관리 시스템 (Sales Manager App)

Next.js 15와 TypeScript를 기반으로 구축된 현대적인 판매 관리 시스템입니다. 상품 관리, 주문 처리, 쇼핑몰 연동 등의 기능을 제공합니다.

## 🚀 주요 기능

### 🔐 인증 시스템

- NextAuth.js를 활용한 이메일/패스워드 인증
- JWT 기반 세션 관리
- 보호된 라우트 및 권한 관리

### 📦 상품 관리

- **상품 목록**: 카테고리별, 상태별 상품 조회 및 검색
- **상품 등록**: 개별 상품 등록 기능
- **대량 등록**: Excel 파일을 통한 상품 일괄 등록
- **상품 상태 관리**: 판매중, 판매대기, 품절, 판매중단 상태 관리

### 🛒 주문 관리

- 주문 목록 조회 및 관리
- 주문 상태 추적

### 🏪 쇼핑몰 연동

- 쇼핑몰 설정 관리
- 쇼핑몰 상품 등록 및 목록 관리

### 📊 데이터 관리

- Excel 파일 업로드/다운로드
- 데이터 검증 및 미리보기
- 대량 데이터 처리

## 🛠 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Library**: Radix UI, Tailwind CSS
- **상태 관리**: Jotai
- **인증**: NextAuth.js
- **폼 관리**: React Hook Form + Zod
- **데이터 처리**: ExcelJS, XLSX
- **아이콘**: Lucide React
- **차트**: Recharts

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지
│   ├── (authenticated)/   # 인증된 사용자 페이지
│   └── api/               # API 라우트
├── components/            # 공통 컴포넌트
│   ├── auth/              # 인증 관련 컴포넌트
│   ├── excel/             # Excel 처리 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   └── ui/                # UI 컴포넌트
├── features/              # 기능별 모듈
│   ├── auth/              # 인증 기능
│   ├── products/          # 상품 관리 기능(작업중)
│   └── order/             # 주문 관리 기능(상품 작업 후 구현)
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티 및 라이브러리
├── store/                 # 전역 상태 관리
└── types/                 # 타입 정의
```

## 🚀 시작하기

### 의존성 설치

```bash
npm install
# 또는
yarn install
# 또는
pnpm install
```

<!-- ### 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# NextAuth.js 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
``` -->

### 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
# 또는
pnpm dev
```

<!-- 브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

## 🔑 테스트 계정

### 관리자 계정

- 이메일: `admin@example.com`
- 비밀번호: `password123`

### 일반 사용자 계정

- 이메일: `user@example.com`
- 비밀번호: `password123`

## 📋 사용 가능한 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행 -->

```

## 🔧 주요 기능 상세

### 상품 관리

- 상품 CRUD 작업
- 카테고리별 분류
- 판매 상태 관리 (판매중, 판매대기, 품절, 판매중단)
- 가격 및 재고 관리
- 이미지 및 상세 정보 관리

### Excel 대량 처리

- Excel 템플릿 다운로드
- 대량 상품 데이터 업로드
- 데이터 검증 및 오류 처리
- 미리보기 및 수정 기능

### 인증 및 보안

- JWT 기반 세션 관리
- 보호된 라우트
- 사용자 권한 관리
```
