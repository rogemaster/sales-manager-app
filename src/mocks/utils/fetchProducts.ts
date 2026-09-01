import { Product } from '@/features/products/types/product.types';

// 상품이 Neon으로 이전되어 MSW가 직접 읽을 수 없다. 이 경로에는 핸들러가 없으므로 요청이
// bypass되어 실제 route로 나가고, 같은 오리진이라 세션 쿠키가 붙어 인증도 통과한다.
// pageSize 1000은 "사실상 전체"다 — 전용 엔드포인트를 만들지 않는 건 소비자가 곧 없어질 MSW 층뿐이라서다.
export const fetchProductsForMock = async (): Promise<Product[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // 기본 날짜 필터가 최근 7일이라 그대로 두면 오래된 상품이 스냅샷 원본에서 빠진다.
      dateType: 'register',
      startDate: '2000-01-01',
      endDate: '2999-12-31',
      saleType: 'ALL',
      categoryId: 'ALL',
      searchType: 'productName',
      searchValue: '',
      page: 1,
      pageSize: 1000,
    }),
  });

  // 실패를 조용히 삼키지 않는다 — 몰 연동 경로는 403으로 눈에 띄지만, 홈 통계·최근 상품은
  // 그냥 0건으로 렌더돼 콘솔에 아무 신호도 안 남으면 원인을 찾기 어렵다.
  if (!response.ok) {
    console.error(`fetchProductsForMock 실패: ${response.status}`);
    return [];
  }

  const { products, total } = (await response.json()) as { products: Product[]; total: number };

  // 초과분이 빠진 채로 몰 연동을 전송하면 그 상품이 "존재하지 않음"으로 판정돼 403이 나간다 — 권한 문제로 오인된다.
  if (total > products.length) {
    console.warn(`fetchProductsForMock: ${total}건 중 ${products.length}건만 가져왔다. 초과분은 MSW 층에서 누락된다.`);
  }

  return products;
};
