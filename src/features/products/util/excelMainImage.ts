import { ExcelImageImportFn, ExcelRowFailure } from '@/types/excel.type';
import { mapWithConcurrency } from '@/shared/utils/concurrency';
import { isUnauthorizedError } from '@/shared/utils/unauthorized';

export const IMAGE_IMPORT_FAILED_REASON = '이미지를 가져오지 못했습니다.';
const EMPTY_MAIN_IMAGE_REASON = '메인이미지가 비어 있습니다.';

/**
 * 엑셀 상품들의 외부 이미지 주소를 R2로 가져와 key로 바꾼다.
 *
 * 실패한 행은 빼고 나머지를 돌려준다 — 업로드 시 확인을 통과했어도 그 사이 외부 서버가 실패할 수 있고,
 * 그 몇 행 때문에 나머지 저장을 막지 않는다(사용자 결정). 빈 값은 업로드 검증이 앞에서 거르지만 그 전제에
 * 기대지 않고 호출 없이 실패로 기록한다.
 */
export const resolveExcelMainImages = async <P extends { mainImage?: string | null }>(
  products: readonly P[],
  rowNumbers: readonly number[],
  importFn: ExcelImageImportFn,
  options: { concurrency: number; onProgress?: (done: number, total: number) => void },
): Promise<{ resolved: { product: P; rowNumber: number }[]; failures: ExcelRowFailure[] }> => {
  const settled = await mapWithConcurrency(
    products,
    options.concurrency,
    async (product) => {
      const url = typeof product.mainImage === 'string' ? product.mainImage.trim() : '';
      if (!url) return { ok: false as const, reason: EMPTY_MAIN_IMAGE_REASON };
      return importFn(url);
    },
    options.onProgress,
  );

  const resolved: { product: P; rowNumber: number }[] = [];
  const failures: ExcelRowFailure[] = [];

  settled.forEach((result, index) => {
    const rowNumber = rowNumbers[index];

    if (result.status === 'rejected') {
      if (isUnauthorizedError(result.reason)) throw result.reason;
      failures.push({ rowNumber, message: `[메인이미지] ${IMAGE_IMPORT_FAILED_REASON}` });
      return;
    }
    if (!result.value.ok) {
      failures.push({ rowNumber, message: `[메인이미지] ${result.value.reason}` });
      return;
    }
    resolved.push({ product: { ...products[index], mainImage: result.value.key }, rowNumber });
  });

  return { resolved, failures };
};
