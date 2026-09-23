import { ExcelImageCheckFn, ExcelRowWithErrors, ExcelTemplateInfo, ValidationError } from '@/types/excel.type';
import { mapWithConcurrency } from '@/shared/utils/concurrency';
import { getSheetRow } from './sheetRows';
import { isUnauthorizedError } from '@/shared/utils/unauthorized';

export const IMAGE_CHECK_FAILED_REASON = '이미지를 확인하지 못했습니다.';

type Target = { row: number; header: string; url: string };

/**
 * `remoteImage` 컬럼의 주소를 서버에 확인시켜 실패한 행을 오류로 돌려준다.
 *
 * - 빈 값은 확인하지 않는다. 필수 컬럼이면 필드 검사가 EMPTY_VALUE로 이미 잡는다.
 * - 필드 오류가 있는 행도 확인한다. 사용자가 한 번에 모든 오류를 보고 시트를 고칠 수 있게 하기 위해서다.
 * - 확인 요청이 실패(throw)하면 통과시키지 않는다. 확인되지 않은 이미지를 저장 대상에 남기지 않는다.
 */
export const checkExcelImageColumns = async (
  rows: ExcelRowWithErrors[],
  templateInfo: ExcelTemplateInfo[],
  checkFn: ExcelImageCheckFn,
  options: { concurrency: number; onProgress?: (done: number, total: number) => void },
): Promise<ValidationError[]> => {
  const headers = templateInfo.filter((column) => column.remoteImage).map((column) => column.name);

  const targets: Target[] = rows.flatMap((row) =>
    headers.flatMap((header) => {
      const value = row[header];
      if (value === null || value === undefined || Array.isArray(value)) return [];
      const url = String(value).trim();
      return url ? [{ row: getSheetRow(row), header, url }] : [];
    }),
  );

  if (targets.length === 0) return [];

  const settled = await mapWithConcurrency(targets, options.concurrency, ({ url }) => checkFn(url), options.onProgress);

  return settled.flatMap((result, index): ValidationError[] => {
    const { row, header } = targets[index];
    if (result.status === 'rejected') {
      if (isUnauthorizedError(result.reason)) throw result.reason;
      return [{ row, header, code: 'INVALID_IMAGE', reason: IMAGE_CHECK_FAILED_REASON }];
    }
    return result.value.ok ? [] : [{ row, header, code: 'INVALID_IMAGE', reason: result.value.reason }];
  });
};
