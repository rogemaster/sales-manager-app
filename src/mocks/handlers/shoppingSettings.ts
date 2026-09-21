import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { countMockLinkedProductsBySettings } from '../utils/countLinkedProductsBySettings';

/**
 * 설정은 Neon으로 이전됐다(실행 순서 3). 남은 하나는 경로만 설정 도메인이고
 * 세는 대상이 연동상품(아직 MSW)이라 실 route로 옮길 수 없다 — 순서 4에서 함께 간다.
 */
export const shoppingSettingHandlers = [
  http.post(`${baseUrl}/api/shopping/settings/linked-count`, async ({ request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const { ids } = (await request.json()) as { ids: string[] };
    if (!ownerId) return new HttpResponse(null, { status: 403 });

    // 설정 소유권은 따로 확인하지 않는다 — 세는 쪽이 이미 ownerId로 거르므로
    // 남의 설정 id를 섞어 보내도 0만 늘어난다.
    return HttpResponse.json({ totalCount: countMockLinkedProductsBySettings(ownerId, ids) });
  }),
];
