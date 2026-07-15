import { MOCK_COLLECTION_JOBS } from '../data/MockCollectionJobsData';

// 수집 시작 시각 (ms) 저장 — 경과 시간으로 진행률 계산
const collectionProgressMap: Record<string, number> = {};

export function getCollectionProgressMap(): Record<string, number> {
  return collectionProgressMap;
}

export function triggerOrderCollectionMock(jobIds: string[]): number {
  const now = Date.now();
  let triggered = 0;

  jobIds.forEach((id) => {
    const job = MOCK_COLLECTION_JOBS.find((j) => j.id === id);
    if (job && job.status !== 'COLLECTING') {
      job.status = 'COLLECTING';
      job.totalCount = Math.floor(Math.random() * 400) + 100; // 100~500건
      job.collectedCount = 0;
      collectionProgressMap[id] = now;
      triggered++;
    }
  });

  return triggered;
}
