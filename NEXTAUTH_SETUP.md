# NextAuth.js 이메일/패스워드 인증 설정 가이드 (방법 1: 타입 정의 파일 사용)

## 구현된 기능

### 1. NextAuth.js 설정

- **파일**: `src/app/api/auth/[...nextauth]/route.ts`
- Credentials Provider를 사용한 이메일/패스워드 인증
- JWT 세션 전략 사용
- 사용자 정의 콜백 함수로 세션 및 JWT 관리

### 2. 타입 정의

- **파일**: `src/types/next-auth.d.ts`
- NextAuth 타입 확장으로 타입 안전성 확보
- Session, User, JWT 인터페이스 정의

### 3. 인증 로직

- **파일**: `src/features/auth/hook/useAuthForm.ts`
- NextAuth의 `signIn` 함수를 사용한 로그인 처리
- 폼 유효성 검사 및 에러 처리
- 로그인 성공 시 홈 페이지로 리다이렉트

### 4. 보호된 라우트

- **파일**: `src/components/auth/ProtectedRoute.tsx`
- 인증되지 않은 사용자를 로그인 페이지로 리다이렉트
- 로딩 상태 처리

### 5. 세션 관리

- **파일**: `src/components/auth/LogoutButton.tsx`
- 현재 사용자 정보 표시
- 로그아웃 기능

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# NextAuth.js 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## 테스트 계정

현재 설정된 테스트 계정:

1. **관리자 계정**
   - 이메일: `admin@example.com`
   - 비밀번호: `password123`

2. **일반 사용자 계정**
   - 이메일: `user@example.com`
   - 비밀번호: `password123`

## 사용법

### 1. 로그인

- `/sign-in` 페이지에서 이메일과 비밀번호를 입력
- 유효한 계정으로 로그인하면 `/home` 페이지로 리다이렉트

### 2. 세션 확인

```tsx
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>로딩 중...</p>;
  if (status === 'unauthenticated') return <p>로그인이 필요합니다.</p>;

  return (
    <div>
      <p>안녕하세요, {session?.user?.name}님!</p>
      <p>사용자 ID: {session?.user?.id}</p>
      <p>이메일: {session?.user?.email}</p>
    </div>
  );
}
```

### 3. 로그아웃

```tsx
import { signOut } from 'next-auth/react';

function LogoutButton() {
  return <button onClick={() => signOut({ callbackUrl: '/sign-in' })}>로그아웃</button>;
}
```

### 4. 보호된 페이지

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function ProtectedPage() {
  return (
    <ProtectedRoute>
      <div>인증된 사용자만 볼 수 있는 내용</div>
    </ProtectedRoute>
  );
}
```

## 주요 파일 구조

```
src/
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth 설정
│   ├── (authenticated)/home/page.tsx    # 보호된 홈 페이지
│   └── layout.tsx                       # SessionProvider 설정
├── components/
│   ├── auth/
│   │   ├── LogoutButton.tsx            # 로그아웃 버튼
│   │   ├── ProtectedRoute.tsx          # 보호된 라우트
│   │   └── UserProfile.tsx             # 사용자 프로필 컴포넌트
│   └── providers/
│       └── SessionProvider.tsx         # NextAuth Provider
├── features/auth/
│   ├── hook/useAuthForm.ts             # 로그인 폼 훅
│   └── ui/login/LoginForm.tsx          # 로그인 폼 컴포넌트
└── types/
    └── next-auth.d.ts                  # NextAuth 타입 정의
```

## 확장 가능한 기능

1. **데이터베이스 연동**: 현재는 메모리 배열을 사용하지만, 실제 데이터베이스와 연동 가능
2. **비밀번호 해싱**: bcrypt 등을 사용한 비밀번호 암호화
3. **소셜 로그인**: Google, GitHub 등 소셜 프로바이더 추가
4. **이메일 인증**: 회원가입 시 이메일 인증 기능
5. **비밀번호 재설정**: 비밀번호 찾기/재설정 기능

## 보안 고려사항

1. **환경 변수**: `NEXTAUTH_SECRET`은 반드시 안전한 랜덤 문자열로 설정
2. **HTTPS**: 프로덕션 환경에서는 HTTPS 사용 필수
3. **비밀번호 해싱**: 실제 운영 시에는 bcrypt 등으로 비밀번호 해싱
4. **CSRF 보호**: NextAuth.js는 기본적으로 CSRF 보호 제공
