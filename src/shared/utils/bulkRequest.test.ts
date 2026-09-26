import { describe, it, expect } from 'vitest';
import {
  bulkIdsRequestSchema,
  bulkStatusRequestSchema,
  INVALID_IDS_MESSAGE,
  INVALID_IS_ACTIVE_MESSAGE,
  toBulkResult,
} from './bulkRequest';
import { INVALID_BODY_MESSAGE } from './requestBody';

const messageOf = (result: { error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message;

describe('bulkIdsRequestSchema', () => {
  it('중복 id를 한 번만 남긴다', () => {
    expect(bulkIdsRequestSchema.parse({ ids: ['a', 'b', 'a'] })).toEqual({ ids: ['a', 'b'] });
  });

  it('빈 목록은 통과한다', () => {
    expect(bulkIdsRequestSchema.parse({ ids: [] })).toEqual({ ids: [] });
  });

  it.each([{}, { ids: 'a' }, { ids: [1] }, { ids: null }])('ids가 문자열 배열이 아니면 거절한다: %j', (body) => {
    expect(messageOf(bulkIdsRequestSchema.safeParse(body))).toBe(INVALID_IDS_MESSAGE);
  });

  it('본문이 객체가 아니면 거절한다', () => {
    expect(messageOf(bulkIdsRequestSchema.safeParse(null))).toBe(INVALID_BODY_MESSAGE);
  });
});

describe('bulkStatusRequestSchema', () => {
  it('ids와 isActive를 받는다', () => {
    expect(bulkStatusRequestSchema.parse({ ids: ['a'], isActive: false })).toEqual({ ids: ['a'], isActive: false });
  });

  it.each([undefined, 'true', 1])('빈 목록이어도 isActive(%s)가 틀리면 거절한다', (isActive) => {
    expect(messageOf(bulkStatusRequestSchema.safeParse({ ids: [], isActive }))).toBe(INVALID_IS_ACTIVE_MESSAGE);
  });
});

describe('toBulkResult', () => {
  it('처리되지 않은 id를 요청 순서대로 실패로 모은다', () => {
    expect(toBulkResult(['a', 'b', 'c'], ['b'], '없음')).toEqual({
      successCount: 1,
      failures: [
        { id: 'a', message: '없음' },
        { id: 'c', message: '없음' },
      ],
    });
  });

  it('전부 처리되면 실패가 없다', () => {
    expect(toBulkResult(['a'], ['a'], '없음')).toEqual({ successCount: 1, failures: [] });
  });
});
