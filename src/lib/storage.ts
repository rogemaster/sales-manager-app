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
 * `mainImage`는 R2 key만 담는다(`schema.ts` 참고). 화면 업로드는 `/api/products/image`, 엑셀의 외부 이미지
 * 주소는 `/api/products/image/import`를 거쳐 key가 되므로 key 모양이 아닌 값은 전부 거부한다.
 *
 * **절대 URL은 어떤 형태든 거부한다 — 우리 공개 주소 형태의 본인 key도 마찬가지다.** 외부 URL을 통과시키던
 * 시기에는 공개 주소를 key로 되돌리는 정규화를 두어 "공개 주소로 위장한 남의 key"를 막았다. 그 계약이
 * 사라진 뒤에도 정규화를 남기면 본인 공개 주소 전체가 통과해 route가 **URL을 그대로 DB에 저장**하고, 표시할 때
 * 접두사가 한 번 더 붙어 깨진 주소가 된다. 그래서 정규화를 함께 지웠다.
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
 * - dot-segment 검사(`isDotSegment`)는 분리자에 역슬래시를 포함시켜, 역슬래시로 쪼개지는 세그먼트도
 *   `/`로 쪼갠 것과 동일하게 판정한다.
 * - 소유자 접두사(`images/<ownerId>/`)로 시작하지 않으면 거부한다. 끝의 `/`까지 비교해야 `usr_ab`가
 *   `usr_abcd`를 통과시키지 않는다. 절대 URL은 여기서 걸린다.
 * - 접두사를 뗀 나머지가 비어 있거나 그 안에 `/`나 `\`가 하나라도 있으면 거부한다. 중첩 경로는
 *   `buildImageKey`가 만드는 형태가 아니므로 정상 key일 수 없다.
 *
 * 파일명 형태(예: uuid 정규식)까지는 제약하지 않는다. 기존 DB에 손으로 넣은 비uuid key가 있을 수
 * 있고, 그런 상품의 수정 요청까지 400으로 막을 이유는 없다 — 단일 세그먼트 조건만으로 traversal
 * 클래스 전체가 닫힌다.
 */
export const isMainImageOwnedBy = (mainImage: string, ownerId: string): boolean => {
  if (mainImage.split(/[/\\]/).some(isDotSegment)) return false;

  const prefix = `${PRODUCT_IMAGE_PREFIX}/${ownerId}/`;
  if (!mainImage.startsWith(prefix)) return false;

  const rest = mainImage.slice(prefix.length);
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
