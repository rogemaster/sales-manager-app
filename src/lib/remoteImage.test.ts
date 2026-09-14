import { describe, expect, it, vi } from 'vitest';

// storage.test.ts와 같은 이유 — server-only는 일반 Node 환경에서 import하면 throw한다.
vi.mock('server-only', () => ({}));

import {
  isBlockedAddress,
  parseRemoteImageUrl,
  readImageUrl,
  RemoteImageError,
  remoteImageErrorMessage,
  resolveRedirectUrl,
  safeLookup,
} from '@/lib/remoteImage';

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof RemoteImageError ? error.code : 'NOT_REMOTE_IMAGE_ERROR';
  }
};

describe('isBlockedAddress', () => {
  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '224.0.0.1',
    '255.255.255.255',
  ])('차단 대상 IPv4 %s 를 막는다', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '172.32.0.1', '100.128.0.1', '1.1.1.1'])('공인 IPv4 %s 는 통과한다', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });

  it.each(['::', '::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1'])('차단 대상 IPv6 %s 를 막는다', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it('IPv4가 매핑된 IPv6는 내장된 IPv4로 판정한다', () => {
    expect(isBlockedAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedAddress('::ffff:7f00:1')).toBe(true);
    expect(isBlockedAddress('::ffff:8.8.8.8')).toBe(false);
  });

  it('NAT64 주소는 내장된 IPv4로 판정한다', () => {
    expect(isBlockedAddress('64:ff9b::a9fe:a9fe')).toBe(true);
    expect(isBlockedAddress('64:ff9b::808:808')).toBe(false);
  });

  it('공인 IPv6는 통과한다', () => {
    expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false);
  });

  it('IP로 판정할 수 없는 값은 막는다', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true);
    expect(isBlockedAddress('')).toBe(true);
  });
});

describe('parseRemoteImageUrl', () => {
  it('정상 https 주소는 URL로 돌려준다', () => {
    expect(parseRemoteImageUrl('https://picsum.photos/seed/a/700/700').hostname).toBe('picsum.photos');
  });

  it.each(['ftp://example.com/a.png', 'file:///etc/passwd', 'javascript:alert(1)', 'not a url', ''])(
    '허용하지 않는 형식 %s 는 INVALID_URL',
    (value) => {
      expect(codeOf(() => parseRemoteImageUrl(value))).toBe('INVALID_URL');
    },
  );

  it('기본 포트가 아니면 INVALID_URL', () => {
    expect(codeOf(() => parseRemoteImageUrl('https://example.com:8443/a.png'))).toBe('INVALID_URL');
    expect(codeOf(() => parseRemoteImageUrl('http://example.com:443/a.png'))).toBe('INVALID_URL');
  });

  it('기본 포트를 명시한 주소는 통과한다', () => {
    expect(parseRemoteImageUrl('https://example.com:443/a.png').hostname).toBe('example.com');
  });

  it('자격증명이 들어간 주소는 INVALID_URL', () => {
    expect(codeOf(() => parseRemoteImageUrl('https://user:pass@example.com/a.png'))).toBe('INVALID_URL');
  });

  it.each([
    'http://127.0.0.1/a.png',
    'http://169.254.169.254/latest/meta-data',
    'http://2130706433/a.png',
    'http://0x7f.1/a.png',
    'http://[::1]/a.png',
    'http://[::ffff:127.0.0.1]/a.png',
  ])('IP 리터럴이 차단 대상이면 BLOCKED_ADDRESS: %s', (value) => {
    expect(codeOf(() => parseRemoteImageUrl(value))).toBe('BLOCKED_ADDRESS');
  });
});

describe('readImageUrl', () => {
  it('문자열 url을 앞뒤 공백을 떼고 돌려준다', () => {
    expect(readImageUrl({ url: '  https://example.com/a.png ' })).toBe('https://example.com/a.png');
  });

  it.each([
    null,
    undefined,
    'https://example.com/a.png',
    {},
    { url: null },
    { url: undefined },
    { url: 123 },
    { url: '   ' },
  ])('형식이 맞지 않으면 null: %j', (body) => {
    expect(readImageUrl(body)).toBeNull();
  });

  it('2048자를 넘으면 null', () => {
    expect(readImageUrl({ url: `https://example.com/${'a'.repeat(2048)}` })).toBeNull();
  });
});

describe('remoteImageErrorMessage', () => {
  it('HTTP_ERROR는 상태 코드를 싣는다', () => {
    expect(remoteImageErrorMessage(new RemoteImageError('HTTP_ERROR', 404))).toBe(
      '이미지를 불러올 수 없습니다(HTTP 404).',
    );
  });

  it('NOT_IMAGE 메시지', () => {
    expect(remoteImageErrorMessage(new RemoteImageError('NOT_IMAGE'))).toBe('PNG 또는 JPG 이미지가 아닙니다.');
  });
});

describe('resolveRedirectUrl', () => {
  const current = new URL('https://example.com/a.png');

  it('상대 경로 location은 현재 URL을 기준으로 해석한다', () => {
    expect(resolveRedirectUrl('/next.png', current).toString()).toBe('https://example.com/next.png');
  });

  it.each(['http://[', 'https://exa mple.com/', '//[::1', 'http://a:b'])(
    '현재 URL을 기준으로도 해석할 수 없는 location %s 는 INVALID_URL',
    (location) => {
      expect(codeOf(() => resolveRedirectUrl(location, current))).toBe('INVALID_URL');
    },
  );

  it('차단 대상 주소로의 리다이렉트는 BLOCKED_ADDRESS', () => {
    expect(codeOf(() => resolveRedirectUrl('http://127.0.0.1/', current))).toBe('BLOCKED_ADDRESS');
  });
});

describe('safeLookup', () => {
  it('localhost처럼 내부 주소로 풀리는 호스트는 연결 전에 거부한다', async () => {
    const error = await new Promise<unknown>((resolve) => {
      safeLookup('localhost', {}, (err) => resolve(err));
    });
    expect(error).toBeInstanceOf(RemoteImageError);
    expect((error as RemoteImageError).code).toBe('BLOCKED_ADDRESS');
  });
});
