import { describe, expect, it } from 'vitest';
import { authenticate, extractApiKey } from './auth';
import { createFakeRepository } from './fakeRepository';

const SELLER = { id: 'seller_1', apiKey: 'key-1', name: '테스트 판매자' };

describe('extractApiKey', () => {
  it('Bearer 토큰에서 키를 꺼낸다', () => {
    expect(extractApiKey('Bearer key-1')).toBe('key-1');
  });

  it('헤더가 없으면 null이다', () => {
    expect(extractApiKey(null)).toBeNull();
  });

  it('Bearer가 아니면 null이다', () => {
    expect(extractApiKey('key-1')).toBeNull();
  });

  it('키가 비어 있으면 null이다', () => {
    expect(extractApiKey('Bearer    ')).toBeNull();
  });
});

describe('authenticate', () => {
  it('키가 맞으면 판매자를 준다', async () => {
    const repository = createFakeRepository({ sellers: [SELLER] });
    const result = await authenticate(repository, 'Bearer key-1');
    expect(result).toEqual({ ok: true, data: SELLER });
  });

  it('키가 없으면 UNAUTHORIZED다', async () => {
    const repository = createFakeRepository({ sellers: [SELLER] });
    const result = await authenticate(repository, null);
    expect(result).toEqual({ ok: false, reason: 'UNAUTHORIZED', invalidInputs: [] });
  });

  it('없는 키면 UNAUTHORIZED다', async () => {
    const repository = createFakeRepository({ sellers: [SELLER] });
    const result = await authenticate(repository, 'Bearer wrong-key');
    expect(result).toEqual({ ok: false, reason: 'UNAUTHORIZED', invalidInputs: [] });
  });
});
