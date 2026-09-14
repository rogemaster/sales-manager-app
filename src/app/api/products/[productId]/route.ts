import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { isMainImageOwnedBy } from '@/lib/storage';
import { Product } from '@/features/products/types/product.types';
import { findProductWriteViolation } from '@/features/products/util/productWriteSchema';

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
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
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

    // key 형태의 mainImage라면 본인 네임스페이스여야 한다 — 그렇지 않으면 다른 테넌트의
    // R2 객체를 자기 상품에 걸 수 있다.
    if (patch.mainImage && !isMainImageOwnedBy(patch.mainImage, session.ownerId)) {
      return NextResponse.json({ error: '본인이 업로드한 이미지만 사용할 수 있습니다.' }, { status: 400 });
    }

    // 보내지 않은 필드는 검사하지 않는다 — PATCH는 바꾸려는 필드만 보낸다.
    const violation = findProductWriteViolation(patch, 'partial');
    if (violation) {
      return NextResponse.json({ error: violation }, { status: 400 });
    }

    const [updated] = await db
      .update(products)
      .set({ ...patch, updateDate: new Date() })
      .where(and(eq(products.productId, productId), eq(products.ownerId, session.ownerId)))
      .returning();

    if (!updated) return new NextResponse(null, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('상품 수정 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
