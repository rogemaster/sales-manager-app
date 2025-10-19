import { ExcelSaveStrategy } from './excelSaveStrategy';

export class ProductExcelSaveStrategy<T> implements ExcelSaveStrategy<T> {
  async processData(rows: T[]) {
    return rows.map((r) => ({
      ...r,
    }));
  }
}
