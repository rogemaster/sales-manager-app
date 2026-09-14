import { afterEach, describe, expect, it, vi } from 'vitest';

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

  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  // 2026-09-13부터 mainImage는 key만 담는다. 엑셀 외부 이미지도 가져오기 route를 거쳐 key가 된다.
  it('외부 절대 URL은 거부한다', () => {
    expect(isMainImageOwnedBy('https://loremflickr.com/700/700/cat', OWNER)).toBe(false);
    expect(isMainImageOwnedBy('http://example.com/a.png', OWNER)).toBe(false);
  });

  // 공개 주소를 key로 되돌리는 정규화를 지웠다. 남겨두면 본인 공개 주소 전체가 통과해 URL이 그대로 저장되고,
  // 표시할 때 접두사가 한 번 더 붙어 깨진다. 공개 주소 형태는 본인 key여도, 어떤 변형이어도 거부한다.
  it.each([
    `https://pub-example.r2.dev/images/${OWNER}/abc.png`,
    `https://Pub-Example.r2.dev/images/${OWNER}/abc.png`,
    `http://pub-example.r2.dev/images/${OWNER}/abc.png`,
    `https://pub-example.r2.dev:443/images/${OWNER}/abc.png`,
    'https://pub-example.r2.dev/images/usr_intruder/abc.png',
    `https://pub-example.r2.dev/images/${OWNER}/../usr_intruder/abc.png`,
    `https://pub-example.r2.dev/images/${OWNER}/..\\usr_intruder/abc.png`,
  ])('우리 공개 주소 형태는 본인 key여도 거부한다: %s', (value) => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy(value, OWNER)).toBe(false);
  });

  it('접두사 없이 순수 key 경로에 ..가 섞이면 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/../usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  it('파일명에 점 두 개가 연달아 있는 정상 key는 통과한다', () => {
    // 세그먼트가 정확히 '..'일 때만 거부해야 한다. 'a..b.png'는 오탐 대상이 아니다.
    expect(isMainImageOwnedBy(`images/${OWNER}/a..b.png`, OWNER)).toBe(true);
  });

  // 브라우저가 실제 요청 시 dot-segment로 해석해 경로를 접어버리는 인코딩 변형을 디코딩 후 직접 탐지한다.
  it('퍼센트 인코딩된 ..(%2e%2e) 세그먼트가 섞인 순수 key는 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/%2e%2e/usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  it('대문자로 인코딩된 ..(%2E%2E) 세그먼트가 섞인 순수 key는 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/%2E%2E/usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  it('리터럴과 인코딩이 섞인 ..(%2e.) 세그먼트가 섞인 순수 key는 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/%2e./usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  it('퍼센트 인코딩된 단일 .(%2e) 세그먼트가 섞인 순수 key는 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/%2e/usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  it('이중 인코딩(%252e%252e)은 dot-segment는 아니지만 중첩 경로라 거부한다', () => {
    // "traversal인가"가 아니라 "정상 key 형태인가"를 묻는다. buildImageKey가 만드는 key는 소유자 접두사 뒤에
    // 구분자 없는 단일 세그먼트뿐이라, 접두사 뒤에 `/`가 더 있는 이 값은 traversal 여부와 무관하게 거부된다.
    expect(isMainImageOwnedBy(`images/${OWNER}/%252e%252e/usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  // 브라우저의 URL 파서는 http(s)에서 역슬래시도 경로 구분자로 취급해 그 자리에서 경로를 접는다.
  // `/`로만 쪼개면 이 세그먼트('..\\usr_intruder')를 dot-segment로 보지 못한다.
  it('역슬래시로 상위 디렉터리를 탈출하는 key는 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/..\\usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  it('역슬래시 2단으로 탈출하는 key도 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/..\\..\\usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  // dot-segment가 아니어도 화이트리스트(소유자 접두사 뒤 구분자 없는 단일 세그먼트)를 벗어나면 거부한다.
  it('dot-segment가 아니어도 접두사 뒤에 중첩 경로가 있으면 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/sub/abc.png`, OWNER)).toBe(false);
  });
});
