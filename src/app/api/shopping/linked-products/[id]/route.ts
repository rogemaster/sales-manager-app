import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { mallLinkedProducts } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { UpdateMallLinkedProductBody } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { LINKED_PRODUCT_COLUMNS } from '@/features/mallLinkedProduct/server/linkedProductStore';
import { toMallLinkedProduct } from '@/features/mallLinkedProduct/util/linkedProductRecord';
import { buildSnapshotUpdate } from '@/features/mallLinkedProduct/util/linkedProductWrite';

type Context = { params: Promise<{ id: string }> };

const NOT_FOUND_MESSAGE = '존재하지 않는 연동 상품입니다.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    // 남의 것과 없는 것을 같은 404로 답한다 — 구분하면 남의 id를 탐색하는 도구가 된다.
    const [row] = await db
      .select(LINKED_PRODUCT_COLUMNS)
      .from(mallLinkedProducts)
      .where(and(eq(mallLinkedProducts.id, id), eq(mallLinkedProducts.ownerId, session.ownerId)))
      .limit(1);
    if (!row) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    return NextResponse.json(toMallLinkedProduct(row));
  } catch (error) {
    console.error('쇼핑몰 연동 상품 조회 중 에러:', error);
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    const body = (await req.json()) as UpdateMallLinkedProductBody;
    if (!isRecord(body.productSnapshot) || !isRecord(body.settingSnapshot)) {
      return NextResponse.json({ error: '저장할 값이 올바르지 않습니다.' }, { status: 400 });
    }

    // 불변 3컬럼·전송 필드가 SET에 없다 — 규칙은 buildSnapshotUpdate에 있다.
    const [updated] = await db
      .update(mallLinkedProducts)
      .set(buildSnapshotUpdate(body, session.email, new Date()))
      .where(and(eq(mallLinkedProducts.id, id), eq(mallLinkedProducts.ownerId, session.ownerId)))
      .returning(LINKED_PRODUCT_COLUMNS);

    if (!updated) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    return NextResponse.json(toMallLinkedProduct(updated));
  } catch (error) {
    console.error('쇼핑몰 연동 상품 저장 중 에러:', error);
    return serverErrorResponse();
  }
}
