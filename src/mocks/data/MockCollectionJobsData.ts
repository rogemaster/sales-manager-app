// src/mocks/data/MockCollectionJobsData.ts
import { CollectionJob } from '@/features/order/types/collection.types';

const SUPER_A_ID = 'usr_2f20748f';

const RAW_COLLECTION_JOBS: Omit<CollectionJob, 'ownerId'>[] = [
  {
    id: 'JOB-001',
    mallName: 'COUP',
    mallId: 'coupang_seller1',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-25 09:00:00',
    totalCount: 150,
    collectedCount: 150,
  },
  {
    id: 'JOB-002',
    mallName: 'GMK',
    mallId: 'gadmin1111',
    status: 'WAITING',
    lastCollectedAt: null,
  },
  {
    id: 'JOB-003',
    mallName: 'NSST',
    mallId: 'naver_store1',
    status: 'FAILED',
    lastCollectedAt: '2026-05-24 15:30:00',
    totalCount: 200,
    collectedCount: 87,
  },
  {
    id: 'JOB-004',
    mallName: 'AUC',
    mallId: 'auction_admin1',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-25 08:00:00',
    totalCount: 300,
    collectedCount: 300,
  },
  {
    id: 'JOB-005',
    mallName: '11ST',
    mallId: 'elevenst_shop1',
    status: 'WAITING',
    lastCollectedAt: null,
  },
  {
    id: 'JOB-006',
    mallName: 'INTP',
    mallId: 'ipark_seller',
    status: 'COMPLETED',
    lastCollectedAt: '2026-05-23 11:00:00',
    totalCount: 80,
    collectedCount: 80,
  },
];

export const MOCK_COLLECTION_JOBS: CollectionJob[] = RAW_COLLECTION_JOBS.map((j) => ({ ...j, ownerId: SUPER_A_ID }));
