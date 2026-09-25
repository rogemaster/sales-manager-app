import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { generatorProductCode } from '@/utils/codeGenerator';
import { isMainImageOwnedBy } from '@/lib/storage';
import { IMAGE_NOT_OWNED_MESSAGE } from '@/shared/constant/upload.constant';
import { CreateProductRequest } from '@/features/products/types/product.types';
import { findProductWriteViolation } from '@/features/products/util/productWriteSchema';
import {
  CUSTOMER_CODE_CONFLICT_MESSAGE,
  CUSTOMER_CODE_TYPE_MESSAGE,
  findCustomerCodeInputProblem,
  normalizeCustomerCode,
} from '@/features/products/util/customerCode';
import { findCustomerCodeConflictMessage } from '@/lib/customerCodeDuplicates';
import { isCustomerCodeUniqueViolation } from '@/lib/customerCodeUniqueViolation';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = (await req.json()) as CreateProductRequest;

    // 정규화는 글자가 아닌 값을 "코드 없음"으로 바꾸므로, 그 전에 모양을 본다. 길이는 아래 쓰기 스키마가 본다.
    if (findCustomerCodeInputProblem(data.customerCode) === 'TYPE') {
      return NextResponse.json({ error: CUSTOMER_CODE_TYPE_MESSAGE }, { status: 400 });
    }

    // 검증보다 먼저 정규화한다 — 길이 검사가 저장될 값 기준으로 돌아야 한다.
    const values = { ...data, customerCode: normalizeCustomerCode(data.customerCode) };

    // key 형태라면 본인 네임스페이스여야 한다 — 아니면 다른 테넌트의 R2 객체를 가리키는 key가 그대로 저장된다.
    if (values.mainImage && !isMainImageOwnedBy(values.mainImage, session.ownerId)) {
      return NextResponse.json({ error: IMAGE_NOT_OWNED_MESSAGE }, { status: 400 });
    }

    // 컬럼이 text·integer라 DB가 값을 걸러주지 않는다. 폼을 거치지 않는 요청을 여기서 막는다.
    const violation = findProductWriteViolation(values);
    if (violation) {
      return NextResponse.json({ error: violation }, { status: 400 });
    }

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
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
