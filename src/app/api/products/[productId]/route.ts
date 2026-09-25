import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { isMainImageOwnedBy } from '@/lib/storage';
import { IMAGE_NOT_OWNED_MESSAGE } from '@/shared/constant/upload.constant';
import { Product } from '@/features/products/types/product.types';
import { findProductWriteViolation } from '@/features/products/util/productWriteSchema';
import {
  CUSTOMER_CODE_CONFLICT_MESSAGE,
  CUSTOMER_CODE_TYPE_MESSAGE,
  findCustomerCodeInputProblem,
  normalizeCustomerCode,
} from '@/features/products/util/customerCode';
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

  try {
    const update = (await req.json()) as Partial<Product>;

    // productId·ownerId·createDate는 수정 대상이 아니다. 요청에 섞여 와도 무시한다.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { productId: _pid, ownerId: _oid, createDate: _cd, ...patch } = update;

    // 이 검사가 없으면 `customerCode: true`가 정규화에서 null이 되어 기존 코드가 지워진다.
    if (findCustomerCodeInputProblem(patch.customerCode) === 'TYPE') {
      return NextResponse.json({ error: CUSTOMER_CODE_TYPE_MESSAGE }, { status: 400 });
    }

    // PATCH는 바꿀 필드만 보낸다. customerCode 키가 없으면 건드리지 않고, 있으면 정규화한다('' → null은 코드 삭제).
    const values =
      'customerCode' in patch ? { ...patch, customerCode: normalizeCustomerCode(patch.customerCode) } : patch;

    // key 형태의 mainImage라면 본인 네임스페이스여야 한다 — 그렇지 않으면 다른 테넌트의
    // R2 객체를 자기 상품에 걸 수 있다.
    if (values.mainImage && !isMainImageOwnedBy(values.mainImage, session.ownerId)) {
      return NextResponse.json({ error: IMAGE_NOT_OWNED_MESSAGE }, { status: 400 });
    }

    // 보내지 않은 필드는 검사하지 않는다 — PATCH는 바꾸려는 필드만 보낸다.
    const violation = findProductWriteViolation(values, 'partial');
    if (violation) {
      return NextResponse.json({ error: violation }, { status: 400 });
    }

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
