import { Product, ProductSearch } from '../types/product.types';

export interface GetProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getProducts = async (ownerId: string, data: ProductSearch, page: number, pageSize: number = 10) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, ...data, page, pageSize }),
  });

  if (!response.ok) {
    throw new Error('상품목록 호출 실패');
  }

  return response.json() as Promise<GetProductsResponse>;
};
