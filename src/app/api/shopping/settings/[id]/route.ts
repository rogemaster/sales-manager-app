import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingSettings } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession, requirePermission } from '@/shared/utils/apiAuth';
import { objectBodySchema, parseRequestBody } from '@/shared/utils/requestBody';
import { SHOPPING_SETTING_COLUMNS } from '@/features/shoppingSetting/util/settingColumns';
import {
  findShoppingSettingWriteViolation,
  SETTING_NOT_FOUND_MESSAGE,
} from '@/features/shoppingSetting/util/shoppingSettingWriteSchema';
import { sanitizeMallSettings } from '@/features/shoppingSetting/util/sanitizeMallSettings';
import { pickMallAddress } from '@/features/shoppingSetting/util/pickMallAddress';
import { ShoppingMalls } from '@/types/common.type';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  try {
    // 남의 것과 없는 것을 같은 404로 답한다 — 구분하면 남의 id를 탐색하는 도구가 된다.
    const [setting] = await db
      .select(SHOPPING_SETTING_COLUMNS)
      .from(shoppingSettings)
      .where(and(eq(shoppingSettings.id, id), eq(shoppingSettings.ownerId, session.ownerId)))
      .limit(1);

    if (!setting) return NextResponse.json({ error: SETTING_NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('쇼핑몰 정보설정 조회 중 에러:', error);
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await requirePermission(req, 'shoppingSetting.update');
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const body = await parseRequestBody(req, objectBodySchema());
  if (body instanceof NextResponse) return body;

  try {
    // 보낸 필드만, 그리고 허용된 필드만 바꾼다. id·ownerId·createdAt·mallAccountId·mallCode·mallId는
    // 이 목록에 없으므로 요청에 섞여 와도 반영되지 않는다.
    // mallAccountId가 불변인 이유: 설정은 생성 시점에 고른 계정에 묶여 있고, 계정이 바뀌면 그건
    // 같은 설정의 수정이 아니라 다른 설정이다(연동상품의 쇼핑몰·계정 불변과 같은 논리).
    const values: Record<string, unknown> = {};
    [
      'nickname',
      'isActive',
      'productCondition',
      'salesPeriod',
      'deliveryCompany',
      'shippingAddress',
      'returnAddress',
    ].forEach((key) => {
      if (key in body) values[key] = body[key];
    });

    const violation = findShoppingSettingWriteViolation(values, 'partial');
    if (violation) return NextResponse.json({ error: violation }, { status: 400 });

    // 몰 고유 설정은 그 설정의 mallCode 기준으로 추린다. 먼저 읽어야 어느 몰인지 안다.
    const [existing] = await db
      .select({ mallCode: shoppingSettings.mallCode })
      .from(shoppingSettings)
      .where(and(eq(shoppingSettings.id, id), eq(shoppingSettings.ownerId, session.ownerId)))
      .limit(1);

    if (!existing) return NextResponse.json({ error: SETTING_NOT_FOUND_MESSAGE }, { status: 404 });

    if ('mallSettings' in body) {
      values.mallSettings = sanitizeMallSettings(existing.mallCode as ShoppingMalls, body.mallSettings);
    }

    if ('nickname' in values) values.nickname = String(values.nickname).trim();
    if ('productCondition' in values) values.productCondition = String(values.productCondition);
    if ('salesPeriod' in values) values.salesPeriod = Number(values.salesPeriod);
    if ('deliveryCompany' in values) values.deliveryCompany = String(values.deliveryCompany);
    if ('shippingAddress' in values) values.shippingAddress = pickMallAddress(values.shippingAddress);
    if ('returnAddress' in values) values.returnAddress = pickMallAddress(values.returnAddress);

    const [updated] = await db
      .update(shoppingSettings)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(shoppingSettings.id, id), eq(shoppingSettings.ownerId, session.ownerId)))
      .returning(SHOPPING_SETTING_COLUMNS);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('쇼핑몰 정보설정 수정 중 에러:', error);
    return serverErrorResponse();
  }
}
