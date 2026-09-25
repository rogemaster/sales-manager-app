import {
  CreateMallLinkedProductsResult,
  MallLinkedProductRequestItem,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const registerProductsToMalls = async (
  items: MallLinkedProductRequestItem[],
): Promise<CreateMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  await throwIfNotOk(response, '쇼핑몰 연동 전송 실패');
  return response.json();
};
