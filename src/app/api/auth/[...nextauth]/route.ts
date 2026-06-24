import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import { UserGrade } from '@/features/auth/types/Auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/db/password';

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
          const result = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);
          const user = result[0];
          if (!user) return null;

          const isValid = await verifyPassword(credentials.password, user.password);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            ownerId: user.ownerId,
            grade: user.grade as UserGrade,
            avatar: user.avatar ?? '',
            phone: user.phone,
            bio: user.bio,
            company: user.company,
            location: user.location,
          };
        } catch (error) {
          console.error('인증 DB 조회 중 에러:', error);
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
