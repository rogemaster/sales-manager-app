import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/simulators/naver/auth';
import { toErrorResponse, toInternalErrorResponse } from '@/simulators/naver/errors';
import { listChangedProductOrders, parseProductOrderQuery } from '@/simulators/naver/orderService';
import { createNaverRepository } from '@/simulators/naver/repository';

/** 변경 시각 기준 상품주문 조회. 커서 없는 첫 요청이면 그사이 들어온 주문을 먼저 만든다(시뮬레이터 동작). */
export async function GET(req: NextRequest) {
  try {
    const repository = createNaverRepository();

    const auth = await authenticate(repository, req.headers.get('authorization'));
    if (!auth.ok) {
      const { status, body } = toErrorResponse(auth.reason, auth.invalidInputs);
      return NextResponse.json(body, { status });
    }

    const params = req.nextUrl.searchParams;
    const query = parseProductOrderQuery({
      lastChangedFrom: params.get('lastChangedFrom'),
      lastChangedTo: params.get('lastChangedTo'),
      cursor: params.get('cursor'),
    });
    if (!query.ok) {
      const { status, body } = toErrorResponse(query.reason, query.invalidInputs);
      return NextResponse.json(body, { status });
    }

    const result = await listChangedProductOrders(repository, auth.data, query.data, new Date(), Math.random);
    return NextResponse.json(result);
  } catch {
    const { status, body } = toInternalErrorResponse();
    return NextResponse.json(body, { status });
  }
}
