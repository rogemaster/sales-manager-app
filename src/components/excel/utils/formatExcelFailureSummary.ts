import { ExcelRowFailure } from '@/types/excel.type';

/**
 * 첫 번째 오류 하나만 보여주고 나머지는 건수로 줄인다(사용자 결정 — 알림이 실패 행 수만큼 길어지지 않게).
 * "첫 번째"는 발생 순서가 아니라 시트 행 번호가 가장 작은 실패다. 동시 실행이라 발생 순서는 매번 달라진다.
 */
export const formatExcelFailureSummary = (failures: readonly ExcelRowFailure[]): string => {
  if (failures.length === 0) return '';

  const [first] = [...failures].sort((a, b) => a.rowNumber - b.rowNumber);
  const rest = failures.length - 1;
  return `[${first.rowNumber}행] ${first.message}${rest > 0 ? ` (외 ${rest}건 오류)` : ''}`;
};
