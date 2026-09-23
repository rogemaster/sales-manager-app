/** authorize(서버)가 던지고 useAuthForm(클라이언트)이 비교하는 로그인 거부 코드. 두 곳이 이 상수 하나를 쓴다. */
export const LOGIN_ERROR_CODE = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
} as const;
