import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/simulators/naver/auth';
import { NAVER_DELIVERY_COMPANIES } from '@/simulators/naver/deliveryCompanies';
import { toErrorResponse, toInternalErrorResponse } from '@/simulators/naver/errors';
import { createNaverRepository } from '@/simulators/naver/repository';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(createNaverRepository(), req.headers.get('authorization'));
    if (!auth.ok) {
      const { status, body } = toErrorResponse(auth.reason, auth.invalidInputs);
      return NextResponse.json(body, { status });
    }

    return NextResponse.json({ deliveryCompanies: NAVER_DELIVERY_COMPANIES });
  } catch {
    const { status, body } = toInternalErrorResponse();
    return NextResponse.json(body, { status });
  }
}
