import { MallLinkedProduct } from '../types/mallLinkedProduct.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getMallLinkedProduct = async (id: string): Promise<MallLinkedProduct> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/${id}`);

  await throwIfNotOk(response, '쇼핑몰 연동 상품 조회 실패');

  return response.json();
};
