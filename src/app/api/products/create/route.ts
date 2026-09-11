import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { generatorProductCode } from '@/utils/codeGenerator';
import { isMainImageOwnedBy } from '@/lib/storage';
import { CreateProductRequest } from '@/features/products/types/product.types';
import { findInvalidProductCode, invalidProductCodeMessage } from '@/features/products/util/productCodes';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = (await req.json()) as CreateProductRequest;

    // key 형태라면 본인 네임스페이스여야 한다 — 아니면 다른 테넌트의 R2 객체를 가리키는 key가 그대로 저장된다.
    if (data.mainImage && !isMainImageOwnedBy(data.mainImage, session.ownerId)) {
      return NextResponse.json({ error: '본인이 업로드한 이미지만 사용할 수 있습니다.' }, { status: 400 });
    }

    // 판매상태·배송정책은 코드값만 저장한다. 컬럼이 text라 DB는 막아주지 않는다.
    const violation = findInvalidProductCode(data);
    if (violation) {
      return NextResponse.json({ error: invalidProductCodeMessage(violation) }, { status: 400 });
    }

    const now = new Date();

    const [created] = await db
      .insert(products)
      .values({
        ...data,
        productId: generatorProductCode(),
        ownerId: session.ownerId,
        createDate: now,
        updateDate: now,
      })
      .returning();

    return NextResponse.json(created);
  } catch (error) {
    console.error('상품 등록 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
