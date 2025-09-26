import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import { cookies } from 'next/headers';
import cookie from 'cookie';

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: '이메일',
          type: 'email',
          placeholder: 'ex@example.com',
        },
        password: {
          label: '비밀번호',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // 실제 api 호출로 사용자 조회
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          const authResponse = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            // 타임아웃 설정 (10초)
            signal: AbortSignal.timeout(10000),
          });

          // 쿠키 처리 (오타 수정: conect.sid → connect.sid)
          const setCookie = authResponse.headers.get('Set-Cookie');
          if (setCookie) {
            const parsed = cookie.parse(setCookie);
            const cookieStore = await cookies();
            // connect.sid 쿠키 설정
            if (parsed['connect.sid']) {
              cookieStore.set('connect.sid', parsed['connect.sid'], {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              });
            }
          }

          if (!authResponse.ok) {
            console.error('인증 API 호출 실패:', authResponse.status, authResponse.statusText);
            return null;
          }

          const user = await authResponse.json();
          console.log('인증 성공:', user);

          // 사용자 데이터 매핑 수정
          return {
            id: user.id || user.userId, // id 필드가 없을 경우 userId 사용
            email: user.email || credentials.email,
            name: user.nickname || user.name || user.username,
            image: user.image || user.avatar || null,
            // 추가 사용자 정보
            ...user,
          };
        } catch (error) {
          console.error('인증 API 호출 중 에러:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // 사용자 정보를 토큰에 저장
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // 타입 정의에 따라 세션 구성
        session.user.id = token.userId;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
