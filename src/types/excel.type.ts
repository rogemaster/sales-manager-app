import React from 'react';

// 엑셀 양식
export interface ExcelTemplate {
  templateTitle: string;
  template: ExcelTemplateInfo[];
}

// 엑셀 양식 정보
export interface ExcelTemplateInfo {
  key: string;
  name: string;
  req: boolean;
  // 다운로드 양식에서 숫자 서식으로 만들 컬럼. 도메인 타입이 number인 필드에만 붙인다.
  // 붙이지 않으면 텍스트 서식이 되어 시트의 값 변형을 막는다 (예: '90,100,110' → 90100110)
  numeric?: boolean;
}

// 엑셀 section header
export interface ExcelHeaderProps {
  excelType?: 'DOWNLOAD' | 'UPLOAD';
  headerTitle: string;
  headerDescription: string;
}

// 엑셀 업로드
export interface ExcelUploaderProps {
  excelHeader: ExcelHeaderProps;
  contentDescription: string;
  fileTemplateInfo: ExcelTemplateInfo[];
}

// 엑셀 다운로드
export interface ExcelDownloaderProps {
  excelHeader: ExcelHeaderProps;
  isTemplateInfo?: boolean;
  templateInfo?: ExcelTemplate;
  templateHeaders?: string[];
  templateNumericColumns?: string[];
  templateName?: string;
}

// 엑셀 미리보기 테이블 컬럼 타입
export interface ExcelTableColumnsType {
  key: string;
  headerTitle: string;
  accessor: (row: ExcelRowWithErrors, index?: number) => React.ReactNode;
  cellClassName?: string;
}

export type ExcelRowType = { [key: string]: string | number | boolean | null | undefined };

export type ExcelRowWithErrors = { [key: string]: string | number | boolean | null | undefined | ValidationError[] };

export type UploadErrorCode = 'NO_FILE_SELECTED' | 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'PROCESSING_ERROR';

export type ValidationErrorCode = 'MISSING_FIELD' | 'EMPTY_VALUE';

export type ErrorTypeCode = 'UPLOAD_ERROR' | 'VALIDATE_ERROR';

export type ValidationError = {
  row: number;
  header: string;
  code: ValidationErrorCode;
  message?: string;
};

export type UploadResult = {
  success: boolean;
  errorType?: ErrorTypeCode;
  validationResult?: ValidationResult;
  uploadError?: UploadErrorCode;
  data?: ExcelRowWithErrors[];
};

export type ValidationResult = {
  result: 'success' | 'error';
  errors: ValidationError[] | [];
};
