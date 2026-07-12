// src/features/order/types/collection.types.ts
import { ShoppingMalls } from '@/types/common.type';

export type CollectionStatus = 'WAITING' | 'COLLECTING' | 'COMPLETED' | 'FAILED';

export interface CollectionJob {
  id: string;
  mallName: ShoppingMalls;
  mallId: string;
  status: CollectionStatus;
  lastCollectedAt: string | null;
  totalCount?: number;
  collectedCount?: number;
  ownerId: string;
}

export interface CollectionSearchParams {
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  mallId: string;
}

export interface TriggerCollectionBody {
  jobIds: string[];
}
