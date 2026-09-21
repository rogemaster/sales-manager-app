import { describe, it, expect } from 'vitest';
import { buildBulkResultAlert } from './bulkResultAlert';

describe('buildBulkResultAlert', () => {
  it('실패가 없으면 성공 알림을 만든다', () => {
    expect(buildBulkResultAlert('삭제', 3, [])).toEqual({
      type: 'success',
      message: '3건이 삭제되었습니다.',
    });
  });

  it('전부 실패하면 오류 알림에 첫 사유를 담는다', () => {
    const result = buildBulkResultAlert('변경', 0, [{ id: 'a', message: '존재하지 않는 설정입니다.' }]);
    expect(result).toEqual({ type: 'error', message: '존재하지 않는 설정입니다.' });
  });

  it('일부만 실패하면 경고 알림에 성공 건수와 첫 사유를 함께 담는다', () => {
    const result = buildBulkResultAlert('삭제', 2, [{ id: 'a', message: '존재하지 않는 설정입니다.' }]);
    expect(result).toEqual({
      type: 'warning',
      message: '2건이 삭제되었습니다. 존재하지 않는 설정입니다.',
    });
  });

  it('실패가 여러 건이면 첫 사유 뒤에 나머지 건수를 붙인다', () => {
    const failures = [
      { id: 'a', message: '존재하지 않는 설정입니다.' },
      { id: 'b', message: '존재하지 않는 설정입니다.' },
      { id: 'c', message: '존재하지 않는 설정입니다.' },
    ];
    expect(buildBulkResultAlert('삭제', 0, failures).message).toBe('존재하지 않는 설정입니다. (외 2건 오류)');
  });
});
