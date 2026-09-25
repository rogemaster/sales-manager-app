import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, desc, eq, gte, ilike, lt, or, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { isYmd, toKstDateRange } from '@/shared/utils/date';
import { clampPositiveInt } from '@/shared/utils/pagination';
import { SHOPPING_ACCOUNT_PUBLIC_COLUMNS } from '@/features/shoppingAccount/util/accountColumns';
import { ShoppingAccountSearchType } from '@/features/shoppingAccount/types/shoppingAccount.types';

// 상한 1000은 화면 페이지네이션이 쓰는 값의 100배로, 필터 없이 "사실상 전체"를 한 번에 요청하는
// 호출을 허용하면서도 무제한 조회는 막기 위한 값이다.
const MAX_PAGE_SIZE = 1000;
const DEFAULT_PAGE_SIZE = 10;

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    // 클라이언트가 ownerId를 보내더라도 무시한다. 소유권은 세션만 신뢰한다.
    const body = (await req.json()) as { filters: ShoppingAccountSearchType; page: number; pageSize: number };
    const { dateType, startDate, endDate, isActive, mallCode, searchValue } = body.filters;

    const page = clampPositiveInt(body.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampPositiveInt(body.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // 날짜는 클램프하지 않고 거절한다 — 임의의 기본값으로 대체하면 사용자가 요청한 것과
    // 다른 기간의 결과를 정상 응답으로 돌려주게 되어 빈 목록의 원인을 추적할 수 없다.
    if (!isYmd(startDate) || !isYmd(endDate)) {
      return NextResponse.json({ error: '검색 기간이 올바르지 않습니다.' }, { status: 400 });
    }

    const conditions = [eq(shoppingAccounts.ownerId, session.ownerId)];

    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const dateCol = dateType === 'updatedAt' ? shoppingAccounts.updatedAt : shoppingAccounts.createdAt;
    conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));

    if (isActive !== 'ALL') conditions.push(eq(shoppingAccounts.isActive, isActive === 'true'));
    if (mallCode !== 'ALL') conditions.push(eq(shoppingAccounts.mallCode, mallCode));
    if (searchValue) {
      // 검색어는 mallId·nickname 중 하나에 걸리면 된다(OR). ilike라 대소문자를 구분하지 않는다.
      const keyword = `%${searchValue}%`;
      const matched = or(ilike(shoppingAccounts.mallId, keyword), ilike(shoppingAccounts.nickname, keyword));
      if (matched) conditions.push(matched);
    }

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(shoppingAccounts)
      .where(where);

    // ORDER BY 없이 LIMIT/OFFSET만 쓰면 행 순서가 보장되지 않아 페이지 간 중복·누락이 생긴다.
    // 시드가 한 배치에 가까운 시각을 넣어 동률이 흔하므로 id를 2차 정렬키로 둔다.
    const accounts = await db
      .select(SHOPPING_ACCOUNT_PUBLIC_COLUMNS)
      .from(shoppingAccounts)
      .where(where)
      .orderBy(desc(shoppingAccounts.createdAt), desc(shoppingAccounts.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({ accounts, total, page, pageSize, totalPages });
  } catch (error) {
    console.error('쇼핑몰 계정 목록 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
