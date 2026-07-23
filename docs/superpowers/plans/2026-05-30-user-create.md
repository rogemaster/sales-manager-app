# 사용자 등록 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 새 사용자를 등록하는 `/account/user/create` 페이지 구현. 슈퍼관리자는 즉시 활성화(`active`), 일반관리자는 승인 대기(`pending`) 상태로 등록.

**Architecture:** `ProductCreateLayout` 패턴을 따라 `FormProvider` 기반의 Layout + Form 컴포넌트 분리. `gradeAtom`으로 로그인 사용자의 등급을 읽어 버튼 텍스트 / API status / alert 메시지를 분기한다. MSW 핸들러와 util을 추가해 mock API를 지원한다.

**Tech Stack:** Next.js 15 App Router, React Hook Form + `zodResolver`, TanStack Query, Jotai, MSW, shadcn/ui (`FilterSelect`, `Card`, `Input`, `Textarea`, `Label`, `Button`)

---

## 파일 맵

| 파일 | 작업 | 역할 |
|---|---|---|
| `src/features/account/types/user.types.ts` | 수정 | `AccountUser`에 `status` 추가, `CreateUserBody` 추가 |
| `src/mocks/data/MockUsersData.ts` | 수정 | 기존 사용자 7건에 `status: 'active'` 추가 |
| `src/mocks/utils/createUser.ts` | 생성 | mock 사용자 생성 비즈니스 로직 |
| `src/mocks/handlers.ts` | 수정 | `POST /api/account/users/create` 핸들러 추가 |
| `src/features/account/api/createUser.ts` | 생성 | fetch 함수 |
| `src/features/account/api/useCreateUser.ts` | 생성 | TanStack Query mutation 훅 |
| `src/features/account/ui/user/create/UserCreateForm.tsx` | 생성 | Zod 스키마 + 폼 필드 렌더링 |
| `src/features/account/ui/user/create/UserCreateLayout.tsx` | 생성 | grade 분기, FormProvider, submit, alert |
| `src/app/(authenticated)/account/user/create/page.tsx` | 생성 | Next.js 페이지 |

---

### Task 1: 타입 변경 및 기존 Mock 데이터 업데이트

**Files:**
- Modify: `src/features/account/types/user.types.ts`
- Modify: `src/mocks/data/MockUsersData.ts`

- [ ] **Step 1: `user.types.ts` 수정**

`src/features/account/types/user.types.ts` 전체를 아래로 교체:

```typescript
import { User, UserGrade } from '@/features/auth/types/Auth';

export interface AccountUser extends User {
  id: string;
  status: 'active' | 'pending';
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

export interface UserSearchType {
  dateType: string;
  startDate: string;
  endDate: string;
  grade: UserGrade | 'ALL';
  searchType: string;
  searchValue: string;
}

export interface GetUsersResponse {
  users: AccountUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

- [ ] **Step 2: `MockUsersData.ts` 수정 — 기존 7개 항목 전체에 `status: 'active'` 추가**

`type MockUserData = AccountUser & { password: string }` 타입이 `status`를 요구하므로, 기존 항목에 추가하지 않으면 TypeScript 오류 발생. 7개 항목 모두 `id` 바로 아래에 `status: 'active'` 추가:

```typescript
// 예시 — 모든 7개 항목에 동일하게 적용
{
  id: 'usr_001',
  status: 'active',   // ← 추가
  email: 'admin@example.com',
  // ... 나머지 필드 유지
},
```

- [ ] **Step 3: TypeScript 오류 없는지 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 출력 없음

---

### Task 2: MSW createUser util + 핸들러 추가

**Files:**
- Create: `src/mocks/utils/createUser.ts`
- Modify: `src/mocks/handlers.ts`

- [ ] **Step 1: `src/mocks/utils/createUser.ts` 생성**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { AccountUser, CreateUserBody } from '@/features/account/types/user.types';
import { MOCK_USERS_DATA } from '../data/MockUsersData';

export const createMockUser = (body: CreateUserBody): AccountUser => {
  const now = new Date().toISOString().split('T')[0];
  const newUser = {
    id: `usr_${uuidv4()}`,
    email: body.email,
    password: body.password,
    name: body.name,
    avatar: body.avatar ?? '',
    phone: body.phone,
    bio: body.bio ?? '',
    company: '',
    location: '',
    grade: body.grade,
    status: body.status,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_USERS_DATA.push(newUser);
  const { password: _, ...user } = newUser;
  return user;
};
```

- [ ] **Step 2: `src/mocks/handlers.ts` 수정 — import 추가**

파일 상단 import 블록에 두 줄 추가:

```typescript
import { createMockUser } from './utils/createUser';
import { CreateUserBody } from '@/features/account/types/user.types';
```

- [ ] **Step 3: `src/mocks/handlers.ts` 수정 — 핸들러 추가**

기존 `// 사용자 일괄 삭제` 핸들러 바로 아래에 추가:

```typescript
// 사용자 등록
http.post(`${baseUrl}/api/account/users/create`, async ({ request }) => {
  const body = (await request.json()) as CreateUserBody;
  const newUser = createMockUser(body);
  return HttpResponse.json(newUser, { status: 201 });
}),
```

---

### Task 3: API 함수 + TanStack Query 훅

**Files:**
- Create: `src/features/account/api/createUser.ts`
- Create: `src/features/account/api/useCreateUser.ts`

- [ ] **Step 1: `src/features/account/api/createUser.ts` 생성**

```typescript
import { AccountUser, CreateUserBody } from '../types/user.types';

export const createUser = async (body: CreateUserBody): Promise<AccountUser> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('사용자 등록에 실패했습니다.');
  return response.json();
};
```

- [ ] **Step 2: `src/features/account/api/useCreateUser.ts` 생성**

