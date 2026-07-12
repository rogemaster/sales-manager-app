import dayjs from 'dayjs';
import { CollectionJob, CollectionSearchParams } from '@/features/order/types/collection.types';
import { MOCK_COLLECTION_JOBS } from '../data/MockCollectionJobsData';
import { getCollectionProgressMap } from './triggerOrderCollection';

const COLLECTION_DURATION_MS = 10_000; // 10초 후 완료

export function getCollectionJobsMock(params: CollectionSearchParams): CollectionJob[] {
  const progressMap = getCollectionProgressMap();
  const now = Date.now();

  MOCK_COLLECTION_JOBS.forEach((job) => {
    const startTime = progressMap[job.id];
    if (job.status === 'COLLECTING' && startTime !== undefined) {
      const progress = Math.min((now - startTime) / COLLECTION_DURATION_MS, 1);
      job.collectedCount = Math.floor(progress * (job.totalCount ?? 100));
      if (progress >= 1) {
        job.status = 'COMPLETED';
        job.lastCollectedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
        delete progressMap[job.id];
      }
    }
  });

  return MOCK_COLLECTION_JOBS.filter((job) => {
    if (params.mallCode !== 'ALL' && job.mallName !== params.mallCode) return false;
    if (params.mallId !== 'ALL' && job.mallId !== params.mallId) return false;
    return true;
  });
}
