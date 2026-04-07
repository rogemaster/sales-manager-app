import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (url.pathname === '/') {
    url.pathname = '/login';
    return NextResponse.rewrite(url);
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// 인증된 사용자만 접근 가능한 경로
export const config = {
  matcher: ['/', '/home/:path*', '/products/:path*', '/order/:path*'],
};
