import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingSettings } from '@/db/schema';
import { and, desc, eq, gte, ilike, lt, or, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstDateRange } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { SHOPPING_SETTING_COLUMNS } from '@/features/shoppingSetting/util/settingColumns';
import { shoppingSettingListRequestSchema } from '@/features/shoppingSetting/util/shoppingSettingRequestSchema';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // 클라이언트가 ownerId를 보내더라도 스키마가 버린다. 소유권은 세션만 신뢰한다.
  const body = await parseRequestBody(req, shoppingSettingListRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { page, pageSize } = body;
    const { dateType, startDate, endDate, mallCode, mallAccountId, searchValue } = body.filters;

    const conditions = [eq(shoppingSettings.ownerId, session.ownerId)];

    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const dateCol = dateType === 'updatedAt' ? shoppingSettings.updatedAt : shoppingSettings.createdAt;
    conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));

    if (mallCode !== 'ALL') conditions.push(eq(shoppingSettings.mallCode, mallCode));
    if (mallAccountId !== 'ALL') conditions.push(eq(shoppingSettings.mallAccountId, mallAccountId));
    if (searchValue) {
      // 검색어는 mallId·nickname 중 하나에 걸리면 된다(OR). ilike라 대소문자를 구분하지 않는다.
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
    return serverErrorResponse();
  }
}