```typescript
import { useMutation } from '@tanstack/react-query';
import { CreateUserBody } from '../types/user.types';
import { createUser } from './createUser';

export const useCreateUser = () => {
  return useMutation({
    mutationFn: (body: CreateUserBody) => createUser(body),
  });
};
```

---

### Task 4: UserCreateForm 컴포넌트

**Files:**
- Create: `src/features/account/ui/user/create/UserCreateForm.tsx`

- [ ] **Step 1: `UserCreateForm.tsx` 생성**

패턴: `useFormContext` + `register` + `Controller` + `FilterSelect` (기존 ProductBasicInfo와 동일)

```tsx
'use client';

import { z } from 'zod';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { FilterOption } from '@/types/common.type';

export const createUserSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
  grade: z.enum(['super_admin', 'admin', 'operator'], { message: '등급을 선택해주세요.' }),
  name: z.string().min(1, '이름을 입력해주세요.'),
  phone: z.string().min(1, '연락처를 입력해주세요.'),
  avatar: z.string().optional(),
  bio: z.string().optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

interface UserCreateFormProps {
  gradeOptions: FilterOption[];
}

export const UserCreateForm = ({ gradeOptions }: UserCreateFormProps) => {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<CreateUserFormData>();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setValue('avatar', reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>필수 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 *</Label>
            <Input id="email" type="email" {...register('email')} placeholder="이메일을 입력하세요." />
            {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 *</Label>
            <Input id="password" type="password" {...register('password')} placeholder="임시 비밀번호를 입력하세요." />
            {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
          </div>

          <Controller
            name="grade"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <FilterSelect
                  label="사용자 등급 *"
                  divClassName="space-y-2"
                  triggerClassName="w-full"
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  options={gradeOptions}
                  placeholder="등급을 선택하세요."
                />
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input id="name" type="text" {...register('name')} placeholder="이름을 입력하세요." />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">연락처 *</Label>
            <Input id="phone" type="tel" {...register('phone')} placeholder="연락처를 입력하세요." />
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>선택 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="avatar">프로필 사진</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">소개</Label>
            <Textarea id="bio" {...register('bio')} placeholder="간단한 소개를 입력하세요." rows={4} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### Task 5: UserCreateLayout 컴포넌트

**Files:**
- Create: `src/features/account/ui/user/create/UserCreateLayout.tsx`

- [ ] **Step 1: `UserCreateLayout.tsx` 생성**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { gradeAtom } from '@/features/auth/store/auth.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { CreateUserBody } from '@/features/account/types/user.types';
import { useCreateUser } from '@/features/account/api/useCreateUser';
import { UserCreateForm, CreateUserFormData, createUserSchema } from './UserCreateForm';

export const UserCreateLayout = () => {
  const grade = useAtomValue(gradeAtom);
  const router = useRouter();
  const { showAlert } = useAlert();
  const { mutate, isPending } = useCreateUser();

  const isSuperAdmin = grade === 'super_admin';
  const gradeOptions = isSuperAdmin
    ? USER_GRADE_OPTIONS
    : USER_GRADE_OPTIONS.filter((o) => o.id !== 'super_admin');

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', password: '', name: '', phone: '', bio: '', avatar: '' },
  });

  const onSubmit = (data: CreateUserFormData) => {
    const body: CreateUserBody = { ...data, status: isSuperAdmin ? 'active' : 'pending' };
    mutate(body, {
      onSuccess: () => {
        showAlert({
          type: 'success',
          message: isSuperAdmin
            ? '사용자가 등록되었습니다.'
            : '등록 요청이 완료되었습니다. 슈퍼관리자 승인 후 활성화됩니다.',
          onConfirm: () => router.push('/account/user'),
        });
      },
      onError: () => {
        showAlert({ type: 'error', message: '사용자 등록에 실패했습니다.' });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">사용자 등록</h1>
        <p className="text-muted-foreground">새로운 사용자를 등록하세요.</p>
      </div>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <UserCreateForm gradeOptions={gradeOptions} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/account/user')}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isSuperAdmin ? '등록' : '등록요청'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
```

---

### Task 6: Next.js 페이지 생성

**Files:**
- Create: `src/app/(authenticated)/account/user/create/page.tsx`

- [ ] **Step 1: `page.tsx` 생성**

```tsx
import { UserCreateLayout } from '@/features/account/ui/user/create/UserCreateLayout';

export default function UserCreatePage() {
  return <UserCreateLayout />;
}
```

---

### Task 7: 수동 검증

- [ ] **Step 1: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 2: super_admin으로 로그인 후 동작 확인**

  계정: `admin@example.com` / `admin123`

  - `/account/user` → 사용자 등록 버튼 클릭 → `/account/user/create` 이동 확인
  - 폼 제출 없이 등록 버튼 클릭 → 필수 필드 유효성 오류 메시지 표시 확인
  - 등급 Select에 슈퍼관리자/일반관리자/운영자 3개 모두 표시 확인
  - 버튼 텍스트 **"등록"** 확인
  - 모든 필드 입력 후 제출 → **"사용자가 등록되었습니다."** alert → 확인 클릭 → `/account/user` 이동 확인
  - 사용자 목록에 새 사용자 표시 확인

- [ ] **Step 3: admin으로 로그인 후 동작 확인**

  계정: `user@example.com` / `user123`

  - 등급 Select에 **슈퍼관리자 없음** 확인 (일반관리자, 운영자만 표시)
  - 버튼 텍스트 **"등록요청"** 확인
  - 폼 제출 → **"등록 요청이 완료되었습니다. 슈퍼관리자 승인 후 활성화됩니다."** alert 확인
  - 취소 버튼 클릭 → `/account/user` 이동 확인 (확인 없이 즉시 이동)
