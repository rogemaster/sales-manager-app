import { CreateProductRequest } from '../types/product.types';

// ownerId 인자는 시그니처에 남기되 body에서 뺀다. 소유권 판정은 서버 세션이 한다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createProduct = async (data: CreateProductRequest, _ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('상품등록 실패');
  }
};
