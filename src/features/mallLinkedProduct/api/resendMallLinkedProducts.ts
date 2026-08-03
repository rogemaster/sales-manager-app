import { ResendMallLinkedProductsResult } from '../types/mallLinkedProduct.types';

export const resendMallLinkedProducts = async (
  ownerId: string,
  ids: string[],
): Promise<ResendMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, ids }),
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 재전송 실패');
  }

  return response.json();
};
