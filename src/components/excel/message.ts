import { UploadErrorCode, ValidationError } from '@/types/excel.type';

export function excelUploadErrorCodeToMessage(code: UploadErrorCode) {
  switch (code) {
    case 'NO_FILE_SELECTED':
      return '파일을 선택해 주세요.';
    case 'INVALID_FILE_TYPE':
      return '엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.';
    case 'PROCESSING_ERROR':
      return '파일 처리 중 오류가 발생했습니다.';
    default:
      return '알 수 없는 오류가 발생했습니다.';
  }
}

export function excelMissingFieldErrorCodeToMessages(errors: ValidationError[]) {
  const errorMessages: string[] = [];

  errors.forEach((error) => {
    if (error.code === 'MISSING_FIELD') {
      errorMessages.push(`Row ${error.row}, [${error.header}] 필드가 존재하지 않습니다.`);
    }
  });

  return errorMessages;
}

export function excelValidErrorsCodeToMessages(errors: ValidationError[]): ValidationError[] {
  const mergedErrors = errors
    .map((item) => {
      if (item.code === 'EMPTY_VALUE') {
        return {
          ...item,
          message: `Row ${item.row}, [${item.header}] 값이 비어 있습니다.`,
        };
      }
      return item;
    })
    .filter((item): item is ValidationError => item !== undefined);

  return mergedErrors;
}
