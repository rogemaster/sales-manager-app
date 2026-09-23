import { CreateProductRequest } from '../types/product.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

// ownerId 인자는 시그니처에 남기되 body에서 뺀다. 소유권 판정은 서버 세션이 한다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createProduct = async (data: CreateProductRequest, _ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  throwIfUnauthorized(response);
  if (!response.ok) {
    // 서버가 어느 값이 왜 거부됐는지 알려준다 — 고정 문구로 덮으면 그 정보가 사라진다.
    const { error } = await response.json().catch(() => ({ error: '' }));
    throw new Error(error || '상품등록 실패');
  }
};
