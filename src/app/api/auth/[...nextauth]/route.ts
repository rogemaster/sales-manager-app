import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import { cookies } from 'next/headers';
import * as cookie from 'cookie';

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

          return {
            id: user.id || user.email || credentials.email,
            email: user.email || credentials.email,
            name: user.nickname || user.name || user.username,
            image: user.image || user.avatar || null,
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
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.grade = user.grade;
        token.avatar = user.avatar;
        token.phone = user.phone;
        token.bio = user.bio;
        token.company = user.company;
        token.location = user.location;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.email = token.email ?? '';
      session.user.name = token.name ?? '';
      session.user.grade = token.grade;
      session.user.avatar = token.avatar;
      session.user.phone = token.phone;
      session.user.bio = token.bio;
      session.user.company = token.company;
      session.user.location = token.location;
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
