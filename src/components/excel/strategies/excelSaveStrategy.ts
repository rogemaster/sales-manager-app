export interface ExcelSaveStrategy<T> {
  processData(row: T[]): Promise<T[]>;
}
