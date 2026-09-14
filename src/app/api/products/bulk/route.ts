import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { generatorProductCode } from '@/utils/codeGenerator';
import { isMainImageOwnedBy } from '@/lib/storage';
import { Product } from '@/features/products/types/product.types';
import { findProductWriteViolation } from '@/features/products/util/productWriteSchema';
import { PRODUCT_BULK_MAX_ROWS } from '@/features/products/constant/bulk.constant';

// 오류 응답의 rowIndex는 요청 배열 기준 0부터다. 시트 행 번호는 요청을 만든 클라이언트만 알고 있어서
// 서버는 index만 돌려주고 번호는 클라이언트가 붙인다(formatBulkRowError).
const rowError = (error: string, rowIndex: number) => NextResponse.json({ error, rowIndex }, { status: 400 });

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { products: rows } = (await req.json()) as { products: Omit<Product, 'ownerId'>[] };

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // 엑셀 업로드가 앞에서 막지만 그 검사는 브라우저에서만 돈다.
    if (rows.length > PRODUCT_BULK_MAX_ROWS) {
      return NextResponse.json(
        { error: `한 번에 최대 ${PRODUCT_BULK_MAX_ROWS}건까지 등록할 수 있습니다.` },
        { status: 400 },
      );
    }

    // insert 전에 전체 행을 먼저 검증한다. 일부만 넣고 나머지를 거부하면
    // "몇 번째 줄까지 반영됐는지 알 수 없는" 절반짜리 상태가 되어 재시도가 더 어려워진다.
    // create·PATCH와 같은 규칙: mainImage가 없으면 통과, 있으면 본인 네임스페이스의 key여야 한다.
    const invalidIndex = rows.findIndex((p) => p.mainImage && !isMainImageOwnedBy(p.mainImage, session.ownerId));
    if (invalidIndex !== -1) {
      return rowError('본인이 업로드한 이미지만 사용할 수 있습니다.', invalidIndex);
    }

    for (const [index, product] of rows.entries()) {
      const violation = findProductWriteViolation(product);
      if (violation) return rowError(violation, index);
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
