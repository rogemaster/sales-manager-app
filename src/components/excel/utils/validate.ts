import { ExcelRowType, ValidationError, ValidationResult } from '@/types/excel.type';

// 필수 필드가 없는 경우
export function missingField(row: ExcelRowType, requiredField: string) {
  return !(requiredField in row);
}

// 필수값이 없는 경우
export function emptyValue(row: ExcelRowType, requiredField: string) {
  const value = row[requiredField];
  return value === null || value?.toString().trim() === '' || value === undefined;
}

export function validateExcelData(rowsData: ExcelRowType[], requiredHeaders: string[]): ValidationResult {
  const errors: ValidationError[] = [];

  rowsData.forEach((row, index) => {
    requiredHeaders.forEach((header) => {
      if (missingField(row, header)) {
        errors.push({ row: index + 1, header, code: 'MISSING_FIELD' });
      } else if (emptyValue(row, header)) {
        errors.push({ row: index + 1, header, code: 'EMPTY_VALUE' });
      }
    });
  });

  const hasMissingField = errors.some((e) => e.code === 'MISSING_FIELD');

  if (hasMissingField) {
    return { result: 'error', errors };
  }

  return { result: 'success', errors };
}
