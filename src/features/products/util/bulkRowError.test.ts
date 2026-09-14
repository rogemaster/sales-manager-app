import { describe, expect, it } from 'vitest';
import { formatBulkRowError } from './bulkRowError';

describe('formatBulkRowError', () => {
  it('요청 배열의 index를 시트 행 번호로 바꿔 앞에 붙인다', () => {
    // 시트 3행이 오류로 빠져 요청에는 [2, 4, 5]행만 들어갔다. 서버의 index 1은 시트 4행이다.
    expect(formatBulkRowError('판매가는 0 이상의 정수여야 합니다', 1, [2, 4, 5])).toBe(
      '[4행] 판매가는 0 이상의 정수여야 합니다',
    );
  });

  it.each([undefined, null, '1', 1.5])('rowIndex가 정수가 아니면(%j) 사유만 돌려준다', (rowIndex) => {
    expect(formatBulkRowError('서버 사유', rowIndex, [2, 4])).toBe('서버 사유');
  });

  it('rowIndex가 범위를 벗어나면 사유만 돌려준다', () => {
    expect(formatBulkRowError('서버 사유', 5, [2, 4])).toBe('서버 사유');
    expect(formatBulkRowError('서버 사유', -1, [2, 4])).toBe('서버 사유');
  });
});
