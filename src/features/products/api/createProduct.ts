import { Product } from '../types/product.types';

export const createProduct = async (data: Product) => {
  console.log('상품등록', data);
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/product/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('상품등록 실패');
  }
};
