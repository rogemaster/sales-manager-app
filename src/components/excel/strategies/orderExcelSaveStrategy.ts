import { generatorOrderCode } from '@/utils/codeGenerator';
import { ExcelRowWithErrors } from '@/types/excel.type';
import dayjs from 'dayjs';

export const orderExcelSaveStrategy = async (rows: ExcelRowWithErrors[]) => {
  return rows.map((r) => ({
    ...r,
    orderId: generatorOrderCode(),
    createDate: dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss'),
  }));
};
