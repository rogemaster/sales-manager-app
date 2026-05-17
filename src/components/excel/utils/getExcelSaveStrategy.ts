import { orderExcelSaveStrategy } from '../strategies/orderExcelSaveStrategy';
import { productExcelSaveStrategy } from '../strategies/productExcelSaveStrategy';
import { bulkCreateProducts } from '@/features/products/api/bulkCreateProducts';
import { bulkCreateOrders } from '@/features/order/api/bulkCreateOrders';
import { ExcelRowWithErrors } from '@/types/excel.type';

type SaveType = 'PRODUCT' | 'ORDER';

export const getExcelSaveStrategy = (type: SaveType) => {
  switch (type) {
    case 'PRODUCT':
      return (rows: ExcelRowWithErrors[]) => {
        const products = productExcelSaveStrategy(rows);
        return bulkCreateProducts(products);
      };
    case 'ORDER':
      return (rows: ExcelRowWithErrors[]) => {
        const orders = orderExcelSaveStrategy(rows);
        return bulkCreateOrders(orders);
      };
  }
};
