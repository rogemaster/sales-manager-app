import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { EMAIL_TAKEN_MESSAGE, isEmailTaken } from '@/features/account/server/userStore';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword } from '@/db/password';
import { generatorUserId } from '@/utils/codeGenerator';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { toKstYmd } from '@/shared/utils/date';
import { registerBaseSchema } from '@/features/auth/util/registerValidation';

export async function POST(req: NextRequest) {
  const body = await parseRequestBody(req, registerBaseSchema);
  if (body instanceof NextResponse) return body;

  try {
    if (await isEmailTaken(body.email)) {
      return NextResponse.json({ error: EMAIL_TAKEN_MESSAGE }, { status: 400 });
    }

    const now = toKstYmd(new Date());
    const id = generatorUserId();
    await db.insert(users).values({
      id,
      ownerId: id,
      status: 'active',
      email: body.email,
      password: await hashPassword(body.password),
      name: body.contactName,
      avatar: null,
      phone: body.contactPhone,
      bio: '',
      company: body.companyName,
      location: '',
      grade: 'super_admin',
      representativeName: body.representativeName,
      businessNumber: body.businessNumber,
      businessCategory: body.businessCategory,
      businessLicenseName: body.businessLicenseName,
      contactEmail: body.contactEmail,
      settlementName: body.settlementName,
      settlementEmail: body.settlementEmail,
      settlementPhone: body.settlementPhone,
      createdAt: now,
      updatedAt: now,
    });

    return new NextResponse(null, { status: 201 });
  } catch (error) {
    console.error('회원가입 처리 중 에러:', error);
    return serverErrorResponse();
  }
}
