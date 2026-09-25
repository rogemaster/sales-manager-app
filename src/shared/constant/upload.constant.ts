// Vercel의 요청 본문 제한 4.5MB 아래로 여유를 둔 값. 초과 요청은 route 도달 전에 413으로 끊기므로
// 클라이언트가 파일 선택 시점에 먼저 검사해야 사용자가 의미 있는 메시지를 본다.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg'] as const;

/** 파일 선택 창의 accept 값. 서버가 받는 목록과 같아야 하므로 ALLOWED_IMAGE_MIME에서 만든다. */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_MIME.join(', ');

// 엑셀 이미지 확인·가져오기의 동시 요청 수. 업로드와 저장이 같은 값을 쓴다.
export const REMOTE_IMAGE_CONCURRENCY = 4;

/** 이미지 주소(외부 URL 또는 R2 key)의 최대 길이. 상품 쓰기 스키마의 mainImage 상한과 엑셀 이미지 주소 확인이 같이 쓴다. */
export const MAX_IMAGE_URL_LENGTH = 2048;

/** 문구의 용량 표기. MAX_IMAGE_BYTES를 바꾸면 모든 안내 문구가 따라간다. */
export const MAX_IMAGE_SIZE_LABEL = `${MAX_IMAGE_BYTES / 1024 / 1024}MB`;

export const IMAGE_UPLOAD_TOO_LARGE_MESSAGE = `${MAX_IMAGE_SIZE_LABEL} 이하 이미지를 업로드해 주세요.`;
export const IMAGE_UPLOAD_TYPE_MESSAGE = 'PNG 또는 JPG 이미지만 업로드할 수 있습니다.';
export const IMAGE_NOT_OWNED_MESSAGE = '본인이 업로드한 이미지만 사용할 수 있습니다.';
export const INVALID_IMAGE_URL_MESSAGE = '올바른 이미지 주소가 아닙니다.';
