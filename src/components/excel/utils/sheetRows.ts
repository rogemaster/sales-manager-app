import * as XLSX from 'xlsx';
import { ExcelRowType, ExcelRowWithErrors, ExcelTemplateInfo } from '@/types/excel.type';

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

/**
 * 첫 시트를 행 목록으로 읽는다. 숫자 컬럼(`numeric`)만 셀의 원래 값(v)을, 나머지는 **화면에 보이는 글자**(w)를 쓴다.
 *
 * - 원래 값을 그대로 쓰면 셀 타입이 새어 들어온다. 서식이 "일반"인 칸이나 CSV에서 `TRUE`는 불리언이 되고,
 *   CSV의 `00123`은 숫자 123이 되어 앞의 0이 조용히 사라진다. 사용자가 적은 것은 글자다.
 * - 숫자 컬럼까지 보이는 글자로 읽으면 쉼표 서식이 `"1,000"`이 되어 숫자 검증에서 걸린다.
 * - 날짜 서식 셀은 글자 컬럼에서 표시 글자(예: `9/17/26`)로 들어온다. 원래 값(일련번호)보다 나빠지지 않아 그대로 둔다.
 */
export const readSheetRows = (worksheet: XLSX.WorkSheet, templateInfo: ExcelTemplateInfo[]): ExcelRowType[] => {
  const numericHeaders = templateInfo.filter(({ numeric }) => numeric).map(({ name }) => name);
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ExcelRowType[];
  const textRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false }) as ExcelRowType[];

  // 두 결과는 같은 시트를 같은 규칙(빈 행 건너뛰기)으로 읽어 순서가 같다. 행 번호는 펼치기 전인 textRows에서 붙인다.
  return attachSheetRowNumbers(textRows).map((row, index) => {
    const numericValues = Object.fromEntries(
      numericHeaders.filter((header) => header in rawRows[index]).map((header) => [header, rawRows[index][header]]),
    );
    return { ...row, ...numericValues };
  });
};

export const getSheetRow = (row: ExcelRowType | ExcelRowWithErrors): number => Number(row[EXCEL_SHEET_ROW_KEY]);

/** `maxRows`를 넘기지 않은 화면(주문 엑셀)은 제한이 없다. */
export const exceedsMaxRows = (rowCount: number, maxRows?: number): boolean =>
  maxRows !== undefined && rowCount > maxRows;
