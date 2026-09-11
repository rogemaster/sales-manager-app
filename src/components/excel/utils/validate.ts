import { ExcelRowType, ExcelTemplateInfo, ValidationError, ValidationResult } from '@/types/excel.type';

// 필수 필드가 없는 경우
export function missingField(row: ExcelRowType, requiredField: string) {
  return !(requiredField in row);
}

// 필수값이 없는 경우
export function emptyValue(row: ExcelRowType, requiredField: string) {
  const value = row[requiredField];
  return value === null || value?.toString().trim() === '' || value === undefined;
}

// 허용 목록 밖의 값인 경우
export function invalidValue(row: ExcelRowType, header: string, allowed: string[]) {
  // 시트에서 숫자로 파싱되는 값이 있어 String()으로 좁힌다. 앞뒤 공백은 사용자 오타로 보고 무시한다.
  return !allowed.includes(String(row[header]).trim());
}

// 0 이상 정수가 아닌 경우. numeric 컬럼에만 적용한다.
export function invalidNumber(row: ExcelRowType, header: string) {
  const parsed = Number(String(row[header]).trim());
  return !Number.isInteger(parsed) || parsed < 0;
}

export function validateExcelData(rowsData: ExcelRowType[], templateInfo: ExcelTemplateInfo[]): ValidationResult {
  const errors: ValidationError[] = [];

  rowsData.forEach((row, index) => {
    templateInfo.forEach(({ name: header, req, allowed, numeric }) => {
      if (req && missingField(row, header)) {
        errors.push({ row: index + 1, header, code: 'MISSING_FIELD' });
        return;
      }

      if (req && emptyValue(row, header)) {
        errors.push({ row: index + 1, header, code: 'EMPTY_VALUE' });
        return;
      }

      // 빈 값에는 허용값 오류를 겹쳐 붙이지 않는다. 필수면 위에서 이미 잡혔고,
      // 선택 컬럼이 비어 있는 것은 오류가 아니다.
      if (allowed && !emptyValue(row, header) && invalidValue(row, header, allowed)) {
        errors.push({ row: index + 1, header, code: 'INVALID_VALUE', value: String(row[header]).trim(), allowed });
      }

      // 빈 값에는 숫자 오류를 겹쳐 붙이지 않는다. 허용값 검사와 같은 이유다.
      if (numeric && !emptyValue(row, header) && invalidNumber(row, header)) {
        errors.push({ row: index + 1, header, code: 'INVALID_NUMBER', value: String(row[header]).trim() });
      }
    });
  });

  const hasMissingField = errors.some((e) => e.code === 'MISSING_FIELD');

  if (hasMissingField) {
    return { result: 'error', errors };
  }

  return { result: 'success', errors };
}
