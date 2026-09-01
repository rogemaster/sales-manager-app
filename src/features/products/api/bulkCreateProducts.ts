import { Product } from '../types/product.types';

// ownerId 인자는 시그니처에 남기되 body에서 뺀다. 소유권 판정은 서버 세션이 한다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const bulkCreateProducts = async (data: Omit<Product, 'ownerId'>[], _ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products: data }),
  });

  // 서버는 "3번째 행의 이미지는..."처럼 행 번호를 담아 보낸다. 고정 문구로 덮지 않는다.
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: '' }));
    throw new Error(error || '상품 대량 등록 실패');
  }

  return response.json() as Promise<{ success: boolean; count: number }>;
};
