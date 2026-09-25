import { describe, it, expect } from 'vitest';
import { throwIfNotOk } from './apiResponse';
import { UnauthorizedError } from './unauthorized';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('throwIfNotOk', () => {
  it('성공 응답이면 아무것도 하지 않는다', async () => {
    await expect(throwIfNotOk(json(200, {}), '실패')).resolves.toBeUndefined();
  });

  it('401이면 UnauthorizedError다 — 전역 onError가 로그아웃시킨다', async () => {
    await expect(throwIfNotOk(json(401, { error: '...' }), '실패')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('서버가 보낸 사유가 있으면 그 문구로 던진다', async () => {
    await expect(throwIfNotOk(json(403, { error: '삭제 권한이 없습니다.' }), '실패')).rejects.toThrow(
      '삭제 권한이 없습니다.',
    );
  });

  it('사유가 없거나 비어 있으면 fallback이다', async () => {
    await expect(throwIfNotOk(json(500, {}), '계정 삭제 실패')).rejects.toThrow('계정 삭제 실패');
    await expect(throwIfNotOk(json(400, { error: '' }), '계정 삭제 실패')).rejects.toThrow('계정 삭제 실패');
  });

  it('본문이 JSON이 아니어도 fallback이다', async () => {
    await expect(throwIfNotOk(new Response('<html>', { status: 502 }), '조회 실패')).rejects.toThrow('조회 실패');
  });
});
