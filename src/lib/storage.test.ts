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

  // 삭제 조건(스펙 §3): 엑셀 외부 이미지를 R2로 내려받는 작업이 끝나 mainImage가 key로만 수렴하면
  // 이 분기는 지운다. `productImage.ts`의 같은 조건과 짝이다 — 한쪽만 지우면 표시는 key로만 되는데
  // 소유권 검사는 여전히 임의의 외부 절대 URL을 통과시키는 탈출구가 남는다.
  it('외부 절대 URL은 통과한다 — 엑셀 대량등록·시드 데이터의 계약이다', () => {
    expect(isMainImageOwnedBy('https://loremflickr.com/700/700/cat', OWNER)).toBe(true);
    expect(isMainImageOwnedBy('http://example.com/a.png', OWNER)).toBe(true);
  });

  // 위 '외부 절대 URL은 통과한다' 계약의 대가로 열려 있던 우회로를 닫은 자리다.
  // 우리 공개 주소로 시작하는 값은 key로 되돌린 뒤 같은 소유자 검사를 태운다.
  it('우리 공개 주소로 위장한 남의 key는 거부한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy('https://pub-example.r2.dev/images/usr_intruder/abc.png', OWNER)).toBe(false);
  });

  it('우리 공개 주소 형태의 본인 key는 통과한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy(`https://pub-example.r2.dev/images/${OWNER}/abc.png`, OWNER)).toBe(true);
  });

  it('공개 주소가 설정돼 있지 않으면 정규화할 수 없어 기존 동작을 유지한다', () => {
    // 표시가 안 될 뿐 새로 뚫리지는 않는다. 접두사를 넣는 것이 이 검사의 전제다(스펙 §5.2).
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', '');
    expect(isMainImageOwnedBy('https://pub-example.r2.dev/images/usr_intruder/abc.png', OWNER)).toBe(true);
  });

  // 문자열 startsWith 비교였다면 호스트 대소문자 위장이 정규화를 피해 그대로 통과했다.
  // URL 파싱은 호스트를 소문자로 정규화하므로(RFC 4343·RFC 7230) 구조적으로 막힌다.
  it('호스트 대소문자가 달라도 남의 key는 거부한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy('https://Pub-Example.r2.dev/images/usr_intruder/abc.png', OWNER)).toBe(false);
  });

  it('호스트 대소문자가 달라도 본인 key는 통과한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy(`https://Pub-Example.r2.dev/images/${OWNER}/abc.png`, OWNER)).toBe(true);
  });

  // 공개 URL 뒤 경로에 `..`가 섞이면, 브라우저는 요청 전에 dot-segment를 접어(RFC 3986 §5.2.4)
  // 실제로는 다른 경로를 받아온다. URL 파싱이 같은 방식으로 접어주므로 검사도 같은 결과를 봐야 한다.
  it('공개 주소 뒤 경로에 ..가 섞이면 거부한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy(`https://pub-example.r2.dev/images/${OWNER}/../usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  // 공개 주소 접두사 없이 순수 key로 곧장 들어오는 경우다. normalizePublicUrl은 URL이 아닌 값을
  // 그대로 돌려주므로, 이 방어는 isMainImageOwnedBy 자신의 세그먼트 검사가 맡는다.
  it('접두사 없이 순수 key 경로에 ..가 섞이면 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/../usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  it('파일명에 점 두 개가 연달아 있는 정상 key는 통과한다', () => {
    // 세그먼트가 정확히 '..'일 때만 거부해야 한다. 'a..b.png'는 오탐 대상이 아니다.
    expect(isMainImageOwnedBy(`images/${OWNER}/a..b.png`, OWNER)).toBe(true);
  });

  it('공개 주소 끝에 슬래시가 붙어 있어도 본인 key가 통과한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev/');
    expect(isMainImageOwnedBy(`https://pub-example.r2.dev/images/${OWNER}/abc.png`, OWNER)).toBe(true);
  });

  // R2 공개 주소는 http 요청을 https로 301 리다이렉트한다(실측 확인). origin(스킴 포함) 비교였다면
  // 스킴만 다른 이 값이 "외부 도메인"으로 오분류돼 정규화를 건너뛰고 그대로 통과했다.
  it('http로 다운그레이드한 주소로 남의 key를 걸면 거부한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy('http://pub-example.r2.dev/images/usr_intruder/abc.png', OWNER)).toBe(false);
  });

  it('http로 다운그레이드한 주소의 본인 key는 통과한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy(`http://pub-example.r2.dev/images/${OWNER}/abc.png`, OWNER)).toBe(true);
  });

  it('기본 포트가 명시된 주소의 본인 key는 통과한다', () => {
    // host는 기본 포트(https의 443)를 생략하므로 명시 여부와 무관하게 같은 값이 된다.
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy(`https://pub-example.r2.dev:443/images/${OWNER}/abc.png`, OWNER)).toBe(true);
  });

  // 순수 key는 normalizePublicUrl이 정규화하지 않으므로(new URL()이 throw), 브라우저가 실제 요청 시
  // dot-segment로 해석해 경로를 접어버리는 인코딩 변형을 여기서 디코딩 후 직접 탐지해야 한다.
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
    // 이전 라운드는 "traversal인가"만 물어 true였다 — %25를 %로 한 번만 푸는 브라우저도 이 세그먼트를
    // dot-segment로 접지 않으므로 그 판단 자체는 맞다. 하지만 지금은 층이 다른 질문을 던진다 —
    // "정상 key 형태인가." buildImageKey가 만드는 key는 소유자 접두사 뒤에 구분자 없는 단일 세그먼트뿐이고,
    // 이 값은 접두사 뒤에 `/`가 더 있는 중첩 경로이므로 그 모양이 아니다. traversal 여부와 무관하게 거부된다.
    expect(isMainImageOwnedBy(`images/${OWNER}/%252e%252e/usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  // C-1: 브라우저의 URL 파서는 http(s)에서 역슬래시도 경로 구분자로 취급해 그 자리에서 경로를 접는다.
  // 이전 라운드의 dot-segment 검사는 `/`로만 쪼개 이 세그먼트('..\\usr_intruder')를 dot-segment로
  // 보지 못했고, 뒤이은 접두사 검사는 여전히 `images/${OWNER}/`로 시작한다는 이유로 통과시켰다 —
  // 실측하면 브라우저는 이 값을 `/images/usr_intruder/abc.png`로 풀어 다른 테넌트의 파일을 받아온다.
  it('역슬래시로 상위 디렉터리를 탈출하는 key는 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/..\\usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  it('역슬래시 2단으로 탈출하는 key도 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/..\\..\\usr_intruder/abc.png`, OWNER)).toBe(false);
  });

  // 공개 주소 형태는 new URL() 파싱 단계에서 이미 역슬래시가 접혀 다른 host/path로 풀리므로,
  // 정규화된 뒤 값은 본인 접두사와 무관해져 거부된다 — 순수 key와 같은 결론이되 경로가 다르다.
  it('공개 주소 뒤 경로에 역슬래시 탈출 시도가 섞이면 거부한다', () => {
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://pub-example.r2.dev');
    expect(isMainImageOwnedBy(`https://pub-example.r2.dev/images/${OWNER}/..\\usr_intruder/abc.png`, OWNER)).toBe(
      false,
    );
  });

  // dot-segment가 아니어도 화이트리스트(소유자 접두사 뒤 구분자 없는 단일 세그먼트)를 벗어나면 거부한다.
  // buildImageKey는 절대 하위 디렉터리를 만들지 않으므로 이런 값은 애초에 정상 key일 수 없다.
  it('dot-segment가 아니어도 접두사 뒤에 중첩 경로가 있으면 거부한다', () => {
    expect(isMainImageOwnedBy(`images/${OWNER}/sub/abc.png`, OWNER)).toBe(false);
  });
});
