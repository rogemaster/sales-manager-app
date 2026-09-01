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
 * `mainImage`는 R2 key와 외부 절대 URL의 합집합이다(`schema.ts` 참고). 절대 URL은 그 계약이라 통과시키고,
 * key 형태면 요청자 본인의 네임스페이스로 시작하는지 본다 — 아니면 남이 올린 R2 객체를 자기 상품에 걸 수 있다.
 * 끝의 `/`까지 비교해야 `usr_ab`가 `usr_abcd`를 통과시키지 않는다.
 */
export const isMainImageOwnedBy = (mainImage: string, ownerId: string): boolean => {
  if (/^https?:\/\//.test(mainImage)) return true;
  return mainImage.startsWith(`${PRODUCT_IMAGE_PREFIX}/${ownerId}/`);
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
