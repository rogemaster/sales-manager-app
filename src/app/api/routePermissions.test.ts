import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { UserGrade } from '@/features/auth/types/Auth';

const { getToken } = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken }));
vi.mock('server-only', () => ({}));
// 권한 판정이 DB 접근보다 먼저인지 확인한다 — DB를 건드리면 즉시 예외.
vi.mock('@/db', () => ({
  db: new Proxy(
    {},
    {
      get: (_, prop) => {
        throw new Error(`권한 판정 전에 DB에 접근했다: db.${String(prop)}`);
      },
    },
  ),
}));

import * as shoppingAccounts from './shopping/accounts/route';
import * as shoppingAccountById from './shopping/accounts/[id]/route';
import * as shoppingAccountStatus from './shopping/accounts/status/route';
import * as shoppingAccountDelete from './shopping/accounts/delete/route';
import * as shoppingSettings from './shopping/settings/route';
import * as shoppingSettingById from './shopping/settings/[id]/route';
import * as shoppingSettingStatus from './shopping/settings/status/route';
import * as shoppingSettingDelete from './shopping/settings/delete/route';
import * as accountUsers from './account/users/route';
import * as accountUsersCreate from './account/users/create/route';
import * as accountUsersApprove from './account/users/approve/route';

type Handler = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

interface RouteCase {
  name: string;
  handler: Handler;
  method: 'POST' | 'PATCH' | 'DELETE';
  allowed: UserGrade[];
}

const ALL_GRADES: UserGrade[] = ['super_admin', 'admin', 'operator'];
const SA_A: UserGrade[] = ['super_admin', 'admin'];
const SA: UserGrade[] = ['super_admin'];

// 권한 가드(requirePermission)를 단 route는 전부 여기에 넣는다. 조회 route(requireSession만)는 넣지 않는다.
const CASES: RouteCase[] = [
  { name: 'POST /shopping/accounts', handler: shoppingAccounts.POST as Handler, method: 'POST', allowed: SA_A },
  {
    name: 'PATCH /shopping/accounts/[id]',
    handler: shoppingAccountById.PATCH as Handler,
    method: 'PATCH',
    allowed: SA_A,
  },
  {
    name: 'PATCH /shopping/accounts/status',
    handler: shoppingAccountStatus.PATCH as Handler,
    method: 'PATCH',
    allowed: SA_A,
  },
  {
    name: 'POST /shopping/accounts/delete',
    handler: shoppingAccountDelete.POST as Handler,
    method: 'POST',
    allowed: SA_A,
  },
  { name: 'POST /shopping/settings', handler: shoppingSettings.POST as Handler, method: 'POST', allowed: SA_A },
  {
    name: 'PATCH /shopping/settings/[id]',
    handler: shoppingSettingById.PATCH as Handler,
    method: 'PATCH',
    allowed: SA_A,
  },
  {
    name: 'PATCH /shopping/settings/status',
    handler: shoppingSettingStatus.PATCH as Handler,
    method: 'PATCH',
    allowed: SA_A,
  },
  {
    name: 'POST /shopping/settings/delete',
    handler: shoppingSettingDelete.POST as Handler,
    method: 'POST',
    allowed: SA_A,
  },
  { name: 'POST /account/users/create', handler: accountUsersCreate.POST as Handler, method: 'POST', allowed: SA_A },
  { name: 'DELETE /account/users', handler: accountUsers.DELETE as Handler, method: 'DELETE', allowed: SA },
  { name: 'PATCH /account/users/approve', handler: accountUsersApprove.PATCH as Handler, method: 'PATCH', allowed: SA },
];

const sessionOf = (grade: UserGrade) => ({ id: 'usr_actor', ownerId: 'usr_owner', grade, email: 'actor@example.com' });
const ctx = { params: Promise.resolve({ id: 'any_id' }) };
const makeReq = (method: RouteCase['method']) =>
  new NextRequest('http://localhost/api/test', { method, body: JSON.stringify({ ids: ['any_id'] }) });

describe.each(CASES)('$name', ({ handler, method, allowed }) => {
  beforeEach(() => {
    getToken.mockReset();
  });

  const denied = ALL_GRADES.filter((grade) => !allowed.includes(grade));

  it.each(denied)('%s 등급이면 DB에 닿기 전에 403', async (grade) => {
    getToken.mockResolvedValue(sessionOf(grade));
    const res = await handler(makeReq(method), ctx);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: '권한이 없습니다.' });
  });

  it.each(allowed)('%s 등급은 권한 가드를 통과한다(403이 아니다)', async (grade) => {
    getToken.mockResolvedValue(sessionOf(grade));
    // 통과하면 DB 모킹이 예외를 던진다 — route가 500으로 받든 예외가 새든, 403만 아니면 된다.
    const res = await handler(makeReq(method), ctx).catch((error: unknown) => error);
    expect(res instanceof Response && res.status === 403).toBe(false);
  });
});
