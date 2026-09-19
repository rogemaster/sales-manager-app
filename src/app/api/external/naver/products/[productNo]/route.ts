import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/simulators/naver/auth';
import { toErrorResponse, toInternalErrorResponse } from '@/simulators/naver/errors';
import { updateProduct } from '@/simulators/naver/productService';
import { createNaverRepository } from '@/simulators/naver/repository';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ productNo: string }> }) {
  try {
    const repository = createNaverRepository();

    const auth = await authenticate(repository, req.headers.get('authorization'));
    if (!auth.ok) {
      const { status, body } = toErrorResponse(auth.reason, auth.invalidInputs);
      return NextResponse.json(body, { status });
    }

    const { productNo } = await params;
    const parsed = Number(productNo);
    // 숫자로 된 문자열만 통과시킨다. 빈 문자열은 Number('')===0이라 isInteger를 통과하고,
    // 초대형 수는 반올림으로 통과해 bigint 쿼리에서 터진다 — 둘 다 여기서 막는다.
    if (!/^\d+$/.test(productNo) || !Number.isSafeInteger(parsed)) {
      const { status, body } = toErrorResponse('NOT_FOUND');
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

    const result = await updateProduct(repository, auth.data, parsed, body);
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
