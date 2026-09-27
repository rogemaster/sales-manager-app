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

  it('건너뛴 건이 있으면 실패가 없어도 warning으로 알린다', () => {
    expect(buildSendResultAlert({ totalCount: 3, successCount: 2, failCount: 0, skippedCount: 1 }, 'send')).toEqual({
      type: 'warning',
      message: '총 3건 중 2건 전송 성공, 1건은 대상을 찾을 수 없어 제외했습니다.',
    });
  });

  it('전부 건너뛰면 성공 0건을 success로 알리지 않는다', () => {
    expect(buildSendResultAlert({ totalCount: 3, successCount: 0, failCount: 0, skippedCount: 3 }, 'send')).toEqual({
      type: 'warning',
      message: '총 3건 중 0건 전송 성공, 3건은 대상을 찾을 수 없어 제외했습니다.',
    });
  });

  it('실패와 건너뜀이 섞이면 둘 다 알린다', () => {
    expect(buildSendResultAlert({ totalCount: 5, successCount: 2, failCount: 2, skippedCount: 1 }, 'send')).toEqual({
      type: 'warning',
      message: '총 5건 중 2건 전송 성공, 2건 실패, 1건은 대상을 찾을 수 없어 제외했습니다.',
    });
  });

  it('skippedCount가 0이면 기존 문구와 같다', () => {
    expect(buildSendResultAlert({ totalCount: 5, successCount: 3, failCount: 2, skippedCount: 0 }, 'send')).toEqual({
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
