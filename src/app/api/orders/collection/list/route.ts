import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { ShoppingMalls } from '@/types/common.type';
import { CollectionSearchKey } from '@/features/order/types/collection.types';
import { listCollectionAccounts } from '@/features/order/server/orderCollection';
import { collectionListRequestSchema } from '@/features/order/util/collectionRequest';

/** 수집 화면 행 = 사용 중인 쇼핑몰계정 + 마지막 수집 결과. ownerId는 세션에서만. */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const body = await parseRequestBody(req, collectionListRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    // 스키마가 'ALL'·몰 코드만 통과시켰다. 둘을 섞은 enum이라 타입이 string으로 넓어져 좁혀 준다(주문 목록 route와 같은 사정).
    const filters = {
      ...body.filters,
      mallCode: body.filters.mallCode as ShoppingMalls | 'ALL',
      searchType: body.filters.searchType as CollectionSearchKey,
    };
    return NextResponse.json(await listCollectionAccounts(session.ownerId, filters));
  } catch (error) {
    console.error('수집 계정 목록 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
