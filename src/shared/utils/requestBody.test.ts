import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { INVALID_BODY_MESSAGE, parseRequestBody } from './requestBody';

const schema = z.object({ name: z.string().min(1, '이름을 입력해주세요.'), size: z.number().default(20) });
const makeReq = (body: string) => new NextRequest('http://localhost/api/test', { method: 'POST', body });

describe('parseRequestBody', () => {
  it('통과하면 스키마가 변환한 값을 돌려준다(기본값 포함)', async () => {
    const result = await parseRequestBody(makeReq(JSON.stringify({ name: 'a' })), schema);
    expect(result).toEqual({ name: 'a', size: 20 });
  });

  it('위반하면 첫 번째 위반 메시지로 400을 돌려준다', async () => {
    const result = await parseRequestBody(makeReq(JSON.stringify({ name: '' })), schema);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
    expect(await (result as NextResponse).json()).toEqual({ error: '이름을 입력해주세요.' });
  });

  it('JSON이 아니면 500이 아니라 400을 돌려준다', async () => {
    const result = await parseRequestBody(makeReq('{not json'), schema);
    expect((result as NextResponse).status).toBe(400);
    expect(await (result as NextResponse).json()).toEqual({ error: INVALID_BODY_MESSAGE });
  });
});
