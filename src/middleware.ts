import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (url.pathname === '/') {
    url.pathname = '/login';
    return NextResponse.rewrite(url);
  }
}