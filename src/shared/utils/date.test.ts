import { describe, expect, it } from 'vitest';
import { isYmd, toKstDateRange, toKstYmd } from './date';

describe('toKstDateRange', () => {
  it('start는 KST 자정 = UTC 전날 15:00 이다', () => {
    const { start } = toKstDateRange('2026-09-01', '2026-09-01');
    expect(start.toISOString()).toBe('2026-08-31T15:00:00.000Z');
  });

  it('하루짜리 범위는 정확히 24시간이다', () => {
    const { start, endExclusive } = toKstDateRange('2026-09-01', '2026-09-01');
    expect(endExclusive.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('끝날짜 당일 오후에 등록된 건이 범위에 포함된다', () => {
    // lte(endDate) 방식이면 여기서 누락된다
    const { start, endExclusive } = toKstDateRange('2026-09-01', '2026-09-05');
    const registered = new Date('2026-09-05T14:30:00+09:00');
    expect(registered.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(registered.getTime()).toBeLessThan(endExclusive.getTime());
  });

  it('KST 오전 8시 등록 건이 그날 범위에 잡힌다', () => {
    // UTC 기준으로 자르면 전날(08-31)로 밀린다
    const { start, endExclusive } = toKstDateRange('2026-09-01', '2026-09-01');
    const registered = new Date('2026-09-01T08:00:00+09:00');
    expect(registered.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(registered.getTime()).toBeLessThan(endExclusive.getTime());
  });

  it('끝날짜 다음날 00:00 KST는 범위 밖이다', () => {
    const { endExclusive } = toKstDateRange('2026-09-01', '2026-09-05');
    const registered = new Date('2026-09-06T00:00:00+09:00');
    expect(registered.getTime()).toBeGreaterThanOrEqual(endExclusive.getTime());
  });
});

describe('isYmd', () => {
  it('YYYY-MM-DD 형식의 실재하는 날짜만 통과한다', () => {
    expect(isYmd('2026-09-01')).toBe(true);
    expect(isYmd('2024-02-29')).toBe(true); // 윤년
  });

  it('존재하지 않는 날짜를 거부한다 — dayjs는 이런 값을 굴려서 valid로 답한다', () => {
    expect(isYmd('2026-02-31')).toBe(false);
    expect(isYmd('2026-13-01')).toBe(false);
    expect(isYmd('2025-02-29')).toBe(false); // 평년
  });

  it('형식이 다른 값을 거부한다', () => {
    expect(isYmd('2026-9-1')).toBe(false);
    expect(isYmd('2026/09/01')).toBe(false);
    expect(isYmd('2026-09-01T00:00:00Z')).toBe(false);
    expect(isYmd('')).toBe(false);
  });

  it('문자열이 아닌 값을 거부한다 — route가 받는 body는 무엇이든 올 수 있다', () => {
    expect(isYmd(undefined)).toBe(false);
    expect(isYmd(null)).toBe(false);
    expect(isYmd(20260901)).toBe(false);
    expect(isYmd(new Date())).toBe(false);
  });
});

describe('toKstYmd', () => {
  it('KST 자정 직후(UTC 전날 15:00)는 KST 날짜로 자른다', () => {
    // UTC로 자르면 2026-08-31로 하루 밀린다 — 서버(Vercel)는 UTC로 돈다
    expect(toKstYmd(new Date('2026-08-31T15:00:00.000Z'))).toBe('2026-09-01');
  });

  it('KST 자정 직전(UTC 14:59)은 그날로 남는다', () => {
    expect(toKstYmd(new Date('2026-08-31T14:59:59.999Z'))).toBe('2026-08-31');
  });

  it('ISO 문자열도 받는다', () => {
    expect(toKstYmd('2026-09-01T08:00:00+09:00')).toBe('2026-09-01');
  });
});
