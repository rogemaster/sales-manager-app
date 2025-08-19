// 엑셀 양식
export interface ExcelTemplate {
  templateTitle: string;
  template: ExcelTemplateInfo[];
}

// 엑셀 양식 정보
export interface ExcelTemplateInfo {
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
}

// 엑셀 데이터 미리보기
export interface ExcelPreviewProps {
  excelHeader: ExcelHeaderProps;
}

// 엑셀 미리보기 테이블 헤더
export interface ExcelPreviewTableHeader {
  key: string;
  headerTitle: string;
}

// 엑셀 미리보기 테이블 타입
export interface ExcelPreviewDataTableProps {
  tableHeaders: ExcelPreviewTableHeader[];
  uploadedData: [];
}
