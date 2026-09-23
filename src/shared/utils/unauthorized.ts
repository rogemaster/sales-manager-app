/** 서버가 세션을 거부했다(401). 삭제·비활성 계정의 토큰이거나 토큰이 없다. */
export class UnauthorizedError extends Error {
  constructor() {
    super('로그인이 필요합니다.');
    this.name = 'UnauthorizedError';
  }
}

/**
 * api 함수에서 `if (!response.ok)` 바로 앞에 부른다. 401만 구분해 던지고 나머지는 호출부에 맡긴다.
 * 이 오류는 appQueryClient의 전역 onError가 받아 로그아웃시킨다.
 */
export const throwIfUnauthorized = (response: Response): void => {
  if (response.status === 401) throw new UnauthorizedError();
};

export const isUnauthorizedError = (error: unknown): error is UnauthorizedError => error instanceof UnauthorizedError;
