import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { toMallAddresses } from '@/features/shoppingSetting/util/naverAddressBook';
import { STATIC_MALL_ADDRESS_BOOK } from '@/features/shoppingSetting/constant/mallAddressBook.constant';
import { ShoppingMalls } from '@/types/common.type';
import { MallAddressType } from '@/features/shoppingSetting/types/shoppingSetting.types';
import {
  MALL_ACCOUNT_MISSING_MESSAGE,
  MALL_AUTH_FAILED_MESSAGE,
} from '@/features/shoppingAccount/util/accountMessages';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { mallAccountId, addressType } = (await req.json()) as {
      mallAccountId: string;
      addressType: MallAddressType;
    };

    if (addressType !== 'SHIPPING' && addressType !== 'RETURN') {
      return NextResponse.json({ error: '주소 종류가 올바르지 않습니다.' }, { status: 400 });
    }

    // 계정에서 mallCode와 apiKey를 얻는다. 클라이언트는 mallCode를 보내지 않는다.
    const [account] = await db
      .select({ mallCode: shoppingAccounts.mallCode, apiKey: shoppingAccounts.apiKey })
      .from(shoppingAccounts)
      .where(and(eq(shoppingAccounts.id, mallAccountId), eq(shoppingAccounts.ownerId, session.ownerId)))
      .limit(1);

    if (!account) {
      return NextResponse.json({ error: MALL_ACCOUNT_MISSING_MESSAGE }, { status: 404 });
    }

    if (account.mallCode !== 'NSST') {
      return NextResponse.json(STATIC_MALL_ADDRESS_BOOK[account.mallCode as ShoppingMalls] ?? []);
    }

    // 시뮬레이터는 HTTP로 부른다. createNaverRepository를 직접 import하면 네트워크 경계가
    // 사라진다(import-ban-as-network-boundary.md). 순서 4의 상품 전송도 이 경로로 간다.
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/naver/addresses?type=${addressType}`,
      { headers: { Authorization: `Bearer ${account.apiKey}` } },
    );

    if (response.status === 401) {
      return NextResponse.json({ error: MALL_AUTH_FAILED_MESSAGE }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`네이버 주소록 조회 실패: ${response.status}`);
      return NextResponse.json({ error: '주소록을 불러오지 못했습니다.' }, { status: 502 });
    }

    return NextResponse.json(toMallAddresses(await response.json()));
  } catch (error) {
    // 시뮬레이터가 안 떠 있으면 fetch가 throw한다. 빈 목록으로 삼키면 주소가 필수값이라
    // 사용자는 "선택할 게 없다"만 보고 원인을 알 수 없다.
    console.error('주소록 조회 중 에러:', error);
    return NextResponse.json({ error: '주소록을 불러오지 못했습니다.' }, { status: 502 });
  }
}
