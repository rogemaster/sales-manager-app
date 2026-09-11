import 'server-only';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// R2는 리전 개념이 없어 'auto'를 쓴다. 엔드포인트는 계정별 고정 주소다.
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const PRODUCT_IMAGE_PREFIX = 'images';

export type DetectedImage = { ext: 'png' | 'jpg'; contentType: 'image/png' | 'image/jpeg' };

/**
 * `file.type`은 브라우저가 보낸 값이라 위조된다. 실제 바이트(매직넘버)로 판정한다.
 * 반환값을 `buildImageKey`·`putImage`에 그대로 넘겨써야 클라이언트가 선언한 MIME이
 * 저장 경로·메타데이터에 섞이지 않는다.
 */
export const detectImageType = (buffer: Buffer): DetectedImage | null => {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  return null;
};

/**
 * 키 형태: `<prefix>/<ownerId>/<uuid>.<ext>`
 * 원본 파일명을 쓰지 않는다 — path traversal(`../../victim`)이나 과도한 길이가 키에 섞이는 것을
 * 타입으로 막는다(`ext`는 매직넘버 판정값인 리터럴 유니온만 받는다).
 */
export const buildImageKey = (prefix: string, ownerId: string, ext: DetectedImage['ext']): string => {
  return `${prefix}/${ownerId}/${uuidv4()}.${ext}`;
};

/**
 * 우리 버킷 공개 주소로 시작하면 R2 key로 되돌린다.
 *
 * 문자열 `startsWith` 비교가 아니라 `new URL()` 파싱을 쓴다 — 파서가 호스트를 소문자로 정규화하고
 * (RFC 4343·RFC 7230, 호스트명은 대소문자를 구분하지 않는다) pathname의 dot-segment(`..`)를
 * RFC 3986 §5.2.4대로 접어준다. 문자열 비교였다면 `Pub-Example.r2.dev`(대소문자 위장)나
 * `/images/usr_A/../usr_B/abc.png`(공개 URL 뒤 경로 조작)가 정규화를 피해 그대로 통과했다.
 *
 * 같은 호스트인지는 `origin`(스킴 포함)이 아니라 `host`(스킴 제외, 기본 포트는 생략)로 비교한다.
 * R2 공개 주소는 `http://` 요청을 `https://`로 301 리다이렉트한다(실측 확인) — origin으로 비교하면
 * `http://<공개호스트>/images/usr_남/…`이 스킴만 다르다는 이유로 "외부 도메인"으로 오분류돼 정규화를
 * 건너뛰고 그대로 통과해버린다. 같은 호스트는 정의상 우리 버킷이므로(같은 호스트를 가리키는 "외부
 * 이미지"는 존재할 수 없다) 스킴을 무시해도 잃는 게 없다.
 *
 * 다음 네 경우는 정규화하지 않고 원본을 그대로 돌려준다 — 표시가 안 될 뿐 새로 뚫리지는 않는다.
 * (1) 접두사가 비어 있음. (2) `mainImage`/접두사가 URL로 파싱되지 않음(=순수 key). (3) host가
 * 다름(=남의 도메인, 외부 절대 URL 통과 계약). (4) host는 같지만 공개 주소 자체에 경로가 붙어 있는
 * 커스텀 도메인(예: `https://cdn.example.com/bucket`, 스펙 §9)이라 대상 경로가 그 경로 접두사로
 * 시작하지 않음 — 이 경우도 남의 도메인과 마찬가지로 우리 버킷의 공개 주소 형태가 아니라고 본다.
 */
const normalizePublicUrl = (mainImage: string): string => {
  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (!base) return mainImage;

  let baseUrl: URL;
  let targetUrl: URL;
  try {
    baseUrl = new URL(base);
    targetUrl = new URL(mainImage);
  } catch {
    // 순수 key(`images/usr_.../abc.png`)는 URL이 아니므로 여기서 반드시 throw된다.
    // 원본을 그대로 돌려줘 기존 key 검사로 넘어가게 한다.
    return mainImage;
  }

  if (targetUrl.host !== baseUrl.host) return mainImage;

  const basePath = baseUrl.pathname === '/' ? '' : baseUrl.pathname.replace(/\/+$/, '');
  const prefix = `${basePath}/`;
  if (!targetUrl.pathname.startsWith(prefix)) return mainImage;

  return targetUrl.pathname.slice(prefix.length);
};

/**
 * 세그먼트를 퍼센트 디코딩한 값이 `.`(현재 경로) 또는 `..`(상위 경로)이면 dot-segment로 본다.
 * `%2e%2e`·`%2E%2E`(대문자)·`%2e.`(혼합)처럼 한 번 인코딩된 형태가 디코딩 후 `.`/`..`가 되면
 * 브라우저가 실제 요청 시 그 세그먼트를 dot-segment로 해석해 경로를 접어버리므로(RFC 3986 §5.2.4와
 * 동일한 효과), 리터럴 문자열 비교만으로는 놓친다. 반대로 `%252e%252e`(이중 인코딩)는 한 번 디코딩해도
 * `%2e%2e`일 뿐이라 dot-segment가 아니다 — 브라우저도 이걸 접지 않고 그 이름 그대로 요청하므로
 * traversal이 아니다. 막으면 오탐이다.
 *
 * `decodeURIComponent`는 잘못된 인코딩(`%zz`)에 `URIError`를 던진다. 그런 값은 애초에 dot-segment가
 * 될 수 없으므로 디코딩 실패 시 원본 세그먼트로 비교하면 충분하다 — 예외가 호출자에게 새어나가면
 * 안 된다.
 */
