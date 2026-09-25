import { throwIfNotOk } from '@/shared/utils/apiResponse';

// 소유권 판정은 서버 세션이 한다 — ownerId를 보내지 않는다.
export const getProduct = async (productId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`);
  await throwIfNotOk(response, '상품 데이터 호출 실패');
  return response.json();
};
