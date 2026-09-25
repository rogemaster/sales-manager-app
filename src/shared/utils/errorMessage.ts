/**
 * 알림에 보여줄 오류 문구. api 함수가 서버 사유를 담아 던진 Error면 그 문구를, 아니면 화면의 기본 문구를 쓴다.
 * (서버 메시지를 onError에서 고정 문구로 덮지 않는다 — excel.md "알림" 규칙)
 */
export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;
