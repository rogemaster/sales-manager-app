import { ResendMallLinkedProductsResult } from '../types/mallLinkedProduct.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const resendMallLinkedProducts = async (ids: string[]): Promise<ResendMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  await throwIfNotOk(response, '쇼핑몰 연동 상품 재전송 실패');

  return response.json();
};
