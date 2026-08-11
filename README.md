# Sales Manager App

여러 외부 쇼핑몰에서 각각 관리해야 하는 **관리 포인트(상품 · 주문 · 클레임 등)를 한 곳에서 일괄 처리**하는 판매자용 웹 애플리케이션입니다.  
판매자가 몰마다 따로 들어가 하던 일을 여기서 한 번에 합니다 — 상품을 한 번 등록해 여러 몰로 전송하고, 흩어진 주문을 수집해 통합 조회합니다. `ownerId` 기반으로 슈퍼계정별 데이터가 격리되는 멀티 테넌트 구조입니다.

영역마다 데이터가 흐르는 방향이 다릅니다.

| 영역 | 방향 | 내용 |
|------|------|------|
| 상품 | **내보내기** | 오리진 상품 + 쇼핑몰 정보설정을 결합해 각 몰로 전송, 이후 수정·재전송 |
| 주문 · 클레임 | **가져오기** | 각 몰의 주문을 수집해 통합 목록으로 조회·처리 |

**[라이브 데모 →](https://sales-manager-app-nine.vercel.app/)** | 테스트 계정: `admin@example.com` / `admin123@`

<br />

## 주요 기능

| 기능 | 설명 |
|------|------|
| 인증 | 이메일/비밀번호 로그인, 회원가입(사업자 정보·연락처·정산 정보 입력 및 이메일 중복 검증), JWT 세션, 미인증 라우트 자동 차단 |
| 홈 대시보드 | 판매·주문·클레임·문의 현황 통계 카드, 최근 등록 상품 목록 |
| 상품 목록 | 날짜·카테고리·판매 상태 복합 필터, 검색 타입(상품명·상품코드) 선택 검색, 페이지네이션 |
| 상품 등록/수정 | 기본 정보, 가격/수량, 옵션 조합, 상품 고시 정보 등 전체 CRUD |
| 상품 대량 등록 | 엑셀 템플릿 다운로드 → 업로드 → 미리보기 → 일괄 제출 |
| 주문 수집 | 쇼핑몰별 주문 수집 작업 실행 및 수집 이력 조회 |
| 주문 목록 | 날짜·쇼핑몰·상태 필터, 일괄 상태변경 |
| 주문 상세 | 주문 정보, 클레임, 코멘트, 수정이력, 배송 처리 |
| 주문 등록 | 수동 주문 생성 |
| 쇼핑몰 계정 관리 | 쇼핑몰별 API 연동 계정 목록/등록/수정/삭제, 사용 여부 일괄 변경, 등급별 권한 분리 |
| 쇼핑몰 정보설정 | 몰별 판매 정보(별칭·상품상태·판매기간) 등록/수정, 출고지·반품지 주소록 연동, 네이버·카카오 등 몰 고유 항목(A/S 정보·구매평 노출 여부 등) 입력 |
| 쇼핑몰 상품등록 | 등록할 상품과 대상 몰(쇼핑몰 정보설정)을 선택해 스테이징 후 일괄 전송, 전송 결과(성공·실패) 확인 |
| 쇼핑몰 연동상품 | 전송된 연동 건 목록(몰·계정·연동상태·쇼핑몰 상품코드), 실패 사유 확인, 연동 건 단위 수정 및 단건·일괄 재전송 |
| 사용자 관리 | 사용자 목록 조회, 등록, 삭제 (등급별 권한 분리) |
| 프로필 수정 | 닉네임·연락처·소개·회사·지역 정보 수정 |

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
| DB | Neon (PostgreSQL) + Drizzle ORM | 유저 정보 영속성 보장, 서버리스 환경에 최적화된 serverless driver |
| API Mocking | MSW 2 | 비즈니스 데이터(상품·주문 등) 개발용 mock, 서비스 워커 레벨 인터셉트 |
| 엑셀 | ExcelJS + XLSX | 템플릿 생성(ExcelJS)과 업로드 파싱(XLSX) 역할 분리 |
| 테스트 | Vitest | 순수 비즈니스 로직 단위 테스트 — MSW mock 유틸(도메인 조회·필터링, ownerId 테넌트 격리, 연동 전송·재전송), API 인증 가드, 도메인 유틸 (24개 파일 / 170건) |

<br />

## 아키텍처 설계 포인트

### Feature-driven 모듈 구조

도메인별로 `api / store / types / ui / util / constant`를 각 feature 폴더에 응집시켰습니다.  
기능이 추가될 때 기존 코드를 수정하지 않고 새 feature 폴더를 추가하는 방식으로 확장합니다.

```
src/features/
├── products/          # 상품 관련 api, store, types, ui, util
├── order/             # 주문·주문수집 api, store, types, ui, util
├── account/           # 사용자 관리 api, store, types, ui
├── shoppingAccount/   # 쇼핑몰 계정(API 연동 계정) 관리
├── shoppingSetting/   # 쇼핑몰 정보설정(판매 정보) 관리
├── mallRegistration/  # 쇼핑몰 상품등록 — 대상 선택·스테이징·전송
├── mallLinkedProduct/ # 쇼핑몰 연동상품 — 연동 건 목록·수정·재전송
├── profile/           # 프로필 수정 api, ui
├── home/              # 홈 대시보드
└── auth/              # 인증
```

**화면이 소유하는 것과 도메인이 소유하는 것을 구분합니다.** 검색 필터 컴포넌트와 그 store는 화면마다 자기 것을 갖고, 다른 도메인 것을 가져다 쓰지 않습니다 — 전역 atom에 바인딩된 컴포넌트를 재사용하면 store까지 딸려와 화면 간 상태가 새기 때문입니다. 반대로 요청 타입·조회 API·표시용 상수는 공유합니다(같은 엔드포인트를 호출하면 요청 타입은 하나여야 합니다).

여러 도메인이 공유하는 상수·유틸은 `src/shared/`로 분리합니다.

```
src/shared/
├── constant/   # 쇼핑몰 목록·필터 '전체' 옵션·배송 유형 등 공통 상수
└── utils/      # 연락처 검증/포맷, API 인증 가드(apiAuth)
```

### 3계층 상태 관리

| 레이어 | 도구 | 담당 |
|--------|------|------|
| 서버 상태 | TanStack Query | API 데이터 캐싱 · 동기화 |
| UI 상태 | Jotai atoms | 검색 필터, 페이지네이션, 선택 항목 등 |
| 폼 상태 | React Hook Form | 입력값, 유효성 검사 |

각 상태를 하나의 도구로만 관리해 책임 범위를 명확히 분리했습니다.

### MSW / DB 경계 설계

MSW의 구조적 한계(서비스 워커가 서버사이드 `authorize()` 실행에 관여 불가)로 인해 유저 관련 API는 실제 DB route handler로 전환했습니다.

| 처리 방식 | 대상 엔드포인트 |
|-----------|----------------|
| **DB route handler** | 로그인, 회원가입, 이메일 중복 확인, 사용자 등록·목록·삭제, 프로필 수정 |
| **MSW** | 상품, 주문, 쇼핑몰 계정, 홈 대시보드 등 비즈니스 데이터 전반 |

판단 기준: **유저 인증·식별에 직접 연관되는 데이터**는 DB, 나머지 비즈니스 데이터는 MSW 유지.

```
src/app/api/                          # DB 연동 route handlers
├── auth/[...nextauth]/route.ts       # NextAuth
├── register/route.ts                 # 회원가입
├── check-email/route.ts              # 이메일 중복 확인
├── profile/route.ts                  # 프로필 수정
└── account/users/
    ├── route.ts                      # 사용자 삭제 (DELETE)
    ├── list/route.ts                 # 사용자 목록 조회 (POST)
    └── create/route.ts               # 사용자 등록 (POST)
```

### ownerId 기반 멀티 테넌시

가입으로 생성되는 계정(`super_admin`)만 최상위 테넌트이며, 사용자 관리에서 등록되는 계정은 그 슈퍼계정에 종속됩니다. 모든 도메인 리소스(주문·상품·쇼핑몰 계정·쇼핑몰 정보설정 등)는 `ownerId` 필드로 테넌트를 구분합니다.

- **목록/생성 API**: 로그인 계정의 `ownerId`(`workspaceOwnerIdAtom`)를 요청 body에 실어 보내고, 서버는 그 값으로 필터링/스탬핑합니다.
- **단건 조회/수정 API**: `X-Owner-Id` 헤더로 `ownerId`를 전달하고, 서버는 리소스의 `ownerId`와 비교해 불일치·미존재 시 모두 `404`로 응답합니다(다른 테넌트 리소스의 존재 여부 자체를 노출하지 않기 위함). 여러 항목을 한 번에 처리하는 액션(주문수집 트리거 등)은 예외적으로 거부 대신 소유한 항목만 필터링해 실행합니다.

```
ownerId === id  → 슈퍼계정 (super_admin, 자기참조)
ownerId === X   → X 슈퍼계정에 종속된 서브유저 (admin, operator)
```

### 등급 기반 권한 제어

사용자 등급(`UserGrade`)에 따라 UI 레벨에서 기능 접근을 제한합니다.

| 등급 | 사용자 등록 | 사용자 삭제 |
|------|------------|------------|
| `super_admin` | ✅ | ✅ |
| `admin` | ✅ | ❌ |
| `operator` | ❌ | ❌ |

쇼핑몰 계정 관리 화면의 일괄 액션도 동일한 등급 체계를 따릅니다.

| 등급 | 계정 삭제 | 사용 여부 변경 |
|------|----------|--------------|
| `super_admin` | ✅ | ✅ |
| `admin` | ❌ | ✅ |
| `operator` | ❌ | ❌ |

### 오리진 데이터와 쇼핑몰 연동 데이터 분리

몰마다 요구하는 상품정보가 겹치기도 하고 갈리기도 합니다. **공통 정보는 최대한 오리진 상품(`Product`)에 모으고, 몰 고유값만 쇼핑몰 정보설정(`ShoppingSetting`)으로 뺍니다.** 전송 시점에 둘이 결합해 하나의 상품 데이터가 되고, 각 몰이 요구하는 key에 value를 채워 보냅니다.

전송으로 만들어지는 **연동 데이터(`MallLinkedProduct`)는 오리진과 별개의 독립 엔티티**이며, 생성 시점의 상품·설정 값을 스냅샷으로 복사해 보유합니다.

```ts
interface MallLinkedProduct {
  // 불변 식별 정보 — 어디서 파생됐는지 (값 동기화 없음, 추적용)
  sourceProductId: string;
  sourceShoppingSettingId: string;
  mallCode: ShoppingMalls;

  // 가변 스냅샷 — 이 연동 건의 실제 값
  productSnapshot: Product;
  settingSnapshot: ShoppingSetting;

  status: 'success' | 'failed';
  externalProductId?: string; // 외부몰이 부여한 상품코드
}
```

- **오리진을 수정해도 연동 데이터는 바뀌지 않습니다.** 연동 건은 각각을 직접 고쳐 해당 몰로 재전송합니다.
- **연동 데이터 1건 = 외부몰 상품 1개.** 같은 상품을 같은 몰로 여러 번 보낼 수 있고, 그때마다 별도 연동 건이 생깁니다.
- **저장과 재전송은 별개 액션**입니다. 저장은 스냅샷과 `updatedAt`만, 재전송은 `status`와 `lastSentAt`만 건드립니다.
- `externalProductId`의 유무가 **"외부몰에 이 상품이 존재하는가"의 단일 판정 기준**입니다. 값이 있으면 신규 등록이 아니라 기존 상품의 수정 전송이므로 중복 판정을 하지 않고, 재전송이 실패해도 이 값은 지우지 않습니다(외부몰 상품은 이전 값으로 살아있기 때문).

전송값의 최종 검증 책임은 각 외부몰에 있습니다. 프론트가 몰별 규칙을 미리 재현해 전송을 막지 않고, 실패하면 연동상품 목록에서 사유를 확인 → 수정 → 재전송하는 흐름으로 처리합니다. 다만 입력 단계의 필수 여부는 **몰들 중 가장 엄격한 쪽**을 따릅니다(A몰 필수·B몰 선택이면 필수).

설계 배경은 [`.claude/rules/domain-design.md`](.claude/rules/domain-design.md)에 정리했습니다.

### 엑셀 전략 패턴 (Strategy Pattern)

도메인마다 저장 전처리 로직이 달라 Strategy Pattern으로 분리했습니다.  
새 도메인이 추가되면 전략 함수 하나와 `switch` 분기 한 줄만 추가하면 됩니다.

```
components/excel/strategies/
├── productExcelSaveStrategy.ts  # 상품 ID · 등록일 주입
└── orderExcelSaveStrategy.ts    # 주문 번호 · 등록일 주입
```

### 몰(mallCode)별 고유 설정 — Discriminated Union

쇼핑몰마다 고유 설정 필드가 다릅니다(네이버: A/S 정보·풀필먼트 물류센터 ID, 카카오: 인증정보·쇼핑하우 전시여부 등). `ShoppingSetting`을 `mallCode` 기준 discriminated union으로 설계해 몰별로 다른 필드 셋을 타입 레벨에서 표현합니다.

```ts
type ShoppingSetting =
  | (ShoppingSettingBase & { mallCode: 'NSST'; mallSettings?: NaverSettingAttributes })
  | (ShoppingSettingBase & { mallCode: 'KAKAOS'; mallSettings?: KakaoSettingAttributes })
  | (ShoppingSettingBase & { mallCode: Exclude<ShoppingMalls, 'NSST' | 'KAKAOS'>; mallSettings?: never });
```

React Hook Form은 `keyof`가 유니온 타입에서 공통 키만 남기는 특성 때문에 discriminated union을 폼 상태로 직접 다루기 어려워, RHF 쪽은 느슨한 flat 타입(`ShoppingSettingFormValues`)으로 관리하고 제출 시점에만 `buildMallSettingsPayload`로 도메인 타입으로 변환합니다 — 폼 상태 타입과 도메인 타입을 분리해 타입 안전성이 필요한 경계에서만 좁히는 전략입니다. 설계 배경과 트레이드오프는 [`docs/solutions/conventions/typescript-type-design-patterns.md`](docs/solutions/conventions/typescript-type-design-patterns.md), 확장 시 체크리스트는 [`.claude/rules/domain-design.md`](.claude/rules/domain-design.md)에 정리했습니다.

### MSW 핸들러 구조

`src/mocks/handlers.ts`는 라우팅과 request/response 처리만 담당하고, 비즈니스 로직은 `src/mocks/utils/`로 위임합니다.

```
src/mocks/
├── handlers.ts              # 인덱스 — 도메인 핸들러 spread
├── handlers/                # 도메인별 핸들러
│   ├── auth.ts              # logout
│   ├── home.ts
│   ├── products.ts
│   ├── orders.ts
│   ├── collection.ts        # 주문수집 작업/트리거
│   ├── shoppingAccounts.ts
│   ├── shoppingSettings.ts
│   └── mallLinkedProducts.ts # 연동 전송·조회·수정·재전송
├── data/                    # 정적 mock 원본 데이터
└── utils/                   # 핸들러 비즈니스 로직
```

<br />

## 로컬 실행

```bash
# 패키지 설치
npm install

# 개발 서버 실행 (MSW 자동 활성화)
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

> 비즈니스 데이터(상품·주문 등)는 MSW가 처리하고, 유저 관련 API(로그인·회원가입·사용자 관리 등)는 Neon DB에 직접 연결됩니다.

### 환경 변수

프로젝트 루트에 `.env.local` 파일을 생성하세요.

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL=your-neon-database-url
```

### 테스트 계정

유저 정보는 Neon DB에 저장됩니다. 라이브 데모 환경의 테스트 계정은 아래와 같습니다.

| 이메일 | 비밀번호 |
|--------|----------|
| `admin@example.com` | `admin123@` |

로컬 환경에서는 `/register`에서 직접 회원가입 후 사용하세요.

<br />

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router 페이지
│   ├── (auth)/                 # 로그인, 회원가입
│   ├── (authenticated)/        # 인증 필요 페이지
│   │   ├── home/               # 홈 대시보드
│   │   ├── products/           # 상품목록, 등록, 수정, 대량등록
│   │   ├── order/              # 주문수집, 목록, 상세, 등록
│   │   ├── shopping/           # 쇼핑몰 관리
│   │   │   ├── accounts/       # 쇼핑몰 계정 목록, 등록, 수정
│   │   │   ├── settings/       # 쇼핑몰 정보설정 목록, 등록, 수정
│   │   │   ├── register/       # 쇼핑몰 상품등록 (전송)
│   │   │   └── linked-products/ # 연동상품 목록, 연동 건 수정
│   │   ├── account/            # 사용자관리
│   │   └── profile/            # 프로필 수정
│   └── api/                    # DB 연동 route handlers
│       ├── auth/[...nextauth]/  # NextAuth
│       ├── register/            # 회원가입
│       ├── check-email/         # 이메일 중복 확인
│       ├── profile/             # 프로필 수정
│       └── account/users/       # 사용자 목록·등록·삭제
├── db/                         # Neon DB 연결 및 스키마
│   ├── index.ts                # Drizzle 클라이언트
│   ├── schema.ts               # users 테이블 정의
│   └── password.ts             # bcrypt 해싱 유틸
├── features/                   # 도메인별 Feature 모듈
│   ├── products/
│   ├── order/
│   ├── account/
│   ├── shoppingAccount/
│   ├── shoppingSetting/
│   ├── mallRegistration/
│   ├── mallLinkedProduct/
│   ├── profile/
│   ├── home/
│   └── auth/
├── shared/                     # 도메인 간 공유 상수·유틸
│   ├── constant/               # 쇼핑몰·필터·배송 상수
│   └── utils/                  # 연락처 검증/포맷, API 인증 가드
├── components/
│   ├── common/                 # TablePagination, RangeDateFilter, FilterSelect, Alert(useAlert) 등
│   ├── excel/                  # 엑셀 업로드/다운로드/미리보기 + 전략 패턴
│   ├── layout/                 # 글로벌 헤더, 사이드바
│   ├── providers/              # SessionProvider, MSWProvider, ExcelProvider
│   └── ui/                     # Radix UI 기반 기본 컴포넌트
├── mocks/                      # MSW 핸들러 및 목업 데이터 (비즈니스 데이터)
│   ├── handlers.ts
│   ├── handlers/               # 도메인별 핸들러
│   ├── data/                   # 정적 목업 데이터
│   └── utils/                  # 핸들러 비즈니스 로직
├── constant/                   # 사이드바 메뉴 등 앱 전역 상수
├── types/                      # 공통 타입 정의
└── middleware.ts               # 인증 라우트 보호
```

## 스크립트

```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 실행
npm test             # 단위 테스트 실행
npm run test:watch   # 테스트 감시 모드 (파일 변경 시 자동 재실행)
```
