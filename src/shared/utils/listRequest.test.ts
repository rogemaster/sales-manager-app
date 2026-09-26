import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  filterCodeSchema,
  filterTextSchema,
  INVALID_FILTER_MESSAGE,
  INVALID_SEARCH_DATE_MESSAGE,
  LIST_PAGE_SIZE_MAX,
  listPageFields,
  searchDateSchema,
} from './listRequest';

const pageSchema = z.object(listPageFields);

describe('listPageFields', () => {
  it.each([
    [0, 0, 1, 10],
    [-3, 'abc', 1, 10],
    [undefined, undefined, 1, 10],
    [1.7, 5000, 1, LIST_PAGE_SIZE_MAX],
    ['3', '20', 3, 20],
  ])('page %s·pageSize %s는 거절하지 않고 %s·%s로 보정한다', (page, pageSize, expectedPage, expectedPageSize) => {
    expect(pageSchema.parse({ page, pageSize })).toEqual({ page: expectedPage, pageSize: expectedPageSize });
  });
});

describe('searchDateSchema', () => {
  it('YYYY-MM-DD만 통과시킨다', () => {
    expect(searchDateSchema.safeParse('2026-09-26').success).toBe(true);
  });

  it.each(['2026/09/01', '2026-02-31', '', undefined, 20260901])('%s는 거절한다', (value) => {
    expect(searchDateSchema.safeParse(value).error?.issues[0]?.message).toBe(INVALID_SEARCH_DATE_MESSAGE);
  });
});

describe('필터 스키마', () => {
  it('목록 밖 코드와 글자가 아닌 값을 같은 한글 문구로 거절한다', () => {
    const code = filterCodeSchema(['ALL', 'A']);
    expect(code.safeParse('A').success).toBe(true);
    for (const value of ['B', undefined, 1]) {
      expect(code.safeParse(value).error?.issues[0]?.message).toBe(INVALID_FILTER_MESSAGE);
    }
  });

  it('자유 입력 필터는 길이 상한을 넘으면 거절한다', () => {
    const text = filterTextSchema(3);
    expect(text.safeParse('abc').success).toBe(true);
    for (const value of ['abcd', undefined, 1]) {
      expect(text.safeParse(value).error?.issues[0]?.message).toBe(INVALID_FILTER_MESSAGE);
    }
  });
});
