import { describe, it, expect, vi } from 'vitest';
import type { CollectionJob } from '@/features/order/types/collection.types';

const makeJob = (overrides: Partial<CollectionJob>): CollectionJob => ({
  id: 'JOB-001',
  mallName: 'COUP',
  mallId: 'coupang_seller1',
  status: 'WAITING',
  lastCollectedAt: null,
  ownerId: 'owner-1',
  ...overrides,
});

const { JOBS } = vi.hoisted(() => ({ JOBS: [] as CollectionJob[] }));
vi.mock('../data/MockCollectionJobsData', () => ({ MOCK_COLLECTION_JOBS: JOBS }));

JOBS.push(
  makeJob({ id: 'JOB-001', ownerId: 'owner-1', mallName: 'COUP' }),
  makeJob({ id: 'JOB-002', ownerId: 'owner-1', mallName: 'NSST' }),
  makeJob({ id: 'JOB-003', ownerId: 'owner-2', mallName: 'COUP' }),
);

import { getCollectionJobsMock } from './getCollectionJobs';

const defaultParams = { startDate: '', endDate: '', mallCode: 'ALL' as const, mallId: 'ALL' };

describe('getCollectionJobsMock', () => {
  it('ownerId가 일치하는 작업만 반환한다', () => {
    const result = getCollectionJobsMock('owner-1', defaultParams);
    expect(result).toHaveLength(2);
    expect(result.find((j) => j.id === 'JOB-003')).toBeUndefined();
  });

  it('존재하지 않는 ownerId면 빈 배열을 반환한다', () => {
    const result = getCollectionJobsMock('owner-999', defaultParams);
    expect(result).toHaveLength(0);
  });

  it('ownerId와 mallCode 필터를 함께 적용한다', () => {
    const result = getCollectionJobsMock('owner-1', { ...defaultParams, mallCode: 'COUP' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('JOB-001');
  });
});
