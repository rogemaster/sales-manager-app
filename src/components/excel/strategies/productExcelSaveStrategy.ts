import { generatorProductCode } from '@/utils/codeGenerator';
import { ExcelSaveStrategy } from './excelSaveStrategy';
import dayjs from 'dayjs';

// 상품 타입에 맞게 데이터 가공
export class ProductExcelSaveStrategy<Product> implements ExcelSaveStrategy<Product> {
  async processData(rows: Product[]): Promise<Product[]> {
    return rows.map((r) => ({
      ...r,
      productId: generatorProductCode(),
      createDate: dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss'),
    }));
  }
}
