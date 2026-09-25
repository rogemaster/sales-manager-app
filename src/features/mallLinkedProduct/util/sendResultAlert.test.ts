import { describe, it, expect } from 'vitest';
import { buildSendResultAlert } from './sendResultAlert';

describe('buildSendResultAlert', () => {
  it('전송이 전부 성공하면 success 알림이다', () => {
    expect(buildSendResultAlert({ totalCount: 3, successCount: 3, failCount: 0 }, 'send')).toEqual({
      type: 'success',
      message: '3건이 쇼핑몰로 전송되었습니다.',
    });
  });

  it('전송에 실패가 섞이면 warning으로 성공·실패 건수를 알린다', () => {
    expect(buildSendResultAlert({ totalCount: 5, successCount: 3, failCount: 2 }, 'send')).toEqual({
      type: 'warning',
      message: '총 5건 중 3건 전송 성공, 2건 실패했습니다.',
    });
  });

  it('수정이 전부 성공하면 success 알림이다', () => {
    expect(buildSendResultAlert({ totalCount: 2, successCount: 2, failCount: 0 }, 'update')).toEqual({
      type: 'success',
      message: '2건이 수정되었습니다.',
    });
  });

  it('수정에 실패가 섞이면 warning이다', () => {
    expect(buildSendResultAlert({ totalCount: 4, successCount: 1, failCount: 3 }, 'update')).toEqual({
      type: 'warning',
      message: '총 4건 중 1건 수정, 3건 실패했습니다.',
    });
  });
});
