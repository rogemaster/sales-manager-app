import { MallLinkedProduct, UpdateMallLinkedProductBody } from '../types/mallLinkedProduct.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const updateMallLinkedProduct = async (
  id: string,
  body: UpdateMallLinkedProductBody,
): Promise<MallLinkedProduct> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  await throwIfNotOk(response, '쇼핑몰 연동 상품 저장 실패');

  return response.json();
};
