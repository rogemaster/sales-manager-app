import { describe, expect, it } from 'vitest';
import { formatExcelFailureSummary } from './formatExcelFailureSummary';

describe('formatExcelFailureSummary', () => {
  it('실패가 없으면 빈 문자열', () => {
    expect(formatExcelFailureSummary([])).toBe('');
  });

  it('실패가 하나면 외 N건을 붙이지 않는다', () => {
    expect(formatExcelFailureSummary([{ rowNumber: 6, message: '[메인이미지] 응답 시간이 초과되었습니다.' }])).toBe(
      '[6행] [메인이미지] 응답 시간이 초과되었습니다.',
    );
  });

  it('여러 건이면 시트 행 번호가 가장 작은 실패를 보여주고 나머지는 건수로 줄인다', () => {
    expect(
      formatExcelFailureSummary([
        { rowNumber: 9, message: '뒤' },
        { rowNumber: 4, message: '앞' },
        { rowNumber: 7, message: '중간' },
      ]),
    ).toBe('[4행] 앞 (외 2건 오류)');
  });
});
