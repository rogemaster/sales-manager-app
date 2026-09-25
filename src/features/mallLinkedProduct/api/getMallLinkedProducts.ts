import { GetMallLinkedProductsResponse, MallLinkedProductSearch } from '../types/mallLinkedProduct.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getMallLinkedProducts = async (
  filters: MallLinkedProductSearch,
  page: number,
  pageSize: number = 10,
): Promise<GetMallLinkedProductsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });

  await throwIfNotOk(response, '쇼핑몰 연동 상품 목록 호출 실패');

  return response.json();
};
