import { GetMallLinkedProductsResponse, MallLinkedProductSearch } from '../types/mallLinkedProduct.types';

export const getMallLinkedProducts = async (
  ownerId: string,
  data: MallLinkedProductSearch,
  page: number,
  pageSize: number = 10,
): Promise<GetMallLinkedProductsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, ...data, page, pageSize }),
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 목록 호출 실패');
  }

  return response.json();
};
