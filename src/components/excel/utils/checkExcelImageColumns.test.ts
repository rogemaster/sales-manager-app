import { describe, expect, it, vi } from 'vitest';
import { ExcelRowWithErrors, ExcelTemplateInfo } from '@/types/excel.type';
import { checkExcelImageColumns, IMAGE_CHECK_FAILED_REASON } from './checkExcelImageColumns';
import { EXCEL_SHEET_ROW_KEY } from './sheetRows';
import { UnauthorizedError } from '@/shared/utils/unauthorized';

const template: ExcelTemplateInfo[] = [
  { key: 'name', name: '상품명', req: true },
  { key: 'mainImage', name: '메인이미지', req: true, remoteImage: true },
];

const row = (sheetRow: number, mainImage: ExcelRowWithErrors[string]): ExcelRowWithErrors => ({
  상품명: '상품',
  메인이미지: mainImage,
  [EXCEL_SHEET_ROW_KEY]: sheetRow,
});

const options = { concurrency: 2 };

describe('checkExcelImageColumns', () => {
  it('remoteImage 컬럼의 값만 앞뒤 공백을 떼고 확인한다', async () => {
    const checkFn = vi.fn().mockResolvedValue({ ok: true });

    const errors = await checkExcelImageColumns([row(2, ' https://a.com/1.png ')], template, checkFn, options);

    expect(checkFn).toHaveBeenCalledTimes(1);
    expect(checkFn).toHaveBeenCalledWith('https://a.com/1.png');
    expect(errors).toEqual([]);
  });

  it('빈 값·공백·null·undefined는 확인 함수를 부르지 않는다', async () => {
    const checkFn = vi.fn().mockResolvedValue({ ok: true });

    const errors = await checkExcelImageColumns(
      [row(2, ''), row(3, '   '), row(4, null), row(5, undefined)],
      template,
      checkFn,
      options,
    );

    expect(checkFn).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });

  it('확인에 실패한 행은 시트 행 번호와 사유를 담은 INVALID_IMAGE 오류가 된다', async () => {
    const checkFn = vi.fn(async (url: string) =>
      url.endsWith('bad.png') ? { ok: false as const, reason: '이미지를 불러올 수 없습니다(HTTP 404).' } : { ok: true as const },
    );

    const errors = await checkExcelImageColumns(
      [row(2, 'https://a.com/ok.png'), row(4, 'https://a.com/bad.png')],
      template,
      checkFn,
      options,
    );

    expect(errors).toEqual([
      { row: 4, header: '메인이미지', code: 'INVALID_IMAGE', reason: '이미지를 불러올 수 없습니다(HTTP 404).' },
    ]);
  });

  it('확인 요청 자체가 실패하면 통과시키지 않고 확인하지 못했다는 오류를 만든다', async () => {
    const checkFn = vi.fn().mockRejectedValue(new Error('network'));

    const errors = await checkExcelImageColumns([row(3, 'https://a.com/1.png')], template, checkFn, options);

    expect(errors).toEqual([
      { row: 3, header: '메인이미지', code: 'INVALID_IMAGE', reason: IMAGE_CHECK_FAILED_REASON },
    ]);
  });

  it('확인 요청이 UnauthorizedError로 실패하면 행 오류로 바꾸지 않고 그대로 던진다', async () => {
    const checkFn = vi.fn().mockRejectedValue(new UnauthorizedError());

    await expect(
      checkExcelImageColumns([row(3, 'https://a.com/1.png')], template, checkFn, options),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('remoteImage 컬럼이 없는 양식이면 아무것도 확인하지 않고 진행률도 알리지 않는다', async () => {
    const checkFn = vi.fn();
    const onProgress = vi.fn();

    const errors = await checkExcelImageColumns(
      [row(2, 'https://a.com/1.png')],
      [{ key: 'name', name: '상품명', req: true }],
      checkFn,
      { concurrency: 2, onProgress },
    );

    expect(errors).toEqual([]);
    expect(checkFn).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('진행률을 확인 대상 수 기준으로 알린다', async () => {
    const onProgress = vi.fn();

    await checkExcelImageColumns(
      [row(2, 'https://a.com/1.png'), row(3, ''), row(4, 'https://a.com/2.png')],
      template,
      vi.fn().mockResolvedValue({ ok: true }),
      { concurrency: 1, onProgress },
    );

    expect(onProgress).toHaveBeenNthCalledWith(1, 0, 2);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });
});
