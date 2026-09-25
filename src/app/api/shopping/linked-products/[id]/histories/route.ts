import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { mallLinkedProductHistories } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    // owner_id로 거른다. 남의 연동 id면 빈 목록이다 — 존재 여부를 드러내지 않는다.
    const histories = await db
      .select({
        id: mallLinkedProductHistories.id,
        linkedProductId: mallLinkedProductHistories.linkedProductId,
        action: mallLinkedProductHistories.action,
        status: mallLinkedProductHistories.status,
        externalProductId: mallLinkedProductHistories.externalProductId,
        errorMessage: mallLinkedProductHistories.errorMessage,
        source: mallLinkedProductHistories.source,
        sentByEmail: mallLinkedProductHistories.sentByEmail,
        sentAt: mallLinkedProductHistories.sentAt,
      })
      .from(mallLinkedProductHistories)
      .where(
        and(
          eq(mallLinkedProductHistories.linkedProductId, id),
          eq(mallLinkedProductHistories.ownerId, session.ownerId),
        ),
      )
      .orderBy(desc(mallLinkedProductHistories.sentAt), desc(mallLinkedProductHistories.id));

    return NextResponse.json(histories);
  } catch (error) {
    console.error('전송 이력 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
