import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { generatorProductCode } from '@/utils/codeGenerator';
import { productWriteBodySchema } from '@/features/products/util/productWriteSchema';
import { prepareProductWrite } from '@/features/products/server/prepareProductWrite';
import { CUSTOMER_CODE_CONFLICT_MESSAGE } from '@/features/products/util/customerCode';
import { findCustomerCodeConflictMessage } from '@/lib/customerCodeDuplicates';
import { isCustomerCodeUniqueViolation } from '@/lib/customerCodeUniqueViolation';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const body = await parseRequestBody(req, productWriteBodySchema);
  if (body instanceof NextResponse) return body;

  try {
    const prepared = prepareProductWrite(body, session.ownerId);
    if (!prepared.ok) return NextResponse.json({ error: prepared.error }, { status: 400 });
    const { values } = prepared;

    if (values.customerCode) {
      const conflict = await findCustomerCodeConflictMessage(session.ownerId, values.customerCode);
      if (conflict) return NextResponse.json({ error: conflict }, { status: 400 });
    }

    const now = new Date();

    const [created] = await db
      .insert(products)
      .values({
        ...values,
        productId: generatorProductCode(),
        ownerId: session.ownerId,
        createDate: now,
        updateDate: now,
      })
      .returning();

    return NextResponse.json(created);
  } catch (error) {
    // 위 검사와 insert 사이에 같은 코드가 저장된 경우다.
    if (isCustomerCodeUniqueViolation(error)) {
      return NextResponse.json({ error: CUSTOMER_CODE_CONFLICT_MESSAGE }, { status: 400 });
    }
    console.error('상품 등록 중 에러:', error);
    return serverErrorResponse();
  }
}
