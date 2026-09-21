import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { SHOPPING_ACCOUNT_PUBLIC_COLUMNS } from '@/features/shoppingAccount/util/accountColumns';
import { findShoppingAccountWriteViolation } from '@/features/shoppingAccount/util/shoppingAccountWriteSchema';
import { UpdateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { syncSettingMallId } from '@/features/shoppingSetting/util/syncSettingMallId';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  try {
    // 소유자 조건을 WHERE에 함께 넣는다. 남의 계정이면 0건이 되어 404가 나가고,
    // 존재 여부 자체가 노출되지 않는다.
    const [row] = await db
      .select(SHOPPING_ACCOUNT_PUBLIC_COLUMNS)
      .from(shoppingAccounts)
      .where(and(eq(shoppingAccounts.id, id), eq(shoppingAccounts.ownerId, session.ownerId)))
      .limit(1);

    if (!row) return new NextResponse(null, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error('쇼핑몰 계정 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  try {
    const update = (await req.json()) as UpdateShoppingAccountBody & {
      id?: string;
      ownerId?: string;
      createdAt?: string;
    };

    // id·ownerId·createdAt은 수정 대상이 아니다. 요청에 섞여 와도 버린다.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ownerId: _oid, createdAt: _createdAt, password, apiKey, ...rest } = update;

    // rest에 테이블 컬럼에 없는 키가 섞여 그대로 .set()까지 가면 drizzle의 mapUpdateSet이
    // undefined 컬럼을 참조해 500이 된다. 허용 키만, "보낸 필드만 바꾼다"를 지키기 위해
    // 존재하는 키만(in 연산자) 담는다 — 값을 못 채운 키를 undefined로 채워 넣지 않는다.
    const values: Partial<UpdateShoppingAccountBody> = {};
    if ('mallCode' in rest) values.mallCode = rest.mallCode;
    if ('mallId' in rest) values.mallId = rest.mallId;
    if ('isActive' in rest) values.isActive = rest.isActive;
    if ('nickname' in rest) values.nickname = rest.nickname;
    if ('managerMd' in rest) values.managerMd = rest.managerMd;
    if ('phone' in rest) values.phone = rest.phone;
    if ('email' in rest) values.email = rest.email;
    if ('domain' in rest) values.domain = rest.domain;
    if ('category' in rest) values.category = rest.category;

    // 수정 화면은 비밀 필드를 빈 칸으로 연다 — 빈 값은 "변경 안 함"이다.
    // 이 걷어내기를 검증보다 먼저 해야 한다. patch를 그대로 검증하면 빈 칸이 위반으로 잡혀 400이 된다.
    if (password) values.password = password;
    if (apiKey) values.apiKey = apiKey;

    const violation = findShoppingAccountWriteViolation(values, 'partial');
    if (violation) {
      return NextResponse.json({ error: violation }, { status: 400 });
    }

    const [updated] = await db
      .update(shoppingAccounts)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(shoppingAccounts.id, id), eq(shoppingAccounts.ownerId, session.ownerId)))
      .returning(SHOPPING_ACCOUNT_PUBLIC_COLUMNS);

    if (!updated) return new NextResponse(null, { status: 404 });

    // 설정이 들고 있는 mallId 사본을 맞춘다. neon-http에 트랜잭션이 없어 이 갱신만 실패할 수 있는데,
    // 그때는 계정 수정을 성공으로 돌려준다 — 표시용 값 하나가 옛 값인 것이
    // 계정 수정 자체가 실패하는 것보다 낫다.
    if (values.mallId !== undefined) {
      try {
        await syncSettingMallId(id, session.ownerId, values.mallId);
      } catch (error) {
        console.error('설정 mallId 동기화 실패:', error);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    // DrizzleQueryError.message는 SQL params(평문 password·apiKey)를 포함한다. cause만 남긴다.
    console.error('쇼핑몰 계정 수정 중 에러:', error instanceof Error ? (error.cause ?? error.name) : error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
