import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { getToken, loadSessionUser } = vi.hoisted(() => ({ getToken: vi.fn(), loadSessionUser: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken }));
vi.mock('./sessionUser', () => ({ loadSessionUser }));

import { requireSession, requirePermission, resolveApiSession } from './apiAuth';
import type { SessionUserRow } from './sessionUser';

const makeReq = () => new NextRequest('http://localhost/api/test');
const TOKEN = { id: 'usr_2', ownerId: 'usr_1', grade: 'admin', email: 'b@a.com' };
const activeUser = (overrides: Partial<SessionUserRow> = {}): SessionUserRow => ({
  id: 'usr_2',
  ownerId: 'usr_1',
  status: 'active',
  grade: 'admin',
  email: 'b@a.com',
  ...overrides,
});

describe('resolveApiSession', () => {
  it('활성 사용자면 DB 값으로 세션을 만든다', () => {
    expect(resolveApiSession(activeUser())).toEqual({ id: 'usr_2', ownerId: 'usr_1', grade: 'admin', email: 'b@a.com' });
  });

  it('사용자가 없으면(삭제됨) null', () => {
    expect(resolveApiSession(null)).toBeNull();
  });

  it('활성이 아니면 null', () => {
    expect(resolveApiSession(activeUser({ status: 'pending' }))).toBeNull();
  });

  it('알 수 없는 등급이면 null', () => {
    expect(resolveApiSession(activeUser({ grade: 'root' }))).toBeNull();
  });

  it('ownerId가 null인 과거 데이터는 id로 대신한다', () => {
    expect(resolveApiSession(activeUser({ id: 'usr_1', ownerId: null }))?.ownerId).toBe('usr_1');
  });
});

describe('requireSession', () => {
  beforeEach(() => {
    getToken.mockReset();
    loadSessionUser.mockReset();
  });

  it('토큰이 없으면 DB를 보지 않고 401', async () => {
    getToken.mockResolvedValue(null);
    const result = await requireSession(makeReq());
    expect((result as NextResponse).status).toBe(401);
    expect(loadSessionUser).not.toHaveBeenCalled();
  });

  it('토큰의 id로 사용자를 조회한다', async () => {
    getToken.mockResolvedValue(TOKEN);
    loadSessionUser.mockResolvedValue(activeUser());
    await requireSession(makeReq());
    expect(loadSessionUser).toHaveBeenCalledWith('usr_2');
  });

  it('삭제된 계정의 토큰이면 401', async () => {
    getToken.mockResolvedValue(TOKEN);
    loadSessionUser.mockResolvedValue(null);
    const result = await requireSession(makeReq());
    expect((result as NextResponse).status).toBe(401);
    expect(await (result as NextResponse).json()).toEqual({ error: '로그인이 필요합니다.' });
  });

  it('토큰 등급이 아니라 DB 등급을 쓴다', async () => {
    getToken.mockResolvedValue({ ...TOKEN, grade: 'super_admin' });
    loadSessionUser.mockResolvedValue(activeUser({ grade: 'operator' }));
    const result = await requireSession(makeReq());
    expect(result).toEqual({ id: 'usr_2', ownerId: 'usr_1', grade: 'operator', email: 'b@a.com' });
  });

  it('조회가 실패하면 401이 아니라 500 — 일시 장애로 전원 로그아웃되지 않게', async () => {
    getToken.mockResolvedValue(TOKEN);
    loadSessionUser.mockRejectedValue(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await requireSession(makeReq());
    expect((result as NextResponse).status).toBe(500);
    spy.mockRestore();
  });
});

describe('requirePermission', () => {
  beforeEach(() => {
    getToken.mockReset();
    loadSessionUser.mockReset();
  });

  it('토큰이 없으면 401', async () => {
    getToken.mockResolvedValue(null);
    const result = await requirePermission(makeReq(), 'shoppingAccount.delete');
    expect((result as NextResponse).status).toBe(401);
  });

  it('DB 등급이 정책표에서 허용되지 않으면 403과 고정 문구', async () => {
    getToken.mockResolvedValue({ ...TOKEN, grade: 'admin' });
    loadSessionUser.mockResolvedValue(activeUser({ grade: 'operator' }));
    const result = await requirePermission(makeReq(), 'shoppingAccount.delete');
    expect((result as NextResponse).status).toBe(403);
    expect(await (result as NextResponse).json()).toEqual({ error: '권한이 없습니다.' });
  });

  it('DB 등급이 허용되면 세션을 돌려준다', async () => {
    getToken.mockResolvedValue(TOKEN);
    loadSessionUser.mockResolvedValue(activeUser());
    const result = await requirePermission(makeReq(), 'shoppingAccount.delete');
    expect(result).toEqual({ id: 'usr_2', ownerId: 'usr_1', grade: 'admin', email: 'b@a.com' });
  });
});
