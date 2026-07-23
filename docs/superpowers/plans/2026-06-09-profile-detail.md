# 프로필 상세 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 유저가 자신의 프로필 정보를 조회할 수 있는 `/profile` 상세 페이지를 구현한다.

**Architecture:** Jotai `auth.store`에 로그인 시 세팅된 atoms를 직접 읽어 표시하며 별도 API 호출 없음. `features/profile/ui/ProfileLayout.tsx`가 UI를 담당하고 `app/(authenticated)/profile/page.tsx`가 Next.js 진입점 역할을 한다.

**Tech Stack:** Next.js 15 App Router, Jotai, Tailwind CSS, shadcn/ui (Card, Avatar, Badge, Button)

---

> **사전 완료:** `src/components/layout/globalHeader/GlobalUserMenuButton.tsx` — 드롭다운 메뉴 '프로필 수정' → '프로필'로 명칭 변경 및 `/profile` 라우팅 처리 완료.

---

### Task 1: ProfileLayout 컴포넌트 구현

**Files:**
- Create: `src/features/profile/ui/ProfileLayout.tsx`

- [ ] **Step 1: 파일 생성**

`src/features/profile/ui/ProfileLayout.tsx`를 아래 내용으로 생성한다.

```tsx
'use client';

import { useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserInfoAtom } from '@/features/auth/store/auth.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-4">
    <span className="w-16 shrink-0 text-sm text-muted-foreground">{label}</span>
    <span className="text-sm">{value || '-'}</span>
  </div>
);

export const ProfileLayout = () => {
  const { avatar, name, email, grade, phone, company, bio } = useAtomValue(getUserInfoAtom);
  const router = useRouter();
  const gradeLabel = USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">프로필</h1>
        <Button onClick={() => router.push('/profile/edit')}>프로필 수정</Button>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-[3px] rounded-full bg-primary" />
            <CardTitle className="text-sm">프로필 정보</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="text-xl">{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <p className="text-base font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              <Badge variant="secondary">{gradeLabel}</Badge>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="연락처" value={phone} />
            <Field label="소속" value={company} />
            <Field label="소개" value={bio} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: 타입 확인**

`npm run lint`를 실행해 타입 오류 없는지 확인한다.

```bash
npm run lint
```

기대 결과: 오류 없음

---

### Task 2: Next.js 페이지 생성 및 동작 확인

**Files:**
- Create: `src/app/(authenticated)/profile/page.tsx`

- [ ] **Step 1: 페이지 파일 생성**

`src/app/(authenticated)/profile/page.tsx`를 아래 내용으로 생성한다.

```tsx
import { ProfileLayout } from '@/features/profile/ui/ProfileLayout';

export default function ProfilePage() {
  return <ProfileLayout />;
}
```

- [ ] **Step 2: 개발 서버에서 동작 확인**

`npm run dev`로 서버 실행 후 아래 항목을 순서대로 확인한다.

1. 헤더 우측 유저 이름 클릭 → 드롭다운에 **'프로필'** 메뉴 노출
2. '프로필' 클릭 → `/profile` 페이지로 이동
3. 아바타, 이름, 이메일, 등급 뱃지가 카드 상단에 표시
4. 연락처, 소속, 소개 필드가 카드 하단에 표시
5. 값이 없는 필드는 `-`로 표시
6. **'프로필 수정'** 버튼 클릭 → `/profile/edit` 이동 시도 (미구현 상태이므로 404 예상)
