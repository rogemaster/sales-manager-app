export const getProduct = async (productId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`);

  if (!response.ok) {
    throw new Error('상품 데이터 호출 실패');
  }

  return response.json();
};
