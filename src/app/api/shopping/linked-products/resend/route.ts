import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/shared/utils/apiAuth';
import {
  MALL_LINK_SEND_LIMIT_MESSAGE,
  MALL_LINK_SEND_MAX_ITEMS,
} from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { resendLinkedProducts } from '@/features/mallLinkedProduct/server/linkedProductSend';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { ids } = (await req.json()) as { ids?: string[] };
    if (!Array.isArray(ids)) return NextResponse.json({ error: '재전송 대상이 올바르지 않습니다.' }, { status: 400 });
    if (ids.length > MALL_LINK_SEND_MAX_ITEMS)
      return NextResponse.json({ error: MALL_LINK_SEND_LIMIT_MESSAGE }, { status: 400 });

    return NextResponse.json(await resendLinkedProducts({ ownerId: session.ownerId, email: session.email }, ids));
  } catch (error) {
    console.error('쇼핑몰 연동 재전송 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
