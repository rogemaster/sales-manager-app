import { ExcelRowType, ValidationError, ValidationResult } from '@/types/ExcelInterface';

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
  const missingFieldErrors: ValidationError[] = [];
  const emptyValueErrors: ValidationError[] = [];

  rowsData.forEach((row, index) => {
    requiredHeaders.forEach((header) => {
      // 필수 필드가 없는 경우
      if (missingField(row, header)) {
        missingFieldErrors.push({
          row: index + 1,
          header,
          code: 'MISSING_FIELD',
        });
      } else if (emptyValue(row, header)) {
        // 필수 값이 없는 경우 (필드가 존재할 때만 검사)
        emptyValueErrors.push({
          row: index + 1,
          header,
          code: 'EMPTY_VALUE',
        });
      }
    });
  });

  // 필수 필드가 없는 경우
  if (missingFieldErrors.length > 0) {
    return { result: 'error', errors: missingFieldErrors };
  }

  // 필수 값이 없는 경우(필드는 존재)
  if (emptyValueErrors.length > 0) {
    return { result: 'success', errors: emptyValueErrors };
  }

  return { result: 'success', errors: [] };
}
