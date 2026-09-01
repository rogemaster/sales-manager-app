import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { generatorProductCode } from '@/utils/codeGenerator';
import { isMainImageOwnedBy } from '@/lib/storage';
import { Product } from '@/features/products/types/product.types';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { products: rows } = (await req.json()) as { products: Omit<Product, 'ownerId'>[] };

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // insert 전에 전체 행을 먼저 검증한다. 일부만 넣고 나머지를 거부하면
    // "몇 번째 줄까지 반영됐는지 알 수 없는" 절반짜리 상태가 되어 재시도가 더 어려워진다.
    // create·PATCH와 같은 규칙: mainImage가 없으면 통과, 절대 URL이면 통과, key라면 본인 네임스페이스여야 한다.
    const invalidIndex = rows.findIndex((p) => p.mainImage && !isMainImageOwnedBy(p.mainImage, session.ownerId));
    if (invalidIndex !== -1) {
      return NextResponse.json(
        { error: `${invalidIndex + 1}번째 행의 이미지는 본인이 업로드한 것이 아닙니다.` },
        { status: 400 },
      );
    }

    const now = new Date();

    // productId는 항상 서버가 채번한다. 클라이언트 값을 믿으면 PK 충돌로 배치가 통째로 죽고,
    // 그 충돌 여부가 곧 "그 id의 상품이 이미 있다"는 교차 테넌트 존재 오라클이 된다.
    // (neon-http는 db.transaction()이 없지만 다중 행 insert는 한 문장이라 원자적이다)
    await db.insert(products).values(
      rows.map((p) => ({
        ...p,
        productId: generatorProductCode(),
        ownerId: session.ownerId,
        createDate: now,
        updateDate: now,
      })),
    );

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error('상품 대량 등록 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
