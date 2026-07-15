import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { CollectionSearchParams, TriggerCollectionBody } from '@/features/order/types/collection.types';
import { getCollectionJobsMock } from '../utils/getCollectionJobs';
import { triggerOrderCollectionMock } from '../utils/triggerOrderCollection';
import { ShoppingMalls } from '@/types/common.type';
import { MOCK_COLLECTION_JOBS } from '../data/MockCollectionJobsData';
import { allOwnedBy } from '../utils/verifyOwnership';

export const collectionHandlers = [
  http.get(`${baseUrl}/api/order/collection/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const ownerId = url.searchParams.get('ownerId') ?? '';
    const params: CollectionSearchParams = {
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
      mallCode: (url.searchParams.get('mallCode') ?? 'ALL') as ShoppingMalls | 'ALL',
      mallId: url.searchParams.get('mallId') ?? 'ALL',
    };
    return HttpResponse.json(getCollectionJobsMock(ownerId, params));
  }),

  http.post(`${baseUrl}/api/order/collection/trigger`, async ({ request }) => {
    await delay(300);
    const ownerId = request.headers.get('X-Owner-Id');
    const { jobIds } = (await request.json()) as TriggerCollectionBody;
    if (!allOwnedBy(jobIds, ownerId, MOCK_COLLECTION_JOBS)) {
      return new HttpResponse(null, { status: 403 });
    }
    const triggeredCount = triggerOrderCollectionMock(jobIds);
    return HttpResponse.json({ success: true, triggeredCount });
  }),
];
