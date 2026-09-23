import { describe, expect, it, vi } from 'vitest';
import { ExcelRowWithErrors, ExcelTemplateInfo } from '@/types/excel.type';
import { checkExcelUniqueCodeColumns } from './checkExcelUniqueCodeColumns';
import { EXCEL_SHEET_ROW_KEY } from './sheetRows';
import { CUSTOMER_CODE_MAX_LENGTH } from '@/features/products/util/customerCode';
import { UnauthorizedError } from '@/shared/utils/unauthorized';

const HEADER = '고객상품코드';

const template: ExcelTemplateInfo[] = [
  { key: 'customerCode', name: HEADER, req: false, uniqueCode: true },
  { key: 'name', name: '상품명', req: true },
];

const row = (sheetRow: number, code: ExcelRowWithErrors[string]): ExcelRowWithErrors => ({
  [HEADER]: code,
  상품명: '상품',
  [EXCEL_SHEET_ROW_KEY]: sheetRow,
});

describe('checkExcelUniqueCodeColumns', () => {
  it('파일 안에서 공백·대소문자만 다른 코드는 묶음의 모든 행이 오류다', async () => {
    const checkFn = vi.fn().mockResolvedValue([]);

    const errors = await checkExcelUniqueCodeColumns(
      [row(4, 'CS-001'), row(5, 'B'), row(9, ' cs-001 ')],
      template,
      checkFn,
    );

    expect(errors).toEqual([
      { row: 4, header: HEADER, code: 'DUPLICATE_IN_FILE', value: 'CS-001', rows: [4, 9] },
      { row: 9, header: HEADER, code: 'DUPLICATE_IN_FILE', value: 'cs-001', rows: [4, 9] },
    ]);
  });

  it('이미 등록된 코드와 겹치는 행은 등록된 표기와 함께 오류다', async () => {
    const checkFn = vi.fn().mockResolvedValue([{ code: 'cs-001', existingCode: 'CS-001' }]);

    const errors = await checkExcelUniqueCodeColumns([row(2, 'cs-001'), row(3, 'B')], template, checkFn);

    expect(checkFn).toHaveBeenCalledWith(['cs-001', 'B']);
    expect(errors).toEqual([
      { row: 2, header: HEADER, code: 'DUPLICATE_EXISTING', value: 'cs-001', existingCode: 'CS-001' },
    ]);
  });

  it('파일 안 중복과 기존 중복에 동시에 걸리면 오류가 둘 다 붙는다', async () => {
    const checkFn = vi.fn().mockResolvedValue([{ code: 'A', existingCode: 'a' }]);

    const errors = await checkExcelUniqueCodeColumns([row(2, 'A'), row(3, 'A')], template, checkFn);

    expect(errors.filter((e) => e.row === 2).map((e) => e.code)).toEqual(['DUPLICATE_IN_FILE', 'DUPLICATE_EXISTING']);
    expect(errors.filter((e) => e.row === 3).map((e) => e.code)).toEqual(['DUPLICATE_IN_FILE', 'DUPLICATE_EXISTING']);
  });

  it('확인 요청이 실패하면 코드가 있는 행 전부 CODE_CHECK_FAILED다', async () => {
    const checkFn = vi.fn().mockRejectedValue(new Error('network'));

    const errors = await checkExcelUniqueCodeColumns([row(2, 'A'), row(3, ''), row(4, 'B')], template, checkFn);

    expect(errors).toEqual([
      { row: 2, header: HEADER, code: 'CODE_CHECK_FAILED' },
      { row: 4, header: HEADER, code: 'CODE_CHECK_FAILED' },
    ]);
  });

  it('확인 요청이 UnauthorizedError면 행 오류로 바꾸지 않고 그대로 던진다', async () => {
    const checkFn = vi.fn().mockRejectedValue(new UnauthorizedError());

    await expect(checkExcelUniqueCodeColumns([row(2, 'A'), row(3, 'B')], template, checkFn)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('빈 값·공백·null·undefined만 있으면 확인 함수를 부르지 않는다', async () => {
    const checkFn = vi.fn().mockResolvedValue([]);

    const errors = await checkExcelUniqueCodeColumns(
      [row(2, ''), row(3, '   '), row(4, null), row(5, undefined)],
      template,
      checkFn,
    );

    expect(checkFn).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });

  it(`${CUSTOMER_CODE_MAX_LENGTH}자를 넘는 코드는 INVALID_CODE이고 중복 확인에서 뺀다 — 확인 API가 요청 전체를 거부하지 않게`, async () => {
    const checkFn = vi.fn().mockResolvedValue([]);
    const long = 'A'.repeat(CUSTOMER_CODE_MAX_LENGTH + 1);

    const errors = await checkExcelUniqueCodeColumns([row(2, long), row(3, 'B')], template, checkFn);

    expect(checkFn).toHaveBeenCalledWith(['B']);
    expect(errors).toEqual([
      {
        row: 2,
        header: HEADER,
        code: 'INVALID_CODE',
        reason: `${CUSTOMER_CODE_MAX_LENGTH}자 이하로 입력해야 합니다. (현재 ${CUSTOMER_CODE_MAX_LENGTH + 1}자)`,
      },
    ]);
  });

  it('길이 초과만 있으면 확인 함수를 부르지 않는다', async () => {
    const checkFn = vi.fn().mockResolvedValue([]);

    await checkExcelUniqueCodeColumns([row(2, 'A'.repeat(CUSTOMER_CODE_MAX_LENGTH + 1))], template, checkFn);

    expect(checkFn).not.toHaveBeenCalled();
  });

  it('숫자 셀은 문자열로 비교한다', async () => {
    const checkFn = vi.fn().mockResolvedValue([]);

    const errors = await checkExcelUniqueCodeColumns([row(2, 1001), row(3, '1001')], template, checkFn);

    expect(checkFn).toHaveBeenCalledWith(['1001', '1001']);
    expect(errors.map((e) => e.row)).toEqual([2, 3]);
  });

  it('필드 오류가 있는 행도 확인한다', async () => {
    const checkFn = vi.fn().mockResolvedValue([{ code: 'A', existingCode: 'A' }]);
    const withError: ExcelRowWithErrors = {
      ...row(2, 'A'),
      error: [{ row: 2, header: '상품명', code: 'EMPTY_VALUE' }],
    };

    const errors = await checkExcelUniqueCodeColumns([withError], template, checkFn);

    expect(errors).toEqual([{ row: 2, header: HEADER, code: 'DUPLICATE_EXISTING', value: 'A', existingCode: 'A' }]);
  });

  it('uniqueCode 컬럼이 없는 양식이면 아무것도 하지 않는다', async () => {
    const checkFn = vi.fn().mockResolvedValue([]);

    const errors = await checkExcelUniqueCodeColumns(
      [row(2, 'A')],
      [{ key: 'name', name: '상품명', req: true }],
      checkFn,
    );

    expect(checkFn).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });
});
