import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { generatorShoppingAccountCode } from '@/utils/codeGenerator';
import { SHOPPING_ACCOUNT_PUBLIC_COLUMNS } from '@/features/shoppingAccount/util/accountColumns';
import { findShoppingAccountWriteViolation } from '@/features/shoppingAccount/util/shoppingAccountWriteSchema';
import { CreateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const body = (await req.json()) as CreateShoppingAccountBody;

    const violation = findShoppingAccountWriteViolation(body);
    if (violation) {
      return NextResponse.json({ error: violation }, { status: 400 });
    }

    const now = new Date();

    // id·ownerId는 서버가 정한다. 요청에 섞여 와도 아래 values가 덮어쓴다.
    const [created] = await db
      .insert(shoppingAccounts)
      .values({
        mallCode: body.mallCode,
        mallId: body.mallId,
        isActive: body.isActive,
        nickname: body.nickname,
        managerMd: body.managerMd,
        phone: body.phone,
        email: body.email,
        domain: body.domain,
        category: body.category,
        password: body.password,
        apiKey: body.apiKey,
        id: generatorShoppingAccountCode(),
        ownerId: session.ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning(SHOPPING_ACCOUNT_PUBLIC_COLUMNS);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    // DrizzleQueryError.message는 SQL params(평문 password·apiKey)를 포함한다. cause만 남긴다.
    console.error('쇼핑몰 계정 등록 중 에러:', error instanceof Error ? (error.cause ?? error.name) : error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
