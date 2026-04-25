import { Product } from '../types/product.types';

export const createProduct = async (data: Product) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('상품등록 실패');
  }
};
