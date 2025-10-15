export type ExcelRowType = { [key: string]: string | number | boolean | null | undefined };

export type ValidationError = {
  row: number;
  header: string;
  type: 'MISSING_FIELD' | 'EMPTY_VALUE';
  message: string;
};

export type ValidationResult = {
  result: 'success' | 'error';
  errors: ValidationError[] | [];
};

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
          type: 'MISSING_FIELD',
          message: `Row ${index + 1}, [${header}] 필드가 존재하지 않습니다.`,
        });
      } else if (emptyValue(row, header)) {
        // 필수 값이 없는 경우 (필드가 존재할 때만 검사)
        emptyValueErrors.push({
          row: index + 1,
          header,
          type: 'EMPTY_VALUE',
          message: `Row ${index + 1}, [${header}] 값이 비어 있습니다.`,
        });
      }
    });
  });

  if (missingFieldErrors.length > 0) {
    return { result: 'error', errors: missingFieldErrors };
  }

  if (emptyValueErrors.length > 0) {
    return { result: 'error', errors: emptyValueErrors };
  }

  return { result: 'success', errors: [] };
}
