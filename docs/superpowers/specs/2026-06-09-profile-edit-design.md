# 프로필 수정 화면 설계

**날짜:** 2026-06-09
**상태:** 확정

## 개요

로그인한 사용자가 자신의 기본 정보를 수정하는 화면. `/profile/edit` 독립 페이지로 구현.

## 라우트 & 접근 경로

- **URL:** `/profile/edit`
- **접근:** 프로필 모달의 '프로필 수정' 버튼 클릭 (이미 연결됨)
- **저장 후:** alert → `router.back()` (모달이 있던 화면으로 복귀)

## 표시/수정 필드

| 필드 | 레이블 | 편집 | 유효성 |
|------|--------|------|--------|
| `avatar` | — | 읽기 전용 (표시만) | |
| `name` | 이름 | ✅ 필수 | 1자 이상 |
| `email` | — | 읽기 전용 | |
| `grade` | 등급 | 읽기 전용 (뱃지) | |
| `phone` | 연락처 | ✅ 필수 | `phoneSchemaRequired()` |
| `company` | 소속 | ❌ 선택 | |
| `bio` | 소개 | ❌ 선택 | |

**제외:** 아바타 수정 (추후 스토리지 연동 시 별도 개발), 비밀번호 변경

## 레이아웃

```
┌──────────────────────────────────────────┐
│  프로필 수정                              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ▌ 프로필 정보                            │
├──────────────────────────────────────────┤
│  [아바타]   [이름 입력 필드]             │
│             hong@example.com  [관리자]   │
│                                          │
│  연락처   [___________________]          │
│  소속     [___________________]          │
│  소개     [___________________]          │
│                                          │
│              [취소]  [저장]              │
└──────────────────────────────────────────┘
```

## 데이터 흐름

1. **초기값**: `getUserInfoAtom`에서 읽어 폼 `defaultValues`로 세팅
2. **저장**: `PATCH /api/profile` 호출 → body: `{ name, phone, company, bio }`
3. **성공**: `setUserInfoAtom`으로 atoms 즉시 업데이트 → "저장되었습니다." alert → `router.back()`
4. **실패**: "저장에 실패했습니다." alert, 폼 유지

## 컴포넌트 구조

```
src/features/profile/
├── api/
│   ├── updateProfile.ts         # fetch 함수
│   └── useUpdateProfile.ts      # TanStack Query useMutation 훅
└── ui/
    ├── ProfileModal.tsx          # (기존)
    └── ProfileEditLayout.tsx     # 수정 페이지 레이아웃

src/app/(authenticated)/profile/edit/
└── page.tsx                      # Next.js 페이지
```

## API

```
PATCH /api/profile
Body: { name: string; phone: string; company?: string; bio?: string }
Response: User 객체 (업데이트된 전체 필드)
```

MSW handler 추가 (`src/mocks/handlers.ts`), 비즈니스 로직은 `src/mocks/utils/updateProfile.ts`로 분리.

## Zod 스키마

```ts
const profileEditSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  phone: phoneSchemaRequired(),
  company: z.string().optional(),
  bio: z.string().optional(),
});
```

## 구현 범위 (이번 작업)

- [x] `/profile/edit` 페이지
- [x] ProfileEditLayout 컴포넌트 (React Hook Form + Zod)
- [x] `updateProfile` API 함수 + `useUpdateProfile` 훅
- [x] MSW handler + `updateProfile` util
- [ ] 아바타 수정 — 스토리지 연동 시 별도 개발
- [ ] 비밀번호 변경 — 별도 개발
