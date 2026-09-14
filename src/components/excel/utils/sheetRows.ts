import { ExcelRowType, ExcelRowWithErrors } from '@/types/excel.type';

/**
 * 각 행의 엑셀 시트 행 번호를 담는 필드. 미리보기 '행' 컬럼, 업로드 검증 오류, 저장 결과 알림이
 * 전부 이 값을 쓴다 — 사용자가 엑셀 파일에서 그 행을 바로 찾을 수 있어야 하기 때문이다.
 * 템플릿 컬럼명(한글)과 겹치지 않는 이름을 쓴다.
 */
export const EXCEL_SHEET_ROW_KEY = '__sheetRow';

/**
 * `sheet_to_json` 결과에 시트 행 번호를 붙인다. **파싱 직후, 행을 펼치기 전에** 불러야 한다.
 *
 * `sheet_to_json`은 기본값으로 빈 행을 건너뛰므로 index로 계산하면 빈 행 뒤의 번호가 틀린다.
 * SheetJS가 각 행에 넣어주는 `__rowNum__`(0부터)이 정확하지만 열거 불가 속성이라 `{ ...row }`에서
 * 사라진다. 그래서 여기서 열거 가능한 필드로 복사한다.
 * `__rowNum__`이 없으면(직접 만든 객체 등) 헤더가 1행이라고 보고 index로 채운다.
 */
export const attachSheetRowNumbers = (rows: ExcelRowType[]): ExcelRowType[] =>
  rows.map((row, index) => {
    const rowNum = (row as { __rowNum__?: unknown }).__rowNum__;
    return { ...row, [EXCEL_SHEET_ROW_KEY]: typeof rowNum === 'number' ? rowNum + 1 : index + 2 };
  });

export const getSheetRow = (row: ExcelRowType | ExcelRowWithErrors): number => Number(row[EXCEL_SHEET_ROW_KEY]);

/** `maxRows`를 넘기지 않은 화면(주문 엑셀)은 제한이 없다. */
export const exceedsMaxRows = (rowCount: number, maxRows?: number): boolean =>
  maxRows !== undefined && rowCount > maxRows;
