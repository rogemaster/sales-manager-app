import { orderExcelSaveStrategy } from '../strategies/orderExcelSaveStrategy';
import { productExcelSaveStrategy } from '../strategies/productExcelSaveStrategy';

export const getExcelSaveStrategy = (type: string | null) => {
  switch (type) {
    case 'PRODUCT':
      return productExcelSaveStrategy;
    case 'ORDER':
      return orderExcelSaveStrategy;
    default:
      throw new Error(`잘못된 엑셀 타입 입니다. ${type} 엑셀`);
  }
};
