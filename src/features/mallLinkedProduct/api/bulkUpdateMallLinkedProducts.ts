import { BulkUpdateMallLinkedProductsBody, BulkUpdateMallLinkedProductsResult } from '../types/mallLinkedProduct.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const bulkUpdateMallLinkedProducts = async (
  body: BulkUpdateMallLinkedProductsBody,
): Promise<BulkUpdateMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  await throwIfNotOk(response, '쇼핑몰 연동 상품 일괄수정 실패');

  return response.json();
};
