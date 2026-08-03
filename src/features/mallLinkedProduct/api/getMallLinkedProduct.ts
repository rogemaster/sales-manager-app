import { MallLinkedProduct } from '../types/mallLinkedProduct.types';

export const getMallLinkedProduct = async (id: string, ownerId: string): Promise<MallLinkedProduct> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/${id}`, {
    headers: { 'X-Owner-Id': ownerId },
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 조회 실패');
  }

  return response.json();
};
