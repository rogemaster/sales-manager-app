import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { shoppingAccounts, shoppingSettings } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requirePermission } from '@/shared/utils/apiAuth';
import { SHOPPING_SETTING_COLUMNS } from '@/features/shoppingSetting/util/settingColumns';
import { findShoppingSettingWriteViolation } from '@/features/shoppingSetting/util/shoppingSettingWriteSchema';
import { sanitizeMallSettings } from '@/features/shoppingSetting/util/sanitizeMallSettings';
import { pickMallAddress } from '@/features/shoppingSetting/util/pickMallAddress';
import { ACCOUNT_NOT_FOUND_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';
import { ShoppingMalls } from '@/types/common.type';

export async function POST(req: NextRequest) {
  const session = await requirePermission(req, 'shoppingSetting.create');
  if (session instanceof NextResponse) return session;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const violation = findShoppingSettingWriteViolation(body, 'create');
    if (violation) return NextResponse.json({ error: violation }, { status: 400 });

    // 계정을 읽어 소유권을 확인하고, mallCode·mallId를 여기서 얻는다.
    // 클라이언트가 보낸 mallCode·mallId는 쓰지 않는다 — 위조되면 목록의 몰 필터가 어긋난다.
    const [account] = await db
      .select({ id: shoppingAccounts.id, mallCode: shoppingAccounts.mallCode, mallId: shoppingAccounts.mallId })
      .from(shoppingAccounts)
      .where(and(eq(shoppingAccounts.id, String(body.mallAccountId)), eq(shoppingAccounts.ownerId, session.ownerId)))
      .limit(1);

    if (!account) return NextResponse.json({ error: ACCOUNT_NOT_FOUND_MESSAGE }, { status: 400 });

    const now = new Date();

    const [created] = await db
      .insert(shoppingSettings)
      .values({
        id: `ss_${randomUUID().slice(0, 8)}`,
        ownerId: session.ownerId,
        mallAccountId: account.id,
        mallCode: account.mallCode,
        mallId: account.mallId,
        nickname: String(body.nickname).trim(),
        isActive: body.isActive as boolean,
        productCondition: String(body.productCondition),
        salesPeriod: Number(body.salesPeriod),
        deliveryCompany: String(body.deliveryCompany),
        shippingAddress: pickMallAddress(body.shippingAddress),
        returnAddress: pickMallAddress(body.returnAddress),
        mallSettings: sanitizeMallSettings(account.mallCode as ShoppingMalls, body.mallSettings),
        createdAt: now,
        updatedAt: now,
      })
      .returning(SHOPPING_SETTING_COLUMNS);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('쇼핑몰 정보설정 생성 중 에러:', error);
    return serverErrorResponse();
  }
}
