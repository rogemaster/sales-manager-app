import { describe, it, expect } from 'vitest';
import { buildBulkAccountAlert } from './bulkResultMessage';

describe('buildBulkAccountAlert', () => {
  it('전부 성공하면 success로 건수를 알린다', () => {
    expect(buildBulkAccountAlert('삭제', 5, [])).toEqual({
      type: 'success',
      message: '5건이 삭제되었습니다.',
    });
  });

  it('일부 실패하면 warning으로 성공 건수와 첫 사유를 함께 알린다', () => {
    expect(
      buildBulkAccountAlert('삭제', 4, [{ id: 'sa_x', message: '존재하지 않는 계정입니다.' }]),
    ).toEqual({
      type: 'warning',
      message: '4건이 삭제되었습니다. 존재하지 않는 계정입니다.',
    });
  });

  it('실패가 여러 건이면 나머지를 건수로 줄인다', () => {
    expect(
      buildBulkAccountAlert('변경', 2, [
        { id: 'sa_x', message: '존재하지 않는 계정입니다.' },
        { id: 'sa_y', message: '존재하지 않는 계정입니다.' },
      ]),
    ).toEqual({
      type: 'warning',
      message: '2건이 변경되었습니다. 존재하지 않는 계정입니다. (외 1건 오류)',
    });
  });

  it('전부 실패하면 error로 알린다', () => {
    expect(buildBulkAccountAlert('삭제', 0, [{ id: 'sa_x', message: '존재하지 않는 계정입니다.' }])).toEqual({
      type: 'error',
      message: '존재하지 않는 계정입니다.',
    });
  });
});
