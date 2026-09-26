import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { shoppingAccountsByMallRequestSchema } from '@/features/shoppingAccount/util/shoppingAccountRequestSchema';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const body = await parseRequestBody(req, shoppingAccountsByMallRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { mallCode } = body;

    // 목록(list)과 조건이 다르다 — 여기는 "지금 보낼 수 있는 계정"이라 활성 계정만 돌려준다.
    const accounts = await db
      .select({
        id: shoppingAccounts.id,
        mallCode: shoppingAccounts.mallCode,
        mallId: shoppingAccounts.mallId,
      })
      .from(shoppingAccounts)
      .where(
        and(
          eq(shoppingAccounts.ownerId, session.ownerId),
          eq(shoppingAccounts.mallCode, mallCode),
          eq(shoppingAccounts.isActive, true),
        ),
      );

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('몰별 쇼핑몰 계정 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
