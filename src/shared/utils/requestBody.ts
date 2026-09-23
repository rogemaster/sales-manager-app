import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const INVALID_BODY_MESSAGE = '요청 본문이 올바르지 않습니다.';

/**
 * 요청 본문을 읽어 스키마로 검증한다. 실패하면 400 응답을, 통과하면 스키마가 변환한 값을 돌려준다.
 * route는 반환값이 NextResponse인지 보고 그대로 반환한다 — requireSession과 같은 모양이다.
 */
export async function parseRequestBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S> | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: INVALID_BODY_MESSAGE }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? INVALID_BODY_MESSAGE }, { status: 400 });
  }
  return result.data;
}
