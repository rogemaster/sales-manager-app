/**
 * 그대로 limit/offset에 넣으면 테넌트 전체를 한 번에 긁거나(큰 pageSize),
 * offset이 음수가 되어 원인 불명의 500이 된다(page 0).
 */
export const clampPositiveInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};
