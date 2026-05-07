import { generatorProductCode } from '@/utils/codeGenerator';
import { ExcelRowWithErrors } from '@/types/excel.type';
import dayjs from 'dayjs';

export const productExcelSaveStrategy = async (rows: ExcelRowWithErrors[]) => {
  return rows.map((r) => ({
    ...r,
    productId: generatorProductCode(),
    createDate: dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss'),
  }));
};