const isDotSegment = (segment: string): boolean => {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // 잘못된 인코딩은 디코딩 실패 — 원본 세그먼트로 비교를 이어간다.
  }
  return decoded === '.' || decoded === '..';
};

/**
 * `mainImage`는 R2 key와 외부 절대 URL의 합집합이다(`schema.ts` 참고). 외부 절대 URL 분기는 전환기
 * 코드다 — 엑셀 외부 이미지를 R2로 내려받는 작업이 끝나 값이 key로만 수렴하면 이 분기를 지운다
 * (`productImage.ts`의 같은 조건, 스펙 §3). **그 시점부터는 이 분기가 유일하게 남은 탈출구가 된다** —
 * 지우지 않고 남겨두면 값은 key로만 들어오는데 소유권 검사는 여전히 임의의 외부 절대 URL을 무조건
 * 통과시키는 상태로 남는다.
 *
 * key 형태 판정은 **화이트리스트**다. blocklist(변형 패턴을 하나씩 찾아 막는 방식)로 다섯 라운드에
 * 걸쳐 대소문자 위장 → 공개 URL의 dot-segment → 순수 key의 dot-segment → http 다운그레이드 → 퍼센트
 * 인코딩을 닫았는데, 그다음 **역슬래시 traversal**이 새어나갔다: 브라우저의 URL 파서는 http(s)에서
 * 역슬래시도 경로 구분자로 취급해 그 자리에서 경로를 접지만, `split('/')`는 역슬래시를 세그먼트 안의
 * 평범한 문자로 본다 — 같은 값을 두 집행 지점(브라우저와 이 함수)이 서로 다른 구분자 정의로 해석한
 * 것이 새는 지점이었다. 새 변형이 나올 때마다 한 겹씩 막는 이 방식은 구조적으로 끝나지 않는다.
 *
 * 그래서 "무엇을 막을까" 대신 "정상 key는 어떤 모양인가"로 뒤집는다. key를 만드는 곳은
 * `buildImageKey` 하나뿐이고 그 형태는 항상 `<prefix>/<ownerId>/<uuid>.<ext>` — 소유자 접두사 뒤에
 * 구분자가 하나도 없는 **단일 세그먼트**다. 이 모양이 아니면 무엇이든 거부한다.
 *
 * - 기존 dot-segment 검사(`isDotSegment`)는 그대로 두되 분리자에 역슬래시를 포함시켜, 역슬래시로
 *   쪼개지는 세그먼트도 `/`로 쪼갠 것과 동일하게 판정한다.
 * - 소유자 접두사(`images/<ownerId>/`)로 시작하지 않으면 거부한다. 끝의 `/`까지 비교해야 `usr_ab`가
 *   `usr_abcd`를 통과시키지 않는다.
 * - 접두사를 뗀 나머지가 비어 있거나 그 안에 `/`나 `\`가 하나라도 있으면 거부한다. 중첩 경로는
 *   `buildImageKey`가 만드는 형태가 아니므로 정상 key일 수 없다.
 *
 * 파일명 형태(예: uuid 정규식)까지는 제약하지 않는다. 기존 DB에 손으로 넣은 비uuid key가 있을 수
 * 있고, 그런 상품의 수정 요청까지 400으로 막을 이유는 없다 — 단일 세그먼트 조건만으로 traversal
 * 클래스 전체가 닫힌다.
 *
 * 우리 공개 주소 형태(`https://<공개호스트>/images/<owner>/...`)는 `normalizePublicUrl`이 먼저 key로
 * 되돌린 뒤 이 검사를 그대로 태운다. 접두사가 설정돼 있지 않거나 host가 다르면 원본을 그대로
 * 돌려주므로, 그 경우는 위 "외부 절대 URL" 분기로 판정된다.
 */
export const isMainImageOwnedBy = (mainImage: string, ownerId: string): boolean => {
  const value = normalizePublicUrl(mainImage);
  if (/^https?:\/\//.test(value)) return true;
  if (value.split(/[/\\]/).some(isDotSegment)) return false;

  const prefix = `${PRODUCT_IMAGE_PREFIX}/${ownerId}/`;
  if (!value.startsWith(prefix)) return false;

  const rest = value.slice(prefix.length);
  return rest.length > 0 && !/[/\\]/.test(rest);
};

/**
 * 값이 비면 endpoint가 `https://.r2.cloudflarestorage.com`으로 깨진 채 요청이 나가 원인 불명의 500이 된다.
 * 어느 변수가 비었는지 드러내되, 빌드와 무관한 테스트를 깨지 않으려고 import가 아닌 호출 시점에 검사한다.
 */
const assertR2Configured = (): void => {
  const required: Record<string, string | undefined> = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`R2 환경변수가 설정되지 않았습니다: ${missing.join(', ')}`);
  }
};

/**
 * R2는 객체 단위 ACL을 지원하지 않는다. `ACL: 'public-read'`를 넣으면 요청이 거부된다.
 * 공개 여부는 버킷 설정으로 정한다.
 */
export const putImage = async (key: string, body: Buffer, contentType: string): Promise<void> => {
  assertR2Configured();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
};
