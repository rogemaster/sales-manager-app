import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/simulators/naver/auth';
import { toErrorResponse, toInternalErrorResponse } from '@/simulators/naver/errors';
import { registerProduct } from '@/simulators/naver/productService';
import { createNaverRepository } from '@/simulators/naver/repository';

export async function POST(req: NextRequest) {
  try {
    const repository = createNaverRepository();

    const auth = await authenticate(repository, req.headers.get('authorization'));
    if (!auth.ok) {
      const { status, body } = toErrorResponse(auth.reason, auth.invalidInputs);
      return NextResponse.json(body, { status });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      // 본문이 JSON이 아니면 클라이언트 잘못이다 — 바깥 catch로 흘리면 500이 된다.
      const { status, body: errorBody } = toErrorResponse('INVALID', [
        { name: '', type: 'TYPE', message: '요청 본문이 JSON이 아닙니다.' },
      ]);
      return NextResponse.json(errorBody, { status });
    }

    const result = await registerProduct(repository, auth.data, body);
    if (!result.ok) {
      const { status, body } = toErrorResponse(result.reason, result.invalidInputs);
      return NextResponse.json(body, { status });
    }

    return NextResponse.json(result.data);
  } catch {
    const { status, body } = toInternalErrorResponse();
    return NextResponse.json(body, { status });
  }
}
