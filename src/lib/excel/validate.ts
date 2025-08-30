export type Cell = string | number | boolean | null | undefined;

export function validateSheet(rowsData: Cell[][], requiredHeaders: string[]) {
  // 헤더 확인
  const headers = rowsData[0];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    return { result: false, errorHeaders: missingHeaders };
  }

  const dataRows = rowsData.slice(1);
  const errors: string[] = [];

  dataRows.forEach((row, rowIndex) => {
    requiredHeaders.forEach((header) => {
      const colIndex = headers.indexOf(header);
      const cell = row[colIndex];
      if (cell === undefined || cell === null || (typeof cell === 'string' && cell.trim() === '')) {
        errors.push(`Row ${rowIndex + 2}, ${header} 값이 없습니다.`);
      }
    });
  });

  return errors.length ? { result: false, errors } : { result: true as const, errors: [] };
}
