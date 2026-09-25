import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/shared/utils/apiAuth';
import { MallLinkedProductRequestItem } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import {
  MALL_LINK_SEND_LIMIT_MESSAGE,
  MALL_LINK_SEND_MAX_ITEMS,
} from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { sendNewLinkedProducts } from '@/features/mallLinkedProduct/server/linkedProductSend';

// route 파일은 Next가 허용하는 export만 가져야 하므로 export하지 않는다.

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    // ownerId·createdByEmail은 세션에서 얻는다. 요청에 섞여 와도 읽지 않는다.
    const { items } = (await req.json()) as { items?: MallLinkedProductRequestItem[] };
    if (!Array.isArray(items)) return NextResponse.json({ error: '전송 대상이 올바르지 않습니다.' }, { status: 400 });
    if (items.length > MALL_LINK_SEND_MAX_ITEMS) {
      return NextResponse.json({ error: MALL_LINK_SEND_LIMIT_MESSAGE }, { status: 400 });
    }

    const result = await sendNewLinkedProducts({ ownerId: session.ownerId, email: session.email }, items);
    return NextResponse.json(result);
  } catch (error) {
    console.error('쇼핑몰 연동 전송 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
