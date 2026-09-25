import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { requireSession } from '@/shared/utils/apiAuth';
import { findExistingCustomerCodes } from '@/lib/customerCodeDuplicates';
import { matchExistingCustomerCodes, readCustomerCodeCheckRequest } from '@/features/products/util/customerCode';

// 상품 등록·수정 제출 전과 엑셀 업로드 미리보기에서, 이미지를 R2에 올리기 전에 코드 중복을 확인한다.
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const request = readCustomerCodeCheckRequest(await req.json().catch(() => null));
    if (!request) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });

    const existing = await findExistingCustomerCodes(session.ownerId, request.codes, request.excludeProductId);
    return NextResponse.json({ duplicates: matchExistingCustomerCodes(request.codes, existing) });
  } catch (error) {
    console.error('고객사 상품코드 확인 중 에러:', error);
    return serverErrorResponse();
  }
}
