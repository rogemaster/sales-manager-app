import { ExcelSaveStrategy } from '../strategies/excelSaveStrategy';
import { OrderExcelSaveStrategy } from '../strategies/OrderExcelSaveStrategy';
import { ProductExcelSaveStrategy } from '../strategies/productExcelSaveStrategy';

export const getExcelSaveStrategy = (type: string | null): ExcelSaveStrategy<T> => {
  switch (type) {
    case 'PRODUCT':
      return new ProductExcelSaveStrategy();
    case 'ORDER':
      return new OrderExcelSaveStrategy();
    default:
      throw new Error(`잘못된 엑셀 타입 입니다. ${type} 엑셀`);
  }
};
