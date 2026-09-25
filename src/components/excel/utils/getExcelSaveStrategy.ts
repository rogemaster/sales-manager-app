import { orderExcelSaveStrategy } from '../strategies/orderExcelSaveStrategy';
import { productExcelSaveStrategy } from '../strategies/productExcelSaveStrategy';
import { bulkCreateProducts } from '@/features/products/api/bulkCreateProducts';
import { importProductImage } from '@/features/products/api/importProductImage';
import { resolveExcelMainImages } from '@/features/products/util/excelMainImage';
import { bulkCreateOrders } from '@/features/order/api/bulkCreateOrders';
import { REMOTE_IMAGE_CONCURRENCY } from '@/shared/constant/upload.constant';
import { ExcelSaveFn, ExcelSaveType } from '@/types/excel.type';
import { formatExcelFailureSummary } from './formatExcelFailureSummary';
import { getSheetRow } from './sheetRows';

export const getExcelSaveStrategy = (type: ExcelSaveType, ownerId: string): ExcelSaveFn => {
  switch (type) {
    case 'PRODUCT':
      return async (rows, context) => {
        const products = productExcelSaveStrategy(rows);

        // 각 행이 시트 행 번호를 들고 있어 미리보기가 걸러 보낸 뒤에도 index 계산이 필요 없다.
        const { resolved, failures } = await resolveExcelMainImages(
          products,
          rows.map(getSheetRow),
          importProductImage,
          { concurrency: REMOTE_IMAGE_CONCURRENCY, onProgress: context?.onProgress },
        );

        // 전부 실패하면 등록 요청을 보내지 않는다. 오류로 올려야 미리보기가 초기화되지 않아 다시 시도할 수 있다.
        if (resolved.length === 0) throw new Error(formatExcelFailureSummary(failures));

        await bulkCreateProducts(
          resolved.map(({ product }) => product),
          ownerId,
          resolved.map(({ rowNumber }) => rowNumber),
        );

        return { savedCount: resolved.length, failures };
      };
    case 'ORDER':
      return async (rows) => {
        await bulkCreateOrders(orderExcelSaveStrategy(rows), ownerId);
        return { savedCount: rows.length, failures: [] };
      };
  }
};
