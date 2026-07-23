---
title: NextAuth에 커스텀 필드(grade, ownerId 등) 추가하기 — module augmentation 패턴
date: 2026-05-30
category: architecture-patterns
module: features/auth
problem_type: architecture_pattern
component: authentication
severity: medium
applies_when:
  - NextAuth의 기본 User/Session/JWT 타입에 없는 필드(등급, 소속, 프로필 정보 등)를 세션에서 읽어야 할 때
  - 로그인 후 클라이언트 상태(Jotai atom 등)를 세션 데이터로 초기화해야 할 때
  - 새 인증 보호 라우트 그룹을 추가할 때
symptoms:
  - session.user에 커스텀 필드가 undefined로 나온다
  - TypeScript가 session.user.grade 등 커스텀 필드 접근에서 타입 에러를 낸다
  - 로그인은 되는데 특정 페이지에 미인증 상태로도 접근이 가능하다
tags:
  - nextauth
  - module-augmentation
  - typescript
  - jotai
  - middleware
  - authentication
---

# NextAuth에 커스텀 필드(grade, ownerId 등) 추가하기 — module augmentation 패턴

## Context

이 프로젝트는 NextAuth(JWT 전략)로 인증을 처리하지만, 기본 `User`/`Session`/`JWT` 타입에는 `grade`(등급), `ownerId`(테넌트 식별자), `avatar`/`phone`/`bio`/`company`/`location`(프로필 필드) 같은 도메인 고유 필드가 없다. 이 필드들이 로그인 후 세션에서 바로 읽혀야 사이드바 메뉴 노출, 권한별 액션 제어(`gradeAtom`), 테넌트 격리(`workspaceOwnerIdAtom`)가 동작한다.

## Guidance

> **2026-07-18 업데이트:** 아래 예제의 `ownerId`는 원래 `string | null`이었으나, 실 DB에 레거시 null 데이터가 없음을 확인한 뒤 `string`으로 좁혔다. 상세 경위는 `docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md`의 "AccountUser.ownerId 타입을 non-null로 좁힘" 절 참고.

### 1. Module augmentation으로 타입 확장

`any` 캐스팅이나 세션과 별도로 API를 다시 호출하는 방식 대신, NextAuth 공식 방법인 **module augmentation**을 쓴다. `User`, `Session`, `next-auth/jwt`의 `JWT` 세 인터페이스 모두 확장해야 한다 — 하나라도 빠지면 `authorize()` → `jwt` 콜백 → `session` 콜백으로 이어지는 체인 중간에서 타입 에러가 난다.

```typescript
// src/types/next-auth.d.ts
import { UserGrade } from '@/features/auth/types/Auth';

declare module 'next-auth' {
  interface User {
    id: string;
    ownerId: string;
    grade: UserGrade;
    avatar: string;
    phone: string;
    bio: string;
    company: string;
    location: string;
  }

  interface Session {
    user: {
      id: string;
      ownerId: string;
      email: string;
      name: string;
      grade: UserGrade;
      avatar: string;
      phone: string;
      bio: string;
      company: string;
      location: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    ownerId: string;
    grade: UserGrade;
    avatar: string;
    phone: string;
    bio: string;
    company: string;
    location: string;
  }
}
```

### 2. jwt/session 콜백에서 필드를 명시적으로 복사한다

타입을 확장한 것만으로는 값이 채워지지 않는다. `authorize()`가 반환한 `user` 객체를 `jwt` 콜백에서 토큰에, `session` 콜백에서 세션에 **필드 하나하나 명시적으로 복사**해야 한다.

```typescript
// src/app/api/auth/[...nextauth]/route.ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.ownerId = user.ownerId;
      token.grade = user.grade;
      // ... 나머지 필드도 동일하게
    }
    return token;
  },
  async session({ session, token }) {
    session.user.id = token.id;
    session.user.ownerId = token.ownerId;
    session.user.grade = token.grade;
    // ... 나머지 필드도 동일하게
    return session;
  },
},
```

새 필드를 추가할 때는 **세 곳(타입 선언 3개 interface + jwt 콜백 + session 콜백)을 전부 같이 수정**해야 한다. 타입에만 추가하고 콜백에 복사를 빼먹으면 컴파일은 되지만 런타임에 `undefined`가 나온다.

### 3. 클라이언트 상태(Jotai atom) 초기화 — `useSession` + `useEffect`

