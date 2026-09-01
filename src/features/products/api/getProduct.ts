// ownerId 인자는 시그니처에 남기되 헤더에서 뺀다. 소유권 판정은 서버 세션이 한다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getProduct = async (productId: string, _ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`);

  if (!response.ok) {
    throw new Error('상품 데이터 호출 실패');
  }

  return response.json();
};
