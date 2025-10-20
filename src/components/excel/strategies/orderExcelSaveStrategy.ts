import { generatorOrderCode } from '@/utils/codeGenerator';
import { ExcelSaveStrategy } from './excelSaveStrategy';
import dayjs from 'dayjs';

// 주문 타입에 맞게 데이터 가공
export class OrderExcelSaveStrategy<T> implements ExcelSaveStrategy<T> {
  async processData(rows: T[]): Promise<T[]> {
    return rows.map((r: T) => ({
      ...r,
      orderId: generatorOrderCode(),
      createDate: dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss'),
    }));
  }
}
