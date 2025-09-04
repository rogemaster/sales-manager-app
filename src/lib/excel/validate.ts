export type Cell = string | number | boolean | null | undefined;

export type ValidationError = {
  row: number;
  header: string;
  message: string;
};

export type ValidationResult =
  | { result: true; errors: [] }
  | { result: false; errors: ValidationError[]; errorHeaders?: string[] };

export function validateSheet(rowsData: Cell[][], requiredHeaders: string[]): ValidationResult {
  if (!Array.isArray(rowsData) || rowsData.length === 0) {
    return {
      result: false,
      errors: [{ row: 0, header: '', message: '시트가 비어있거나 헤더가 없습니다.' }],
    };
  }

  // 헤더 확인
  const headers = rowsData[0];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    return { result: false, errors: [], errorHeaders: missingHeaders };
  }

  const headerIndexMap = Object.fromEntries(headers.map((h, i) => [h, i]));
  const dataRows = rowsData.slice(1);
  const errors: ValidationError[] = [];

  dataRows.forEach((row, rowIndex) => {
    requiredHeaders.forEach((header) => {
      const colIndex = headerIndexMap[header];
      const cell = row[colIndex];

      const isEmpty = cell === undefined || cell === null || (typeof cell === 'string' && cell.trim() === '');

      if (isEmpty) {
        errors.push({
          row: rowIndex + 2,
          header,
          message: `${header} 값이 없습니다.`,
        });
      }
    });
  });

  // dataRows.forEach((row, rowIndex) => {
  //   requiredHeaders.forEach((header) => {
  //     const colIndex = headers.indexOf(header);
  //     const cell = row[colIndex];
  //     if (cell === undefined || cell === null || (typeof cell === 'string' && cell.trim() === '')) {
  //       errors.push(`Row ${rowIndex + 2}, ${header} 값이 없습니다.`);
  //     }
  //   });
  // });

  return errors.length > 0 ? { result: false, errors } : { result: true as const, errors: [] };
}
