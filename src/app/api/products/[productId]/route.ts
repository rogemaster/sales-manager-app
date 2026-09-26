import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { productWriteBodySchema } from '@/features/products/util/productWriteSchema';
import { prepareProductWrite } from '@/features/products/server/prepareProductWrite';
import { CUSTOMER_CODE_CONFLICT_MESSAGE } from '@/features/products/util/customerCode';
import { findCustomerCodeConflictMessage } from '@/lib/customerCodeDuplicates';
import { isCustomerCodeUniqueViolation } from '@/lib/customerCodeUniqueViolation';

type Context = { params: Promise<{ productId: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const { productId } = await params;

  try {
    // 소유자 조건을 WHERE에 함께 넣는다. 남의 상품이면 0건이 되어 404가 나가고,
    // 존재 여부 자체가 노출되지 않는다.
    const [row] = await db
      .select()
      .from(products)
      .where(and(eq(products.productId, productId), eq(products.ownerId, session.ownerId)))
      .limit(1);

    if (!row) return new NextResponse(null, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error('상품 조회 중 에러:', error);
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const { productId } = await params;

  const body = await parseRequestBody(req, productWriteBodySchema);
  if (body instanceof NextResponse) return body;

  try {
    // PATCH는 바꿀 필드만 보낸다. productId·ownerId·createDate는 섞여 와도 버려진다.
    const prepared = prepareProductWrite(body, session.ownerId, 'partial');
    if (!prepared.ok) return NextResponse.json({ error: prepared.error }, { status: 400 });
    const { values } = prepared;

    // 자기 자신은 비교에서 뺀다 — 코드를 그대로 두거나 대소문자만 바꾸는 수정은 통과해야 한다.
    if (values.customerCode) {
      const conflict = await findCustomerCodeConflictMessage(session.ownerId, values.customerCode, productId);
      if (conflict) return NextResponse.json({ error: conflict }, { status: 400 });
    }

    const [updated] = await db
      .update(products)
      .set({ ...values, updateDate: new Date() })
      .where(and(eq(products.productId, productId), eq(products.ownerId, session.ownerId)))
      .returning();

    if (!updated) return new NextResponse(null, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (isCustomerCodeUniqueViolation(error)) {
      return NextResponse.json({ error: CUSTOMER_CODE_CONFLICT_MESSAGE }, { status: 400 });
    }
    console.error('상품 수정 중 에러:', error);
    return serverErrorResponse();
  }
}
