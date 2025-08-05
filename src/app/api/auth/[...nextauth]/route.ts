// import NextAuth from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import cookie from 'cookie';
// import { cookies } from "next/headers";
//
// export const {auth, handlers: { GET, POST }, signIn} = NextAuth({
//   pages: {
//     signIn: '/(auth)/(signIn)'
//   },
//   providers: [
//     CredentialsProvider({
//       name: 'Credentials',
//       credentials: {
//         email: { label: '이메일', type: 'email', placeholder: 'ex@example.com' },
//         password: { label: '비밀번호', type: 'password' },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials.password) return null;
//
//         // 실제 api 호출로 사용자 조회
//         const authResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/signIn`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({
//             email: credentials.email,
//             password: credentials.password
//           })
//         });
//
//         const setCookie = authResponse.headers.get('Set-Cookie');
//         console.log('set-cookie', setCookie);
//
//         if (setCookie) {
//           const parsed = cookie.parse(setCookie);
//           (await cookies()).set('conect.sid', parsed['conect.sid'] ?? '', parsed);
//         }
//
//         if (!authResponse.ok) {
//           return null;
//         }
//
//         const user = await authResponse.json();
//         console.log('user', user);
//         return {
//           email: user.id,
//           name: user.nickname,
//           image: user.image,
//           ...user,
//         };
//       },
//     })
//   ],
// });