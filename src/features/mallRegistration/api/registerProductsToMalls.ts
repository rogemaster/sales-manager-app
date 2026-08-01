import {
  CreateMallLinkedProductsResult,
  MallLinkedProductRequestItem,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

export const registerProductsToMalls = async (
  ownerId: string,
  createdByEmail: string,
  items: MallLinkedProductRequestItem[],
): Promise<CreateMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, createdByEmail, items }),
  });
  if (!response.ok) throw new Error('쇼핑몰 연동 전송 실패');
  return response.json();
};
