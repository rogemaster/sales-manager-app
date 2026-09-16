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

  it('DUPLICATE_IN_FILE은 같은 코드를 가진 행 번호를 함께 보여준다', () => {
    const [error] = excelValidErrorsCodeToMessages([
      { row: 4, header: '고객상품코드', code: 'DUPLICATE_IN_FILE', value: 'CS-001', rows: [4, 9] },
    ]);

    expect(error.message).toBe("[고객상품코드] 'CS-001'이 파일 안에서 중복됩니다. (4·9행)");
  });

  it('DUPLICATE_EXISTING은 표기가 다르면 등록된 코드를 함께 보여준다', () => {
    const [error] = excelValidErrorsCodeToMessages([
      { row: 4, header: '고객상품코드', code: 'DUPLICATE_EXISTING', value: 'cs-001', existingCode: 'CS-001' },
    ]);

    expect(error.message).toBe("[고객상품코드] 'cs-001'은 이미 등록된 코드입니다. (등록된 코드: CS-001)");
  });

  it('DUPLICATE_EXISTING은 표기가 같으면 괄호를 붙이지 않는다', () => {
    const [error] = excelValidErrorsCodeToMessages([
      { row: 4, header: '고객상품코드', code: 'DUPLICATE_EXISTING', value: 'CS-001', existingCode: 'CS-001' },
    ]);

    expect(error.message).toBe("[고객상품코드] 'CS-001'은 이미 등록된 코드입니다.");
  });

  it('CODE_CHECK_FAILED는 확인하지 못했다고 알린다', () => {
    const [error] = excelValidErrorsCodeToMessages([{ row: 4, header: '고객상품코드', code: 'CODE_CHECK_FAILED' }]);

    expect(error.message).toBe('[고객상품코드] 중복 여부를 확인하지 못했습니다.');
  });
});
