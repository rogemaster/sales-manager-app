import { describe, expect, it, vi } from 'vitest';

// 'server-only'는 react-server 조건이 아닌 일반 Node 환경(vitest)에서 require되면
// 무조건 Error를 throw하는 마커 패키지다. storage.ts가 최상단에서 이 모듈을 import하므로
// 테스트 환경에서는 빈 모듈로 대체해야 대상 모듈을 로드할 수 있다.
vi.mock('server-only', () => ({}));

import { buildImageKey, detectImageType, isMainImageOwnedBy } from '@/lib/storage';

describe('detectImageType', () => {
  it('PNG 매직넘버(89 50 4E 47)를 png로 판정한다', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageType(buffer)).toEqual({ ext: 'png', contentType: 'image/png' });
  });

  it('JPEG 매직넘버(FF D8 FF)를 jpg로 판정한다', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageType(buffer)).toEqual({ ext: 'jpg', contentType: 'image/jpeg' });
  });

  it('이미지가 아닌 바이트는 null을 반환한다', () => {
    const buffer = Buffer.from('이것은 텍스트 파일입니다', 'utf-8');
    expect(detectImageType(buffer)).toBeNull();
  });

  it('너무 짧은/빈 버퍼는 null을 반환한다', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});

describe('buildImageKey', () => {
  const KEY_PATTERN = /^images\/[^/]+\/[0-9a-f-]{36}\.(png|jpg)$/;

  it('detectImageType이 판정한 확장자로 키를 만든다 (png)', () => {
    const key = buildImageKey('images', 'usr_abcdef12', 'png');
    expect(key).toMatch(KEY_PATTERN);
    expect(key.startsWith('images/usr_abcdef12/')).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
  });

  it('detectImageType이 판정한 확장자로 키를 만든다 (jpg)', () => {
    const key = buildImageKey('images', 'usr_abcdef12', 'jpg');
    expect(key).toMatch(KEY_PATTERN);
    expect(key.endsWith('.jpg')).toBe(true);
  });

  it('키 형태가 항상 images/<ownerId>/<uuid>.(png|jpg)를 따른다 — 호출자가 준 임의 텍스트가 확장자 자리에 나타날 수 없다', () => {
    const key = buildImageKey('images', 'usr_00000000', 'png');
    expect(key).toMatch(/^images\/usr_00000000\/[0-9a-f-]{36}\.png$/);
  });
});

// 상품 생성·수정·대량등록 세 route가 공유하는 유일한 인가 판정 함수다.
// 여기가 틀리면 다른 테넌트가 업로드한 R2 객체를 자기 상품에 걸 수 있다.
describe('isMainImageOwnedBy', () => {
  const OWNER = 'usr_2f20748f';

  it('본인 네임스페이스의 key는 통과한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/8f14e45f-e0b1-4b6e-9a3c-1d2e3f4a5b6c.png`, OWNER)).toBe(true);
  });

  it('다른 테넌트의 key는 거부한다', () => {
    expect(isMainImageOwnedBy('images/usr_intruder/8f14e45f-e0b1-4b6e-9a3c-1d2e3f4a5b6c.png', OWNER)).toBe(false);
  });

  it('ownerId가 접두사로만 겹치는 경우를 거부한다', () => {
    // 경계 문자(/)까지 비교하지 않으면 usr_2f20748f9999가 usr_2f20748f로 통과한다
    expect(isMainImageOwnedBy(`images/${OWNER}9999/abc.png`, OWNER)).toBe(false);
  });

  it('prefix가 다르면 거부한다', () => {
    expect(isMainImageOwnedBy(`avatars/${OWNER}/abc.png`, OWNER)).toBe(false);
  });

  it('빈 문자열·상대경로 탈출 시도를 거부한다', () => {
    expect(isMainImageOwnedBy('', OWNER)).toBe(false);
    expect(isMainImageOwnedBy(`../images/${OWNER}/abc.png`, OWNER)).toBe(false);
  });

  it('외부 절대 URL은 통과한다 — 엑셀 대량등록·시드 데이터의 계약이다', () => {
    expect(isMainImageOwnedBy('https://loremflickr.com/700/700/cat', OWNER)).toBe(true);
    expect(isMainImageOwnedBy('http://example.com/a.png', OWNER)).toBe(true);
  });

  it('[알려진 우회로] 우리 버킷 공개 URL 형태면 남의 객체도 통과한다', () => {
    // 절대 URL을 무조건 통과시키는 계약의 대가다. 표시 코드가 없는 지금은 무해하지만,
    // 공개 URL(NEXT_PUBLIC_R2_PUBLIC_URL)이 붙는 라운드에서는 이 URL을 key로 정규화해
    // 같은 검사를 태워야 한다. 그 시점에 이 테스트의 기대값을 false로 뒤집는다.
    expect(isMainImageOwnedBy('https://pub-example.r2.dev/images/usr_intruder/abc.png', OWNER)).toBe(true);
  });
});
