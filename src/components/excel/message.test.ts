import { describe, expect, it } from 'vitest';
import { excelUploadErrorCodeToMessage, excelValidErrorsCodeToMessages } from './message';

describe('excelUploadErrorCodeToMessage', () => {
  it('행 수 초과 메시지에 한도를 싣는다', () => {
    expect(excelUploadErrorCodeToMessage('TOO_MANY_ROWS', 50)).toBe('한 번에 최대 50건까지 업로드할 수 있습니다.');
  });
});

describe('excelValidErrorsCodeToMessages', () => {
  it('INVALID_IMAGE는 컬럼명과 서버 사유로 메시지를 만든다', () => {
    const [error] = excelValidErrorsCodeToMessages([
      { row: 4, header: '메인이미지', code: 'INVALID_IMAGE', reason: '이미지를 불러올 수 없습니다(HTTP 404).' },
    ]);

    expect(error.message).toBe('[메인이미지] 이미지를 불러올 수 없습니다(HTTP 404).');
  });
});
