import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/simulators/naver/auth';
import { toErrorResponse, toInternalErrorResponse } from '@/simulators/naver/errors';
import { createNaverRepository } from '@/simulators/naver/repository';

export async function GET(req: NextRequest) {
  try {
    const repository = createNaverRepository();

    const auth = await authenticate(repository, req.headers.get('authorization'));
    if (!auth.ok) {
      const { status, body } = toErrorResponse(auth.reason, auth.invalidInputs);
      return NextResponse.json(body, { status });
    }

    const type = req.nextUrl.searchParams.get('type');
    if (type !== 'SHIPPING' && type !== 'RETURN') {
      const { status, body } = toErrorResponse('INVALID', [
        { name: 'type', type: 'ENUM', message: 'SHIPPING 또는 RETURN이어야 합니다.' },
      ]);
      return NextResponse.json(body, { status });
    }

    // 위 분기로 type은 이미 'SHIPPING' | 'RETURN'으로 좁혀져 있다 — 캐스팅이 필요 없다.
    const addresses = await repository.listAddresses(auth.data.id, type);

    return NextResponse.json({
      addresses: addresses.map((address) => ({
        addressId: address.addressId,
        addressType: address.addressType,
        name: address.name,
        zipCode: address.zipCode,
        address: address.address,
        addressDetail: address.addressDetail,
      })),
    });
  } catch {
    const { status, body } = toInternalErrorResponse();
    return NextResponse.json(body, { status });
  }
}
