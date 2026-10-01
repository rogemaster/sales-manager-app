import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/simulators/naver/auth';
import { toErrorResponse, toInternalErrorResponse } from '@/simulators/naver/errors';
import { confirmProductOrders, parseConfirmRequest } from '@/simulators/naver/orderService';
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

    const request = parseConfirmRequest(body);
    if (!request.ok) {
      const { status, body: errorBody } = toErrorResponse(request.reason, request.invalidInputs);
      return NextResponse.json(errorBody, { status });
    }

    return NextResponse.json(await confirmProductOrders(repository, auth.data, request.data, new Date()));
  } catch {
    const { status, body } = toInternalErrorResponse();
    return NextResponse.json(body, { status });
  }
}
