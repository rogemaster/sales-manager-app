import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { generatorProductCode } from '@/utils/codeGenerator';
import { isMainImageOwnedBy } from '@/lib/storage';
import { IMAGE_NOT_OWNED_MESSAGE } from '@/shared/constant/upload.constant';
import { Product } from '@/features/products/types/product.types';
import { findProductWriteViolation } from '@/features/products/util/productWriteSchema';
import { PRODUCT_BULK_MAX_ROWS } from '@/features/products/constant/bulk.constant';
import {
  CUSTOMER_CODE_CONFLICT_MESSAGE,
  findFirstRepeatedCustomerCodeIndex,
  formatCustomerCodeDuplicateMessage,
  formatCustomerCodeInRequestMessage,
  CUSTOMER_CODE_TYPE_MESSAGE,
  findCustomerCodeInputProblem,
  normalizeCustomerCode,
  toCustomerCodeKey,
} from '@/features/products/util/customerCode';
import { findExistingCustomerCodes } from '@/lib/customerCodeDuplicates';
import { isCustomerCodeUniqueViolation } from '@/lib/customerCodeUniqueViolation';

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

    // 정규화는 글자가 아닌 값(엑셀의 TRUE 셀 등)을 "코드 없음"으로 바꿔 조용히 버린다. 그 전에 거부한다.
    const invalidCodeIndex = rows.findIndex((p) => findCustomerCodeInputProblem(p.customerCode) === 'TYPE');
    if (invalidCodeIndex !== -1) return rowError(CUSTOMER_CODE_TYPE_MESSAGE, invalidCodeIndex);

    // 검증보다 먼저 정규화한다 — 길이 검사와 중복 비교가 저장될 값 기준으로 돌아야 한다.
    const normalized = rows.map((p) => ({ ...p, customerCode: normalizeCustomerCode(p.customerCode) }));

    // insert 전에 전체 행을 먼저 검증한다. 일부만 넣고 나머지를 거부하면
    // "몇 번째 줄까지 반영됐는지 알 수 없는" 절반짜리 상태가 되어 재시도가 더 어려워진다.
    // create·PATCH와 같은 규칙: mainImage가 없으면 통과, 있으면 본인 네임스페이스의 key여야 한다.
    const invalidIndex = normalized.findIndex((p) => p.mainImage && !isMainImageOwnedBy(p.mainImage, session.ownerId));
    if (invalidIndex !== -1) {
      return rowError(IMAGE_NOT_OWNED_MESSAGE, invalidIndex);
    }

    for (const [index, product] of normalized.entries()) {
      const violation = findProductWriteViolation(product);
      if (violation) return rowError(violation, index);
    }

    // 엑셀 미리보기가 중복 행을 이미 빼고 보내므로, 아래 두 검사는 우회 요청과 동시 저장 때만 걸린다.
    const codes = normalized.map((p) => p.customerCode);

    const repeatedIndex = findFirstRepeatedCustomerCodeIndex(codes);
    if (repeatedIndex !== -1) {
      return rowError(formatCustomerCodeInRequestMessage(codes[repeatedIndex]!), repeatedIndex);
    }

    const presentCodes = codes.filter((code): code is string => code !== null);
    const existingByKey = new Map(
      (await findExistingCustomerCodes(session.ownerId, presentCodes)).map(({ key, existingCode }) => [
        key,
        existingCode,
      ]),
    );
    const conflictIndex = codes.findIndex((code) => code !== null && existingByKey.has(toCustomerCodeKey(code)));
    if (conflictIndex !== -1) {
      const code = codes[conflictIndex]!;
      return rowError(
        formatCustomerCodeDuplicateMessage(code, existingByKey.get(toCustomerCodeKey(code))!),
        conflictIndex,
      );
    }

    const now = new Date();

    // productId는 항상 서버가 채번한다. 클라이언트 값을 믿으면 PK 충돌로 배치가 통째로 죽고,
    // 그 충돌 여부가 곧 "그 id의 상품이 이미 있다"는 교차 테넌트 존재 오라클이 된다.
    // (neon-http는 db.transaction()이 없지만 다중 행 insert는 한 문장이라 원자적이다)
    await db.insert(products).values(
      normalized.map((p) => ({
        ...p,
        productId: generatorProductCode(),
        ownerId: session.ownerId,
        createDate: now,
        updateDate: now,
      })),
    );

    return NextResponse.json({ success: true, count: normalized.length });
  } catch (error) {
    // 검사와 insert 사이에 같은 코드가 저장된 경우. DB는 어느 행인지 알려주지 않아 rowIndex 없이 돌려준다 —
    // formatBulkRowError는 rowIndex가 없으면 문구만 쓴다.
    if (isCustomerCodeUniqueViolation(error)) {
      return NextResponse.json({ error: CUSTOMER_CODE_CONFLICT_MESSAGE }, { status: 400 });
    }
    console.error('상품 대량 등록 중 에러:', error);
    return serverErrorResponse();
  }
}