세션 데이터를 클라이언트 전역 상태로 옮기는 지점은 인증된 라우트 그룹의 최상위 레이아웃이다.

```tsx
// src/app/(authenticated)/layout.tsx
'use client';
const { data: session } = useSession();
const setUserInfo = useSetAtom(setUserInfoAtom);

useEffect(() => {
  if (session?.user) {
    setUserInfo(session.user);
  }
}, [session, setUserInfo]);
```

`gradeAtom`, `workspaceOwnerIdAtom` 등은 이 `setUserInfoAtom` 호출로 채워진 유저 정보에서 파생된다. 이 레이아웃 밖(로그인 전 페이지 등)에서는 이 값들이 비어 있다는 걸 전제로 코드를 작성해야 한다.

### 4. 새 보호 라우트 그룹을 추가하면 미들웨어 matcher도 같이 추가한다

`src/middleware.ts`의 `config.matcher`는 **명시적으로 나열된 경로만** 인증 검사를 받는다. 새 최상위 라우트 그룹(`/purchase`, `/sales` 등)을 추가하고 matcher에 넣는 걸 잊으면, 그 라우트는 로그인 없이도 접근 가능한 상태로 조용히 배포된다.

```typescript
// src/middleware.ts
export const config = {
  matcher: ['/', '/home/:path*', '/products/:path*', '/order/:path*', '/account/:path*' /* 새 그룹 추가 시 여기 */],
};
```

**이 실수는 실제로 두 번 반복됐다:**
1. `/account/:path*`가 처음에 빠져 있어 사용자관리 페이지가 미인증 접근 가능했던 버그를 수정한 적이 있다(2026-05-30).
2. 그 뒤로 `shopping`, `profile` 라우트 그룹이 추가됐는데도 matcher에는 끝내 반영되지 않아, `/shopping/accounts`·`/shopping/settings`·`/profile`이 미인증 상태로도 접근 가능한 상태로 한동안 방치돼 있었다(2026-07-13 발견·수정, `curl`로 307 → `/login` 리다이렉트 확인).

**재발 방지책:** 새 라우트 그룹을 `src/app/(authenticated)/` 아래 추가하는 작업을 완료 신호로 보고할 때마다, `find "src/app/(authenticated)" -maxdepth 1 -type d`로 실제 폴더 목록을 뽑아 `src/middleware.ts`의 `matcher` 배열과 항목 수를 대조하는 걸 습관화한다. 폴더 추가 자체는 자동으로 보호되지 않는다는 게 이 프로젝트에서 이미 두 번 증명됐다.

## Why This Matters

- module augmentation은 NextAuth 공식 권장 방식이라, 향후 NextAuth 버전 업그레이드에도 안전하다. `as any` 캐스팅은 타입 안전성을 포기하는 것이고, 세션과 별도로 API 재조회하는 방식은 라운드트립을 늘린다.
- 타입 선언·jwt 콜백·session 콜백 세 곳이 항상 동기화되어야 한다는 걸 놓치면, "타입은 맞는데 값이 없는" 디버깅하기 까다로운 상태가 된다.
- 미들웨어 matcher는 "새 라우트 그룹 = 새 폴더 생성"만으로 자동 보호되지 않는다 — 이건 Next.js 미들웨어의 구조적 특성이라 매번 수동으로 챙겨야 한다.

## When to Apply

- `Auth.ts`의 `UserGrade` 등 세션에 실어야 할 새 필드가 생길 때 → 3개 interface + jwt/session 콜백 동시 수정
- `src/app/(authenticated)/` 아래 새 최상위 폴더(라우트 그룹)를 만들 때 → `src/middleware.ts`의 `matcher` 배열에 반드시 추가하고, 미인증 상태로 직접 URL 접근해 리다이렉트되는지 확인

## Related

- `src/types/next-auth.d.ts` — 타입 확장 선언
- `src/app/api/auth/[...nextauth]/route.ts` — jwt/session 콜백
- `src/app/(authenticated)/layout.tsx` — 세션 → atom 초기화
- `src/middleware.ts` — 라우트 보호 matcher
- `docs/solutions/architecture-patterns/auth-db-msw-boundary.md` — 인증 관련 API가 DB route handler로 처리되는 경계
- `docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md` — `ownerId`/`grade`가 실제로 어떻게 쓰이는지
