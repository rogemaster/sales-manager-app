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
}

// 엑셀 다운로드
export interface ExcelDownloaderProps {
  excelHeader: ExcelHeaderProps;
  isTemplateInfo?: boolean;
  templateInfo?: ExcelTemplate;
  templateHeaders: string[];
  templateName?: string;
}

// 엑셀 미리보기 테이블 컬럼 타입
export interface ExcelTableColumnsType<T> {
  key: string;
  headerTitle: string;
  accessor: (row: T) => React.ReactNode;
  cellClassName?: string;
}

// 엑셀 미리보기 데이터 테이블 타입
export interface ExcelPreviewDataTableProps<T> {
  tableColumns: ExcelTableColumnsType<T>[];
  uploadedData: T[];
  getRowKey?: (row: T, index: number) => React.Key;
  getRowClassName?: (row: T) => string | undefined;
}

// 엑셀 미리보기 전체 타입
export interface ExcelPreviewProps<T> extends ExcelPreviewDataTableProps<T> {
  excelHeader: ExcelHeaderProps;
  getValidCount?: (rows: T[]) => number;
  getErrorCount?: (rows: T[]) => number;
}
