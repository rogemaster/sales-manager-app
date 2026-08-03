import { MallLinkedProduct, UpdateMallLinkedProductBody } from '../types/mallLinkedProduct.types';

export const updateMallLinkedProduct = async (
  id: string,
  ownerId: string,
  body: UpdateMallLinkedProductBody,
): Promise<MallLinkedProduct> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 저장 실패');
  }

  return response.json();
};
