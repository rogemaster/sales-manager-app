import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

/**
 * 설정이 Neon으로 이전되어 MSW가 직접 읽을 수 없다. 이 경로에는 핸들러가 없으므로 요청이
 * bypass되어 실제 route로 나가고, 같은 오리진이라 세션 쿠키가 붙어 인증도 통과한다.
 *
 * 순서 4(연동상품 DB화)에서 이 파일은 삭제된다. 전용 엔드포인트를 만들지 않는 건
 * 소비자가 곧 없어질 MSW 층 하나뿐이라서다(fetchProducts·fetchShoppingAccounts 선례).
 */
export const fetchShoppingSettingsForMock = async (): Promise<ShoppingSetting[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // 기본 날짜 필터가 최근 7일이라 그대로 두면 오래 전에 만든 설정이 스냅샷 원본에서 빠진다.
      filters: {
        dateType: 'createdAt',
        startDate: '2000-01-01',
        endDate: '2999-12-31',
        mallCode: 'ALL',
        mallAccountId: 'ALL',
        searchValue: '',
      },
      page: 1,
      pageSize: 1000,
    }),
  });

  // 실패를 조용히 삼키면 전송이 그냥 0건으로 끝나 원인을 찾기 어렵다.
  if (!response.ok) {
    console.error(`fetchShoppingSettingsForMock 실패: ${response.status}`);
    return [];
  }

  const { settings, total } = (await response.json()) as { settings: ShoppingSetting[]; total: number };

  if (total > settings.length) {
    console.warn(`fetchShoppingSettingsForMock: ${total}건 중 ${settings.length}건만 가져왔다.`);
  }

  return settings;
};
