import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { mallLinkedProductResendRequestSchema } from '@/features/mallLinkedProduct/util/mallLinkedProductRequestSchema';
import { resendLinkedProducts } from '@/features/mallLinkedProduct/server/linkedProductSend';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // 건수 상한도 스키마가 본다.
  const body = await parseRequestBody(req, mallLinkedProductResendRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    return NextResponse.json(await resendLinkedProducts({ ownerId: session.ownerId, email: session.email }, body.ids));
  } catch (error) {
    console.error('쇼핑몰 연동 재전송 중 에러:', error);
    return serverErrorResponse();
  }
}
