import { Product } from '../types/product.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

// 소유권 판정은 서버 세션이 한다 — ownerId를 보내지 않는다.
export const updateProduct = async (productId: string, data: Product) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  await throwIfNotOk(response, '상품 수정 실패');
  return response.json();
};
