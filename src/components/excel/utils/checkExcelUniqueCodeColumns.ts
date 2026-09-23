import { ExcelCodeCheckFn, ExcelRowWithErrors, ExcelTemplateInfo, ValidationError } from '@/types/excel.type';
import {
  CUSTOMER_CODE_MAX_LENGTH,
  findCustomerCodeInputProblem,
  findDuplicateCustomerCodeGroups,
  normalizeCustomerCode,
  toCustomerCodeKey,
} from '@/features/products/util/customerCode';
import { getSheetRow } from './sheetRows';
import { isUnauthorizedError } from '@/shared/utils/unauthorized';

type Target = { row: number; code: string };

/**
 * `uniqueCode` 컬럼의 파일 안 중복과 이미 등록된 코드와의 중복을 오류로 돌려준다.
 * 업로드 미리보기에서 거르는 이유: 저장 단계에서 거부되면 이미지를 R2에 다 받은 뒤라 고아 파일이 남는다.
 *
 * - 파일 안 중복은 묶음의 모든 행을 오류로 한다. 어느 행이 맞는 상품인지 프로그램이 고를 수 없다.
 * - 필드 오류가 있는 행도 확인한다. 한 번에 모든 오류를 보여주기 위해서다.
 * - 확인 요청이 실패하면 통과시키지 않는다. 확인되지 않은 행을 저장 대상에 남기지 않는다.
 * - 길이를 넘는 코드는 INVALID_CODE로 알리고 확인 대상에서 뺀다. 확인 API가 요청 전체를 거부해 모든 행이 CODE_CHECK_FAILED가 되기 때문이다.
 *   글자가 아닌 값(불리언 셀 등)은 readSheetRows가 보이는 글자로 읽으므로 여기까지 오지 않는다.
 * - `uniqueCode` 컬럼은 고객사 상품코드뿐이라 그 정규화 규칙을 그대로 쓴다.
 */
export const checkExcelUniqueCodeColumns = async (
  rows: ExcelRowWithErrors[],
  templateInfo: ExcelTemplateInfo[],
  checkFn: ExcelCodeCheckFn,
): Promise<ValidationError[]> => {
  const errors: ValidationError[] = [];

  for (const { name: header } of templateInfo.filter((column) => column.uniqueCode)) {
    const targets: Target[] = rows.flatMap((row) => {
      const value = row[header];
      if (Array.isArray(value)) return [];

      if (findCustomerCodeInputProblem(value) === 'LENGTH') {
        const reason = `${CUSTOMER_CODE_MAX_LENGTH}자 이하로 입력해야 합니다. (현재 ${String(value).trim().length}자)`;
        errors.push({ row: getSheetRow(row), header, code: 'INVALID_CODE', reason });
        return [];
      }

      const code = normalizeCustomerCode(value);
      return code === null ? [] : [{ row: getSheetRow(row), code }];
    });

    if (targets.length === 0) continue;

    const inFile = new Map<number, ValidationError>();
    for (const indexes of findDuplicateCustomerCodeGroups(targets.map(({ code }) => code))) {
      const sheetRows = indexes.map((index) => targets[index].row).sort((a, b) => a - b);
      for (const index of indexes) {
        inFile.set(index, {
          row: targets[index].row,
          header,
          code: 'DUPLICATE_IN_FILE',
          value: targets[index].code,
          rows: sheetRows,
        });
      }
    }

    let existingByKey: Map<string, string>;
    try {
      const duplicates = await checkFn(targets.map(({ code }) => code));
      existingByKey = new Map(duplicates.map(({ code, existingCode }) => [toCustomerCodeKey(code), existingCode]));
    } catch (error) {
      if (isUnauthorizedError(error)) throw error;
      targets.forEach((target, index) => {
        const duplicate = inFile.get(index);
        if (duplicate) errors.push(duplicate);
        errors.push({ row: target.row, header, code: 'CODE_CHECK_FAILED' });
      });
      continue;
    }

    targets.forEach((target, index) => {
      const duplicate = inFile.get(index);
      if (duplicate) errors.push(duplicate);
      const existingCode = existingByKey.get(toCustomerCodeKey(target.code));
      if (existingCode !== undefined) {
        errors.push({ row: target.row, header, code: 'DUPLICATE_EXISTING', value: target.code, existingCode });
      }
    });
  }

  return errors;
};
