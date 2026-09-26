import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { generatorProductCode } from '@/utils/codeGenerator';
import { productBulkRequestSchema } from '@/features/products/util/productWriteSchema';
import { prepareProductWrite, ProductWriteValues } from '@/features/products/server/prepareProductWrite';
import {
  CUSTOMER_CODE_CONFLICT_MESSAGE,
  findFirstRepeatedCustomerCodeIndex,
  formatCustomerCodeDuplicateMessage,
  formatCustomerCodeInRequestMessage,
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

  // 건수 상한(PRODUCT_BULK_MAX_ROWS)도 스키마가 본다.
  const body = await parseRequestBody(req, productBulkRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { products: rows } = body;

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // insert 전에 전체 행을 먼저 검증한다. 일부만 넣고 나머지를 거부하면
    // "몇 번째 줄까지 반영됐는지 알 수 없는" 절반짜리 상태가 되어 재시도가 더 어려워진다.
    // 행마다 모든 검사를 끝내고 다음 행으로 가므로, 돌려주는 오류는 문제가 있는 첫 행의 것이다.
    const prepared: ProductWriteValues[] = [];
    for (const [index, row] of rows.entries()) {
      const result = prepareProductWrite(row, session.ownerId);
      if (!result.ok) return rowError(result.error, index);
      prepared.push(result.values);
    }

    // 엑셀 미리보기가 중복 행을 이미 빼고 보내므로, 아래 두 검사는 우회 요청과 동시 저장 때만 걸린다.
    const codes = prepared.map((p) => p.customerCode ?? null);

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
      prepared.map((p) => ({
        ...p,
        productId: generatorProductCode(),
        ownerId: session.ownerId,
        createDate: now,
        updateDate: now,
      })),
    );

    return NextResponse.json({ success: true, count: prepared.length });
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
