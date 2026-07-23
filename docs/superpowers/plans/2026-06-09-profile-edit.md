# 프로필 수정 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 사용자가 자신의 이름·연락처·소속·소개를 수정할 수 있는 `/profile/edit` 페이지 구현

**Architecture:** MSW util → API 레이어 → MSW handler → UI 컴포넌트 → Next.js 페이지 순으로 바텀업 구현. 성공 시 Jotai atoms를 즉시 업데이트해 헤더 등 다른 UI에도 반영.

**Tech Stack:** Next.js 15 App Router, React Hook Form + Zod, TanStack Query (useMutation), Jotai (getUserInfoAtom / setUserInfoAtom), MSW, shadcn/ui (Card, Avatar, Badge, Input, Textarea, Button, Label)

---

## 파일 구조

| 순서 | 상태 | 경로 | 역할 |
|------|------|------|------|
| 1 | 신규 | `src/mocks/utils/updateProfile.ts` | MOCK_USERS_DATA에서 이메일로 사용자를 찾아 name/phone/company/bio 업데이트 |
| 2 | 신규 | `src/features/profile/api/updateProfile.ts` | fetch 함수 + UpdateProfileBody 타입 정의 |
| 3 | 신규 | `src/features/profile/api/useUpdateProfile.ts` | TanStack Query useMutation 훅 |
| 4 | 수정 | `src/mocks/handlers.ts` | PATCH `/api/profile` 핸들러 추가 (UpdateProfileBody 타입 import) |
| 5 | 신규 | `src/features/profile/ui/ProfileEditLayout.tsx` | 폼 상태·제출 로직·레이아웃 |
| 6 | 신규 | `src/app/(authenticated)/profile/edit/page.tsx` | Next.js 페이지 (ProfileEditLayout 렌더) |

참고 파일:
- `src/features/auth/store/auth.store.ts` — getUserInfoAtom, setUserInfoAtom
- `src/features/auth/types/Auth.ts` — User 타입 `{ email, name, avatar, phone, bio, company, location, grade }`
- `src/mocks/data/MockUsersData.ts` — MOCK_USERS_DATA
- `src/shared/utils/phone.ts` — phoneSchemaRequired()
- `src/hooks/useAlert.tsx` — showAlert 패턴
- `src/features/account/constant/user.constants.ts` — USER_GRADE_OPTIONS

---

## Task 1: MSW util — updateMockProfile

**Files:**
- Create: `src/mocks/utils/updateProfile.ts`

- [ ] **Step 1: 파일 생성**

```typescript
import { User } from '@/features/auth/types/Auth';
import { MOCK_USERS_DATA } from '../data/MockUsersData';

type UpdateProfileBody = {
  email: string;
  name: string;
  phone: string;
  company?: string;
  bio?: string;
};

export const updateMockProfile = (body: UpdateProfileBody): User | null => {
  const index = MOCK_USERS_DATA.findIndex((u) => u.email === body.email);
  if (index === -1) return null;

  MOCK_USERS_DATA[index] = {
    ...MOCK_USERS_DATA[index],
    name: body.name,
    phone: body.phone,
    company: body.company ?? MOCK_USERS_DATA[index].company,
    bio: body.bio ?? MOCK_USERS_DATA[index].bio,
  };

  const { email, name, avatar, phone, bio, company, location, grade } = MOCK_USERS_DATA[index];
  return { email, name, avatar, phone, bio, company, location, grade };
};
```

- [ ] **Step 2: 빌드 오류 확인**

```bash
npm run build
```

빌드 타입 오류가 없으면 다음 Task로.

---

## Task 2: API 레이어 — updateProfile 함수 + useUpdateProfile 훅

**Files:**
- Create: `src/features/profile/api/updateProfile.ts`
- Create: `src/features/profile/api/useUpdateProfile.ts`

- [ ] **Step 1: fetch 함수 + 타입 생성 (`updateProfile.ts`)**

```typescript
import { User } from '@/features/auth/types/Auth';

export type UpdateProfileBody = {
  email: string;
  name: string;
  phone: string;
  company?: string;
  bio?: string;
};

export const updateProfile = async (body: UpdateProfileBody): Promise<User> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('프로필 저장에 실패했습니다.');
  return response.json();
};
```

- [ ] **Step 2: useMutation 훅 생성 (`useUpdateProfile.ts`)**

```typescript
import { useMutation } from '@tanstack/react-query';
import { updateProfile, UpdateProfileBody } from './updateProfile';

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => updateProfile(body),
  });
};
```

- [ ] **Step 3: 빌드 오류 확인**

```bash
npm run build
```

---

## Task 3: MSW handler — PATCH /api/profile 추가

