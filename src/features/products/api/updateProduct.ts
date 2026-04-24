import { Product } from '../types/product.types';

export const updateProduct = async (productId: string, data: Product) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/product/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('상품 데이터 호출 실패');
  }

  return response.json();
};
