import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { getToken } = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken }));

import { requireSession, requireSuperAdminSession } from './apiAuth';

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

  it('ownerId가 null이면 자기 id로 대체한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_1', ownerId: null, grade: 'super_admin', email: 'a@a.com' });
    const result = await requireSession(makeReq());
    expect(result).toEqual({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
  });
});

describe('requireSuperAdminSession', () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it('토큰이 없으면 401 응답을 반환한다', async () => {
    getToken.mockResolvedValue(null);
    const result = await requireSuperAdminSession(makeReq());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('grade가 super_admin이 아니면 403 응답을 반환한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_2', ownerId: 'usr_1', grade: 'operator', email: 'b@a.com' });
    const result = await requireSuperAdminSession(makeReq());
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('grade가 super_admin이면 세션 정보를 반환한다', async () => {
    getToken.mockResolvedValue({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
    const result = await requireSuperAdminSession(makeReq());
    expect(result).toEqual({ id: 'usr_1', ownerId: 'usr_1', grade: 'super_admin', email: 'a@a.com' });
  });
});
