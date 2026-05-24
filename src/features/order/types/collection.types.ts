// src/features/order/types/collection.types.ts
import { ShoppingMalls } from '@/types/common.type';

export type CollectionStatus = 'WAITING' | 'COLLECTING' | 'COMPLETED' | 'FAILED';

export interface CollectionJob {
  id: string;
  mallName: ShoppingMalls;
  mallAccountId: string;
  status: CollectionStatus;
  lastCollectedAt: string | null;
  totalCount?: number;
  collectedCount?: number;
}

export interface CollectionSearchParams {
  startDate: string;
  endDate: string;
  mallCode: string;
  mallAccountId: string;
}

export interface TriggerCollectionBody {
  jobIds: string[];
}
