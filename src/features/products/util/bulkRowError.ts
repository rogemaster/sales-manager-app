/**
 * bulk route는 요청 배열 기준 index만 안다. 미리보기가 오류 행을 걸러 보내므로 그 index는 시트 행과 다르다 —
 * 요청을 만든 클라이언트가 가진 시트 행 번호로 바꿔 붙인다. 서버는 시트 개념을 몰라도 된다.
 */
export const formatBulkRowError = (error: string, rowIndex: unknown, rowNumbers: readonly number[]): string => {
  if (typeof rowIndex !== 'number' || !Number.isInteger(rowIndex)) return error;
  const rowNumber = rowNumbers[rowIndex];
  return rowNumber === undefined ? error : `[${rowNumber}행] ${error}`;
};
