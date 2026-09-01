import { PaginationMeta } from '@/types/common.type';
import { Product, ProductSearch } from '../types/product.types';

export interface GetProductsResponse extends PaginationMeta {
  products: Product[];
}

// ownerId 인자는 시그니처에 남기되 body에서 뺀다. 소유권 판정은 서버 세션이 한다.
export const getProducts = async (_ownerId: string, data: ProductSearch, page: number, pageSize: number = 10) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, page, pageSize }),
  });

  if (!response.ok) {
    throw new Error('상품목록 호출 실패');
  }

  return response.json() as Promise<GetProductsResponse>;
};
