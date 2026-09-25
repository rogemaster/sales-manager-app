import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import { UserGrade } from '@/features/auth/types/Auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/db/password';
import { LOGIN_ERROR_CODE } from '@/features/auth/constant/loginError';

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

        let user: typeof users.$inferSelect | undefined;
        try {
          const result = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);
          user = result[0];
          if (!user) return null;

          const isValid = await verifyPassword(credentials.password, user.password);
          if (!isValid) return null;
        } catch (error) {
          console.error('인증 DB 조회 중 에러:', error);
          return null;
        }

        // 비밀번호가 맞은 뒤에만 판정한다 — 틀린 비밀번호로 "승인 대기 계정"인지 알아낼 수 없게.
        // try 밖에 두는 이유: 위 catch가 이 오류까지 null로 삼키면 클라이언트가 사유를 구분할 수 없다.
        if (user.status === 'pending') {
          throw new Error(LOGIN_ERROR_CODE.PENDING_APPROVAL);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          ownerId: user.ownerId as string,
          grade: user.grade as UserGrade,
          avatar: user.avatar ?? '',
          phone: user.phone,
          bio: user.bio,
          company: user.company,
          location: user.location,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    // 전용 오류 페이지가 없다. NextAuth가 ?error=코드를 붙여 로그인 화면으로 돌려보낸다.
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.ownerId = user.ownerId;
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
      session.user.id = token.id;
      session.user.ownerId = token.ownerId;
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
