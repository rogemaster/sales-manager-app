# 회원가입 페이지 설계

**날짜:** 2026-06-04  
**라우트:** `/register` (`src/app/(auth)/register/page.tsx`)  
**상태:** 승인됨

---

## 1. 개요

신규 사용자가 서비스에 가입할 수 있는 회원가입 페이지를 구현한다.
가입 완료 후 NextAuth `signIn`으로 자동 로그인 처리하여 `/home`으로 이동한다.

---

## 2. 레이아웃

- **단일 페이지 스크롤** — 4개 섹션을 Card로 세로 배치
- 최대 너비 `max-w-2xl`, 중앙 정렬
- 페이지 상단에 타이틀("회원가입") 및 부제목 표시
- 최하단 "회원가입" 제출 버튼 + "로그인" 링크

---

## 3. 섹션 구성

### 3-1. 로그인 정보 (필수)

| 필드 | 타입 | 레이아웃 | 비고 |
|------|------|----------|------|
| 이메일 | `input[type=email]` + 중복확인 버튼 | 단열 | 버튼 클릭 시 중복 체크 API 호출 |
| 비밀번호 | `input[type=password]` | 단열 | 힌트: "영어, 숫자, 특수문자 조합 9자 이상" |
| 비밀번호 확인 | `input[type=password]` | 단열 | — |

### 3-2. 회사 정보 (필수)

| 필드 | 타입 | 레이아웃 | 비고 |
|------|------|----------|------|
| 상호/법인명 | `input[type=text]` | 2열 좌 | — |
| 대표자명 | `input[type=text]` | 2열 우 | — |
| 사업자등록번호 | `input[type=text]` | 2열 좌 | placeholder `000-00-00000`, 자동 하이픈 포맷팅 |
| 업종 | `select` (드롭다운) | 2열 우 | `MOCK_CATEGORY_DATA` 옵션 사용 |
| 사업자등록증 | 파일 첨부 | 전폭 단열 | 허용: JPG, JPEG, PNG, PDF |

### 3-3. 담당자 정보 (필수)

| 필드 | 타입 | 레이아웃 | 비고 |
|------|------|----------|------|
| 담당자명 | `input[type=text]` | 3열 | — |
| 담당자 이메일 | `input[type=email]` | 3열 | — |
| 담당자 휴대폰 | `input[type=tel]` | 3열 | placeholder `010-0000-0000`, 자동 하이픈 포맷팅 |

### 3-4. 정산담당자 정보 (선택)

| 필드 | 타입 | 레이아웃 | 비고 |
|------|------|----------|------|
| 담당자명 | `input[type=text]` | 3열 | — |
| 담당자 이메일 | `input[type=email]` | 3열 | — |
| 담당자 휴대폰 | `input[type=tel]` | 3열 | placeholder `010-0000-0000`, 자동 하이픈 포맷팅 |

Card 하단에 안내 문구 표시:
> 미입력시 담당자 이메일로 세금계산서가 발행됩니다.

스타일: `text-xs text-muted-foreground` (비밀번호 힌트와 동일)

---

## 4. 유효성 검사 (Zod + React Hook Form)

### 4-1. 이메일

- 필수, 이메일 형식 (`z.string().email()`)
- **중복 확인 필수**: 제출 전 중복 확인을 완료해야 하며, 이메일 값 변경 시 중복 확인 상태 초기화

### 4-2. 비밀번호

- 필수, 9자 이상
- 영문 + 숫자 + 특수문자 조합 필수
- 정규식: `/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{9,}$/`

### 4-3. 비밀번호 확인

- 필수, 비밀번호 필드 값과 일치해야 함 (`z.string().refine(...)`)

### 4-4. 회사 정보

- 상호/법인명: 필수
- 대표자명: 필수
- 사업자등록번호: 필수, `000-00-00000` 형식 (10자리 숫자 + 자동 하이픈)
- 업종: 필수, `MOCK_CATEGORY_DATA`의 id 값 중 하나
- 사업자등록증: 필수, JPG/JPEG/PNG/PDF만 허용

### 4-5. 담당자 정보

- 담당자명: 필수
- 담당자 이메일: 필수, 이메일 형식
- 담당자 휴대폰: 필수, `010-XXXX-XXXX` 형식 (기존 `Validators.ts`의 phone regex 패턴 준용)

