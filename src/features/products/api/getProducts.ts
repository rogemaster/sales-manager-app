import { ProductSearch } from '../types/product.types';

export const getProducts = async (data: ProductSearch) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('상품목록 호출 실패');
  }

  return response.json();
};
