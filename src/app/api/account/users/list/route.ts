import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, gte, lte, ilike, and, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { ownerId, filters, page, pageSize } = await req.json();
    const { dateType, startDate, endDate, grade, searchType, searchValue } = filters;

    const conditions = [eq(users.ownerId, ownerId)];

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

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users).where(where);

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = rows.map(({ password: _, ...user }) => user);
    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({ users: result, total, page, pageSize, totalPages });
  } catch (error) {
    console.error('사용자 목록 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
