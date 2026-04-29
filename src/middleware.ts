import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (pathname === '/') {
    const destination = token ? '/home' : '/login';
    return NextResponse.redirect(new URL(destination, request.url));
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
