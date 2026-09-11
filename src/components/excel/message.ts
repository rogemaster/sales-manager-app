import { UploadErrorCode, ValidationError } from '@/types/excel.type';

export function excelUploadErrorCodeToMessage(code: UploadErrorCode) {
  switch (code) {
    case 'NO_FILE_SELECTED':
      return '파일을 선택해 주세요.';
    case 'INVALID_FILE_TYPE':
      return '엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.';
    case 'FILE_TOO_LARGE':
      return '파일 크기가 10MB를 초과합니다. 더 작은 파일을 업로드해 주세요.';
    case 'PROCESSING_ERROR':
      return '파일 처리 중 오류가 발생했습니다.';
    default:
      return '알 수 없는 오류가 발생했습니다.';
  }
}

export function excelValidErrorsCodeToMessages(errors: ValidationError[]): ValidationError[] {
  return errors.map((item) => {
    if (item.code === 'EMPTY_VALUE') {
      return { ...item, message: `[${item.header}] 값이 비어 있습니다.` };
    }
    if (item.code === 'INVALID_VALUE') {
      return {
        ...item,
        message: `[${item.header}] '${item.value}'는 사용할 수 없는 값입니다. (사용 가능: ${item.allowed?.join(', ')})`,
      };
    }
    if (item.code === 'INVALID_NUMBER') {
      return { ...item, message: `[${item.header}] '${item.value}'는 0 이상의 정수여야 합니다.` };
    }
    return item;
  });
}
