import { throwIfUnauthorized } from './unauthorized';

/**
 * api 함수의 공통 실패 처리. 401은 UnauthorizedError(전역 로그아웃), 그 밖의 실패는
 * 서버가 보낸 `{ error }` 사유를 담아 던지고, 사유가 없으면 fallback을 쓴다.
 * 서버 사유를 고정 문구로 덮지 않는다 — 화면은 getErrorMessage로 이 문구를 그대로 보여준다.
 */
export const throwIfNotOk = async (response: Response, fallback: string): Promise<void> => {
  throwIfUnauthorized(response);
  if (response.ok) return;

  const body: unknown = await response.json().catch(() => null);
  const message = (body as { error?: unknown } | null)?.error;
  throw new Error(typeof message === 'string' && message ? message : fallback);
};
