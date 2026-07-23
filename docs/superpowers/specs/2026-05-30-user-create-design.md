# 사용자 등록 페이지 설계

**날짜:** 2026-05-30  
**라우트:** `/account/user/create`

---

## 개요

관리자가 새 사용자를 등록하는 페이지. 슈퍼관리자(`super_admin`)는 즉시 활성화(`active`) 상태로 등록하고, 일반관리자(`admin`)는 승인 대기(`pending`) 상태로 등록 요청한다. 승인 플로우(사용자 목록/상세 페이지에서 처리)는 이후 별도 개발 예정.

---

## 파일 구조

```
src/
├── app/(authenticated)/account/user/create/
│   └── page.tsx
│
├── features/account/
│   ├── api/
│   │   ├── createUser.ts
│   │   └── useCreateUser.ts
│   ├── types/
│   │   └── user.types.ts          (AccountUser에 status 추가, CreateUserBody 추가)
│   └── ui/user/create/
│       ├── UserCreateLayout.tsx
│       └── UserCreateForm.tsx
│
└── mocks/
    ├── handlers.ts                (POST /api/account/users/create 핸들러 추가)
    └── utils/
        └── createUser.ts
```

---

## 타입 변경

### AccountUser (`user.types.ts`)

```typescript
export interface AccountUser extends User {
  id: string;
  status: 'active' | 'pending';   // 신규 추가
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserBody {
  email: string;
  password: string;
  grade: UserGrade;
  name: string;
  phone: string;
  status: 'active' | 'pending';
  avatar?: string;
  bio?: string;
}
```

`MOCK_USERS_DATA` 기존 항목 전체에 `status: 'active'` 추가 필요.

---

## 폼 필드 & 유효성 검사

Zod 스키마는 `UserCreateForm.tsx`에 co-locate.

| 필드 | 컴포넌트 | 필수 | 유효성 |
|------|----------|------|--------|
| 이메일 | `Input type="email"` | ✅ | 이메일 형식 |
| 비밀번호 | `Input type="password"` | ✅ | 6자 이상 |
| 사용자등급 | `Select` | ✅ | enum 검사 |
| 이름 | `Input type="text"` | ✅ | 1자 이상 |
| 연락처 | `Input type="tel"` | ✅ | 1자 이상 |
| 프로필사진 | `Input type="file"` → base64 | ❌ | - |
| 소개 | `Textarea` | ❌ | - |

```typescript
const schema = z.object({
  email:    z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
  grade:    z.enum(['super_admin', 'admin', 'operator'], { message: '등급을 선택해주세요.' }),
  name:     z.string().min(1, '이름을 입력해주세요.'),
  phone:    z.string().min(1, '연락처를 입력해주세요.'),
  avatar:   z.string().optional(),
  bio:      z.string().optional(),
});
```

---

## 등급별 분기 동작

| 로그인 사용자 | 등급 선택 옵션 | 버튼 텍스트 | API status | 성공 alert |
|---|---|---|---|---|
| `super_admin` | 슈퍼관리자, 일반관리자, 운영자 | 등록 | `active` | 사용자가 등록되었습니다. |
| `admin` | 일반관리자, 운영자 | 등록요청 | `pending` | 등록 요청이 완료되었습니다. 슈퍼관리자 승인 후 활성화됩니다. |

취소 버튼: 확인 없이 즉시 `/account/user`로 이동.  
등록/등록요청 성공 후: alert 확인 시 `/account/user`로 이동.

---

## 데이터 흐름

```
UserCreateLayout
  ├─ gradeAtom 읽기 → 버튼 텍스트 / status 결정
  ├─ FormProvider (useForm<CreateUserBody>)
  │    └─ UserCreateForm (필드 렌더링, Zod 유효성)
  └─ handleSubmit → useCreateUser.mutate({ ...data, status })
       └─ POST /api/account/users/create
            └─ [MSW] createUser.ts util
                 └─ id / createdAt / updatedAt 생성 후 MOCK_USERS_DATA.push
       onSuccess → showAlert(grade별 메시지) → confirm 시 router.push('/account/user')
       onError   → showAlert({ type: 'error', message: '사용자 등록에 실패했습니다.' })
```

---

## MSW 핸들러

```typescript
// handlers.ts에 추가
http.post(`${baseUrl}/api/account/users/create`, async ({ request }) => {
  const body = (await request.json()) as CreateUserBody;
  const newUser = createMockUser(body);
  return HttpResponse.json(newUser, { status: 201 });
}),
```

`createUser.ts` util이 id 생성, 날짜 세팅, MOCK_USERS_DATA 삽입을 담당.

---

## 제약 사항

- `비밀번호 변경` 버튼은 이 페이지에 없음 — 수정 페이지에만 표시
- 프로필사진은 mock 환경에서 file → base64 변환으로 저장
- `src/app/api/` 하위 route 파일 생성 금지 — MSW handler만 추가
- git 작업은 모든 개발 완료 후 사용자가 직접 진행
