import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { RunCollectionResponse } from '@/features/order/types/collection.types';
import { loadOrderActor } from '@/features/order/server/orderStore';
import { runCollection } from '@/features/order/server/orderCollection';
import { runCollectionRequestSchema } from '@/features/order/util/collectionRequest';

/** 백그라운드 작업자가 없어 한 요청이 선택한 계정을 끝까지 처리한다(Vercel Hobby 상한). */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const body = await parseRequestBody(req, runCollectionRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const results = await runCollection({
      actor: await loadOrderActor(session),
      accountIds: body.accountIds,
      startDate: body.startDate,
      endDate: body.endDate,
      now: new Date(),
      random: Math.random,
    });
    return NextResponse.json({ results } satisfies RunCollectionResponse);
  } catch (error) {
    console.error('주문 수집 실행 중 에러:', error);
    return serverErrorResponse();
  }
}
