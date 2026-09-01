// Vercel의 요청 본문 제한 4.5MB 아래로 여유를 둔 값. 초과 요청은 route 도달 전에 413으로 끊기므로
// 클라이언트가 파일 선택 시점에 먼저 검사해야 사용자가 의미 있는 메시지를 본다.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// 기존 `acceptImage`(src/constant/accept.content.ts)와 같은 목록이어야 한다.
export const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg'] as const;
