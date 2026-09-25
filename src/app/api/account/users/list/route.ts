import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, gte, lte, ilike, and, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { toPublicUser } from '@/features/account/util/publicUser';
import { userListRequestSchema } from '@/features/account/util/userListRequestSchema';

export async function POST(req: NextRequest) {
  // 사용자 목록 조회는 모든 등급에 허용한다(정책표 — 조회는 전 등급). 워크스페이스 필터는 아래에서 건다.
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const body = await parseRequestBody(req, userListRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { filters, page, pageSize } = body;
    const { dateType, startDate, endDate, grade, searchType, searchValue } = filters;

    const conditions = [eq(users.ownerId, session.ownerId)];

    if (dateType === 'createdAt') {
      conditions.push(gte(users.createdAt, startDate));
      conditions.push(lte(users.createdAt, endDate));
    } else {
      conditions.push(gte(users.updatedAt, startDate));
      conditions.push(lte(users.updatedAt, endDate));
    }

    if (grade !== 'ALL') {
      conditions.push(eq(users.grade, grade));
    }

    if (searchValue) {
      if (searchType === 'email') {
        conditions.push(ilike(users.email, `%${searchValue}%`));
      } else {
        conditions.push(ilike(users.name, `%${searchValue}%`));
      }
    }

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(where);

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const result = rows.map(toPublicUser);
    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({ users: result, total, page, pageSize, totalPages });
  } catch (error) {
    console.error('사용자 목록 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
