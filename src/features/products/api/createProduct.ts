import { CreateProductRequest } from '../types/product.types';

export const createProduct = async (data: CreateProductRequest, ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, ownerId }),
  });

  if (!response.ok) {
    throw new Error('상품등록 실패');
  }
};
