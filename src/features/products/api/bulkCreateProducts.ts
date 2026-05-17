import { Product } from '../types/product.types';

export const bulkCreateProducts = async (data: Product[]) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('상품 대량 등록 실패');

  return response.json() as Promise<{ success: boolean; count: number }>;
};
