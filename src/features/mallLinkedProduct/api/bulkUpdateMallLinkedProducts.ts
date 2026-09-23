import { BulkUpdateMallLinkedProductsBody, BulkUpdateMallLinkedProductsResult } from '../types/mallLinkedProduct.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const bulkUpdateMallLinkedProducts = async (
  body: BulkUpdateMallLinkedProductsBody,
): Promise<BulkUpdateMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  throwIfUnauthorized(response);
  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 일괄수정 실패');
  }

  return response.json();
};