**Files:**
- Modify: `src/mocks/handlers.ts`

- [ ] **Step 1: import 추가**

`src/mocks/handlers.ts` 상단 import 목록 끝에 아래 두 줄 추가:

```typescript
import { updateMockProfile } from './utils/updateProfile';
import { UpdateProfileBody } from '@/features/profile/api/updateProfile';
```

- [ ] **Step 2: 핸들러 추가**

`handlers` 배열 마지막 항목(사용자 등록 핸들러) 뒤에 추가:

```typescript
  // 프로필 수정
  http.patch(`${baseUrl}/api/profile`, async ({ request }) => {
    const body = (await request.json()) as UpdateProfileBody;
    const updated = updateMockProfile(body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),
```

- [ ] **Step 3: 빌드 오류 확인**

```bash
npm run build
```

---

## Task 4: UI 컴포넌트 — ProfileEditLayout

**Files:**
- Create: `src/features/profile/ui/ProfileEditLayout.tsx`

- [ ] **Step 1: 컴포넌트 생성**

```tsx
'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAlert } from '@/hooks/useAlert';
import { getUserInfoAtom, setUserInfoAtom } from '@/features/auth/store/auth.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { useUpdateProfile } from '@/features/profile/api/useUpdateProfile';
import { phoneSchemaRequired } from '@/shared/utils/phone';

const profileEditSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  phone: phoneSchemaRequired(),
  company: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

export const ProfileEditLayout = () => {
  const { avatar, name, email, grade, phone, company, bio } = useAtomValue(getUserInfoAtom);
  const setUserInfo = useSetAtom(setUserInfoAtom);
  const router = useRouter();
  const { showAlert } = useAlert();
  const { mutate, isPending } = useUpdateProfile();
  const gradeLabel = USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: { name, phone, company: company || '', bio: bio || '' },
  });

  const onSubmit = (data: ProfileEditFormData) => {
    mutate(
      { email, ...data },
      {
        onSuccess: (updated) => {
          setUserInfo(updated);
          showAlert({
            type: 'success',
            message: '저장되었습니다.',
            onConfirm: () => router.back(),
          });
        },
        onError: () => {
          showAlert({ type: 'error', message: '저장에 실패했습니다.' });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">프로필 수정</h1>
        <p className="text-muted-foreground">기본 정보를 수정하세요.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-[3px] rounded-full bg-primary" />
              <CardTitle className="text-sm">프로필 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="text-lg">{name.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{email}</p>
                <Badge variant="secondary">{gradeLabel}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" {...register('name')} placeholder="이름을 입력하세요." />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">연락처 *</Label>
                <Input id="phone" type="tel" {...register('phone')} placeholder="연락처를 입력하세요. (예: 010-1234-5678)" />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">소속</Label>
                <Input id="company" {...register('company')} placeholder="소속을 입력하세요." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">소개</Label>
                <Textarea id="bio" {...register('bio')} placeholder="간단한 소개를 입력하세요." rows={4} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
              <Button type="submit" disabled={isPending}>
                저장
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
```

- [ ] **Step 2: 빌드 오류 확인**

```bash
npm run build
```

---

## Task 5: 페이지 라우트 + 브라우저 검증

**Files:**
- Create: `src/app/(authenticated)/profile/edit/page.tsx`

- [ ] **Step 1: 페이지 파일 생성**

```tsx
import { ProfileEditLayout } from '@/features/profile/ui/ProfileEditLayout';

export default function ProfileEditPage() {
  return <ProfileEditLayout />;
}
```

- [ ] **Step 2: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 3: 브라우저 전체 플로우 검증**

1. `http://localhost:3000/login` → `admin@example.com` / `admin123` 로그인
2. 헤더 아바타 클릭 → '프로필' 메뉴 → 모달 오픈
3. '프로필 수정' 버튼 → `/profile/edit` 이동 확인
4. **레이아웃:** 상단 아바타·이메일·등급 뱃지 표시, 이름/연락처/소속/소개 초기값 확인
5. **유효성:** 이름 비움 → 저장 → "이름을 입력해주세요." 에러 확인
6. **유효성:** 연락처 "010abc" 입력 → 저장 → 형식 오류 메시지 확인
7. **저장 성공:** 이름 "테스트 수정" 변경 → 저장 → "저장되었습니다." alert → 확인 → 이전 화면 복귀
8. **Jotai 동기화:** 복귀 후 헤더에 "테스트 수정" 표시 확인
9. **취소:** `/profile/edit` 재진입 → 취소 → 이전 화면 복귀 확인

- [ ] **Step 4: 최종 빌드 확인**

```bash
npm run build
```
