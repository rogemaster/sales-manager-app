import { afterEach, describe, expect, it, vi } from 'vitest';
import { toProductImageUrl } from '@/features/products/util/productImage';

const PUBLIC_URL = 'https://pub-test.r2.dev';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('toProductImageUrl', () => {
  it('R2 key 앞에 공개 주소 접두사를 붙인다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', PUBLIC_URL);
    expect(toProductImageUrl('images/usr_2f20748f/abc.png')).toBe(`${PUBLIC_URL}/images/usr_2f20748f/abc.png`);
  });

  it('접두사 끝의 슬래시가 중복되지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', `${PUBLIC_URL}/`);
    expect(toProductImageUrl('images/usr_2f20748f/abc.png')).toBe(`${PUBLIC_URL}/images/usr_2f20748f/abc.png`);
  });

  it('접두사가 설정돼 있지 않으면 빈 문자열을 돌려준다 — 화면이 대체 표시를 낸다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', '');
    expect(toProductImageUrl('images/usr_2f20748f/abc.png')).toBe('');
  });

  it('빈 값을 받으면 빈 문자열을 돌려준다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', PUBLIC_URL);
    expect(toProductImageUrl('')).toBe('');
  });
});
