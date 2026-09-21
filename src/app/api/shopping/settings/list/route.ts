import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingSettings } from '@/db/schema';
import { and, desc, eq, gte, ilike, lt, or, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { isYmd, toKstDateRange } from '@/shared/utils/date';
import { clampPositiveInt } from '@/shared/utils/pagination';
import { SHOPPING_SETTING_COLUMNS } from '@/features/shoppingSetting/util/settingColumns';
import { ShoppingSettingSearchType } from '@/features/shoppingSetting/types/shoppingSetting.types';

// 상한 1000은 MSW 어댑터(mocks/utils/fetchShoppingSettings.ts)가 "사실상 전체"로 보내는 값이다.
const MAX_PAGE_SIZE = 1000;
const DEFAULT_PAGE_SIZE = 10;

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    // 클라이언트가 ownerId를 보내더라도 무시한다. 소유권은 세션만 신뢰한다.
    const body = (await req.json()) as { filters: ShoppingSettingSearchType; page: number; pageSize: number };
    const { dateType, startDate, endDate, mallCode, mallAccountId, searchValue } = body.filters;

    const page = clampPositiveInt(body.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampPositiveInt(body.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // 날짜는 클램프하지 않고 거절한다 — 임의의 기본값으로 대체하면 사용자가 요청한 것과
    // 다른 기간의 결과를 정상 응답으로 돌려주게 되어 빈 목록의 원인을 추적할 수 없다.
    if (!isYmd(startDate) || !isYmd(endDate)) {
      return NextResponse.json({ error: '검색 기간이 올바르지 않습니다.' }, { status: 400 });
    }

    const conditions = [eq(shoppingSettings.ownerId, session.ownerId)];

    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const dateCol = dateType === 'updatedAt' ? shoppingSettings.updatedAt : shoppingSettings.createdAt;
    conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));

    if (mallCode !== 'ALL') conditions.push(eq(shoppingSettings.mallCode, mallCode));
    if (mallAccountId !== 'ALL') conditions.push(eq(shoppingSettings.mallAccountId, mallAccountId));
    if (searchValue) {
      // MSW의 mallId·nickname OR 검색과 같은 의미. ilike라 대소문자를 구분하지 않는다.
      const keyword = `%${searchValue}%`;
      const matched = or(ilike(shoppingSettings.mallId, keyword), ilike(shoppingSettings.nickname, keyword));
      if (matched) conditions.push(matched);
    }

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(shoppingSettings)
      .where(where);

    // ORDER BY 없이 LIMIT/OFFSET만 쓰면 행 순서가 보장되지 않아 페이지 간 중복·누락이 생긴다.
    // 시드가 한 배치에 가까운 시각을 넣어 동률이 흔하므로 id를 2차 정렬키로 둔다.
    const settings = await db
      .select(SHOPPING_SETTING_COLUMNS)
      .from(shoppingSettings)
      .where(where)
      .orderBy(desc(shoppingSettings.createdAt), desc(shoppingSettings.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({ settings, total, page, pageSize, totalPages });
  } catch (error) {
    console.error('쇼핑몰 정보설정 목록 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
