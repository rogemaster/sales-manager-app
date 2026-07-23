---
title: Separate Profile Detail Page from User Management Detail Page
date: 2026-06-09
category: docs/solutions/architecture-patterns
module: profile
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - Building admin dashboards with user management features
  - Implementing self-serve user profile screens
  - Designing screens that read from different data sources
  - Considering screen reuse with an isOwnProfile flag
tags:
  - nextjs-page-architecture
  - data-source-separation
  - jotai-atoms
  - api-vs-store
  - conditional-rendering
  - screen-composition
---

# Separate Profile Detail Page from User Management Detail Page

## Context

In this app, two screens display user information: a user's own profile (`/profile`) and an admin detail page for managing another user (`/account/user/[id]`). The natural impulse is to reuse one component with a conditional flag (`isOwnProfile`), but this creates hidden complexity that grows over time as each screen gains distinct features.

## Guidance

**Create separate routes and components for self-view profile and admin user detail.**

- **Profile page** (`/profile`): Self-view of the logged-in user
  - Data source: Jotai atoms populated at login — no API call
  - Client component reading from `getUserInfoAtom`
  - Future personal features: password change, avatar upload

- **User detail page** (`/account/user/[id]`): Admin managing another user
  - Data source: API call fetching user by ID
  - Future admin features: grade/status editing
  - Restricted to admin roles

#### ProfileLayout — reads from Jotai atoms

```tsx
'use client';

import { useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { getUserInfoAtom } from '@/features/auth/store/auth.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';

const Field = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="flex gap-4">
    <span className="w-16 shrink-0 text-sm text-muted-foreground">{label}</span>
    <span className="text-sm">{value || '-'}</span>
  </div>
);

export const ProfileLayout = () => {
  const { avatar, name, email, grade, phone, company, bio } = useAtomValue(getUserInfoAtom);
  const gradeLabel = USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;
  // AvatarFallback: guard against empty string when atoms are at initial value
  return (
    // ...
    <AvatarFallback className="text-xl">{name.charAt(0) || '?'}</AvatarFallback>
  );
};
```

#### Directory structure showing separation

```
src/app/(authenticated)/
├── profile/
│   ├── page.tsx           # Self-view — reads Jotai atoms
│   └── edit/page.tsx      # Future: personal editing
└── account/
    └── user/
        ├── page.tsx       # User management table
        ├── create/page.tsx
        └── [id]/          # Future: admin detail — API-driven
```

## Why This Matters

Separating these pages eliminates three sources of creeping complexity:

1. **Data source divergence**: Profile reads from in-memory Jotai atoms (instant, available post-login). User detail fetches from API by ID (network latency, different auth check). One component handling both requires branching loading-state logic.

2. **Feature evolution**: Personal editing (password, avatar) belongs on `/profile`. Admin controls (grade/status changes) belong on `/account/user/[id]`. A shared component with conditional UI makes every future change require understanding both code paths.

3. **Access control clarity**: Profile is accessible to any logged-in user; user detail is admin-only. Separate routes make the intent obvious in the routing layer.

## When to Apply

Use separate routes + components when two screens:
- Display similar data from **different sources** (in-memory store vs API)
- Have **different purposes** (self-view vs admin management)
- Will **evolve differently** (personal features vs admin features)
- Have **different access control** (any user vs admin-only)

Do not over-apply: if data source, purpose, and evolution are truly identical, a shared component with simple conditional UI (e.g., read-only vs edit mode for the same entity) is appropriate.

## Examples

#### Before: placeholder alert in GlobalUserMenuButton

```tsx
const handleEditProfile = () => {
  showAlert({ message: '개발 진행 중인 기능입니다.' });
};

<DropdownMenuItem onClick={handleEditProfile}>
  <span>프로필 수정</span>
</DropdownMenuItem>
```

#### After: navigate to /profile

```tsx
const handleProfile = () => {
  router.push('/profile');
};

<DropdownMenuItem onClick={handleProfile}>
  <span>프로필</span>
</DropdownMenuItem>
```

## Related

- `docs/superpowers/specs/2026-06-09-profile-detail-design.md` — authoritative design document for this feature
- `docs/solutions/conventions/typescript-type-design-patterns.md` — type design patterns for feature modules
- `src/features/auth/store/auth.store.ts` — Jotai atoms read by profile page
- `src/features/account/constant/user.constants.ts` — `USER_GRADE_OPTIONS` shared between profile and user management
