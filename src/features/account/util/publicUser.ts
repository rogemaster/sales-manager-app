/** 사용자 행을 응답으로 내보낼 모양으로 바꾼다 — 비밀번호 해시는 절대 브라우저로 나가지 않는다. */
export const toPublicUser = <T extends { password: unknown }>(row: T): Omit<T, 'password'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...user } = row;
  return user;
};
