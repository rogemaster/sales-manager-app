import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { mallLinkedProductSendRequestSchema } from '@/features/mallLinkedProduct/util/mallLinkedProductRequestSchema';
import { sendNewLinkedProducts } from '@/features/mallLinkedProduct/server/linkedProductSend';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // ownerId·createdByEmail은 세션에서 얻는다. 요청에 섞여 와도 스키마가 버린다. 건수 상한도 스키마가 본다.
  const body = await parseRequestBody(req, mallLinkedProductSendRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const result = await sendNewLinkedProducts({ ownerId: session.ownerId, email: session.email }, body.items);
    return NextResponse.json(result);
  } catch (error) {
    console.error('쇼핑몰 연동 전송 중 에러:', error);
    return serverErrorResponse();
  }
}
