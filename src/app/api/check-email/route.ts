import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { isEmailTaken } from '@/features/account/server/userStore';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { checkEmailSchema } from '@/features/auth/util/registerValidation';

export async function POST(req: NextRequest) {
  // 가입 전 공개 route라 입력을 먼저 거른다 — 빈 값·객체가 그대로 DB 조회로 가지 않게.
  const body = await parseRequestBody(req, checkEmailSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { email } = body;
    return NextResponse.json({ available: !(await isEmailTaken(email)) });
  } catch (error) {
    console.error('이메일 중복 확인 중 에러:', error);
    return serverErrorResponse();
  }
}
