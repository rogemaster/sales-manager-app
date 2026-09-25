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
  // 다운로드 양식에서 숫자 서식으로 만들 컬럼이자, 업로드 시 0 이상 정수인지 검증할 컬럼. 도메인 타입이 number인 필드에만 붙인다.
  // 붙이지 않으면 다운로드는 텍스트 서식이 되어 시트의 값 변형을 막고(예: '90,100,110' → 90100110), 업로드는 숫자 검증을 건너뛴다.
  numeric?: boolean;
  // 이 컬럼에 적을 수 있는 값의 전체 목록. 코드값이 아니라 사용자가 시트에 적는 표시명을 담는다.
  // 붙이면 업로드 검증이 목록 밖의 값을 오류 행으로 잡는다. 붙이지 않은 컬럼은 자유 입력이다.
  allowed?: string[];
  // 외부 이미지 주소를 적는 컬럼. 붙이면 업로드 시 서버가 그 주소를 내려받아 쓸 수 있는 이미지인지 확인하고,
  // 실패한 행을 INVALID_IMAGE 오류로 잡는다. 저장 시 실제로 R2에 가져오는 것은 저장 전략의 몫이다.
  remoteImage?: boolean;
  // 워크스페이스 안에서 겹치면 안 되는 코드 컬럼(고객사 상품코드). 붙이면 업로드 시 파일 안 중복과
  // 이미 등록된 코드와의 중복을 오류 행으로 잡는다. 비교는 공백·대소문자를 무시한다.
  uniqueCode?: boolean;
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
  // 한 파일의 최대 데이터 행 수. 넘으면 파일 자체를 거부한다. 넘기지 않으면 제한이 없다.
  maxRows?: number;
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

export type UploadErrorCode =
  | 'NO_FILE_SELECTED'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_ROWS'
  | 'PROCESSING_ERROR';

export type ValidationErrorCode =
  | 'MISSING_FIELD'
  | 'EMPTY_VALUE'
  | 'INVALID_VALUE'
  | 'INVALID_NUMBER'
  | 'INVALID_IMAGE'
  | 'INVALID_CODE'
  | 'DUPLICATE_IN_FILE'
  | 'DUPLICATE_EXISTING'
  | 'CODE_CHECK_FAILED';

export type ErrorTypeCode = 'UPLOAD_ERROR' | 'VALIDATE_ERROR';

export type ValidationError = {
  row: number;
  header: string;
  code: ValidationErrorCode;
  message?: string;
  // INVALID_VALUE와 INVALID_NUMBER에서 채워진다. 사용자가 어떤 값을 적었고 무엇을 적을 수 있었는지
  // 오류 메시지가 함께 알려주기 위한 값이라, 메시지 조립은 message.ts가 맡는다.
  value?: string;
  allowed?: string[];
  // INVALID_IMAGE에서 채워진다. 서버가 알려준 사유(예: '이미지를 불러올 수 없습니다(HTTP 404).')다.
  // INVALID_CODE에서도 채워진다. 코드 칸의 모양이 틀린 이유(글자가 아님·길이 초과)다.
  reason?: string;
  // DUPLICATE_IN_FILE에서 채워진다. 같은 코드를 가진 행 전체의 시트 행 번호(오름차순, 자기 행 포함)다.
  rows?: number[];
  // DUPLICATE_EXISTING에서 채워진다. 이미 등록된 쪽의 실제 표기 — 사용자가 목록에서 찾을 수 있게 한다.
  existingCode?: string;
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

// 엑셀 저장 대상 도메인. 미리보기 화면과 저장 전략 선택이 같은 값을 쓴다.
export type ExcelSaveType = 'PRODUCT' | 'ORDER';

// 업로드 시 이미지 주소 하나를 확인하는 함수. ok: false는 이미지 자체의 문제이고, 확인 요청이 실패하면 throw한다.
export type ExcelImageCheckFn = (url: string) => Promise<{ ok: true } | { ok: false; reason: string }>;

// 저장 시 외부 이미지를 가져와 저장소 key로 바꾸는 함수. ok: false는 그 이미지를 쓸 수 없다는 뜻이고, 요청 실패는 throw한다.
export type ExcelImageImportFn = (url: string) => Promise<{ ok: true; key: string } | { ok: false; reason: string }>;

// 업로드 시 코드 목록을 한 번에 확인하는 함수. 이미 등록된 코드만 돌려주고, 확인 요청이 실패하면 throw한다.
export type ExcelCodeCheckFn = (codes: string[]) => Promise<{ code: string; existingCode: string }[]>;

// 저장 단계에서 제외된 행. rowNumber는 엑셀 시트 행 번호다.
export type ExcelRowFailure = { rowNumber: number; message: string };

// 저장 결과. 이미지를 가져오지 못한 행은 빼고 저장하므로 "일부 성공"이 정상 결과에 포함된다.
export type ExcelSaveResult = { savedCount: number; failures: ExcelRowFailure[] };

export type ExcelSaveFn = (
  rows: ExcelRowWithErrors[],
  context?: { onProgress?: (done: number, total: number) => void },
) => Promise<ExcelSaveResult>;
