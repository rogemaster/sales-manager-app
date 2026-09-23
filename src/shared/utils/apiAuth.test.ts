import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { getToken } = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken }));

import { requireSession, requirePermission } from './apiAuth';

const makeReq = () => new NextRequest('http://localhost/api/test');

describe('requireSession', () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it('토큰이 없으면 401 응답을 반환한다', async () => {
    getToken.mockResolvedValue(null);
    const result = await requireSession(makeReq());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('토큰이 있으면 세션 정보를 반환한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
    const result = await requireSession(makeReq());
    expect(result).toEqual({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
  });
});

describe('requirePermission', () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it('토큰이 없으면 401 응답을 반환한다', async () => {
    getToken.mockResolvedValue(null);
    const result = await requirePermission(makeReq(), 'shoppingAccount.delete');
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('정책표에서 허용되지 않은 등급이면 403과 고정 문구를 반환한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_2', ownerId: 'usr_1', grade: 'operator', email: 'b@a.com' });
    const result = await requirePermission(makeReq(), 'shoppingAccount.delete');
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    expect(await (result as NextResponse).json()).toEqual({ error: '권한이 없습니다.' });
  });

  it('정책표에서 허용된 등급이면 세션 정보를 반환한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_2', ownerId: 'usr_1', grade: 'admin', email: 'b@a.com' });
    const result = await requirePermission(makeReq(), 'shoppingAccount.delete');
    expect(result).toEqual({ id: 'usr_2', ownerId: 'usr_1', grade: 'admin', email: 'b@a.com' });
  });
});
