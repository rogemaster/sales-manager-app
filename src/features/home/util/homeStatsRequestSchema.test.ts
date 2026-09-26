import { describe, it, expect } from 'vitest';
import { homeStatsRequestSchema } from './homeStatsRequestSchema';

describe('homeStatsRequestSchema', () => {
  it('YYYY-MM-DD 기간을 통과시킨다', () => {
    const body = { startDate: '2026-09-20', endDate: '2026-09-27' };
    expect(homeStatsRequestSchema.parse(body)).toEqual(body);
  });

  it.each([
    { startDate: '2026/09/20', endDate: '2026-09-27' },
    { startDate: '2026-09-20', endDate: '2026-02-31' },
    { startDate: '2026-09-20' },
    { startDate: 20260920, endDate: '2026-09-27' },
  ])('기간이 틀리면 기존 문구로 거절한다: %j', (body) => {
    expect(homeStatsRequestSchema.safeParse(body).error?.issues[0]?.message).toBe('조회 기간이 올바르지 않습니다.');
  });
});