### 4-6. 정산담당자 정보

- 전체 선택 — 모든 필드 필수 아님
- 이메일 필드에 값이 있으면 이메일 형식 검사 적용
- 휴대폰 필드는 자동 포맷팅만 적용, 형식 유효성 검사 없음

---

## 5. 이메일 중복 확인

- **트리거**: "중복확인" 버튼 클릭
- **API**: `POST /api/auth/check-email` `{ email: string }`
- **응답**:
  - `200 { available: true }` → 이메일 하단에 초록 텍스트: "사용 가능한 이메일입니다"
  - `200 { available: false }` → 이메일 하단에 빨간 텍스트: "이미 사용 중인 이메일입니다"
- **상태 관리**: `isEmailChecked: boolean` — 제출 시 `false`면 "이메일 중복 확인이 필요합니다" 에러 표시
- 이메일 입력값 변경 시 `isEmailChecked` 초기화

---

## 6. 파일 첨부 (사업자등록증)

- shadcn/ui 없이 `<input type="file">` 직접 구현 (스타일만 커스텀)
- 허용 MIME: `image/jpeg`, `image/png`, `application/pdf`
- `accept=".jpg,.jpeg,.png,.pdf"` 속성 적용
- 선택된 파일명 표시
- form 제출 시 `File` 객체를 `FormData`에 포함하지 않고, MSW mock에서는 파일명만 받아 처리

---

## 7. 자동 포맷팅

| 필드 | 포맷 | 로직 |
|------|------|------|
| 사업자등록번호 | `000-00-00000` | 숫자만 추출 후 3-2-5 자리 하이픈 삽입 |
| 담당자 휴대폰 (담당자/정산) | `010-0000-0000` | 숫자만 추출 후 3-4-4 자리 하이픈 삽입 |

---

## 8. 제출 및 자동 로그인

1. RHF `handleSubmit` → Zod 유효성 검사
2. `isEmailChecked` 확인
3. `POST /api/auth/register` 호출
4. 성공 시 → `signIn('credentials', { email, password, redirect: false })` 호출
5. 로그인 성공 → `router.push('/home')`

---

## 9. MSW Mock Handlers

| 메서드 | 경로 | 역할 |
|--------|------|------|
| `POST` | `/api/auth/check-email` | 이메일 중복 확인. 이미 등록된 이메일이면 `available: false` 반환 |
| `POST` | `/api/auth/register` | 회원가입. 성공 시 `201`, 실패 시 `400` |

- `checkEmail.ts` — `utils/` 분리
- `registerUser.ts` — `utils/` 분리
- mock 사용자 데이터는 기존 `MockUsersData` 활용

---

## 10. 파일 구조

```
src/features/auth/
├── types/
│   └── Auth.ts                    # RegisterFormData 타입 추가
├── ui/
│   └── register/
│       ├── RegisterForm.tsx       # 메인 폼 컴포넌트 (RHF 연결)
│       ├── sections/
│       │   ├── LoginInfoSection.tsx
│       │   ├── CompanyInfoSection.tsx
│       │   ├── ContactSection.tsx
│       │   └── SettlementSection.tsx
│       └── hooks/
│           └── useRegisterForm.ts # RHF + Zod + 제출 로직
├── util/
│   └── registerValidation.ts      # Zod 스키마
└── constant/
    └── errorMessage.ts            # 에러 메시지 추가

src/mocks/
├── handlers.ts                    # check-email, register 핸들러 추가
├── data/
│   └── MockUsersData.ts           # 기존 사용자 데이터 참조
└── utils/
    ├── checkEmail.ts
    └── registerUser.ts

src/app/(auth)/register/
└── page.tsx                       # RegisterForm 렌더링
```

---

## 11. UI 컨벤션

- Card 컴포넌트: `CLAUDE.md`의 Card 패턴 준수 (accent 바 + CardTitle)
- 정산담당자 Card는 accent 바 색상 `bg-muted-foreground` (필수 섹션과 구분)
- 에러 메시지: `text-xs text-destructive`
- 힌트/안내 문구: `text-xs text-muted-foreground`
- 제출 버튼: `w-full` 전폭, `variant="default"`
