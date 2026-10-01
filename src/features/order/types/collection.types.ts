// src/features/order/types/collection.types.ts
import { ShoppingMalls } from '@/types/common.type';

/** 수집 화면 한 행(= 사용 중인 쇼핑몰계정)의 상태. 행(order_collections)이 없으면 WAITING. */
export type CollectionRowStatus = 'WAITING' | 'COMPLETED' | 'FAILED';
/** 저장되는 수집 결과. "수집중"은 저장하지 않는다 — 요청이 도중에 죽으면 영원히 수집중으로 남는다. */
export type CollectionResultStatus = Exclude<CollectionRowStatus, 'WAITING'>;

export interface CollectionAccountRow {
  accountId: string;
  mallCode: ShoppingMalls;
  mallId: string;
  status: CollectionRowStatus;
  periodStart: string | null;
  periodEnd: string | null;
  newCount: number | null;
  duplicateCount: number | null;
  errorMessage: string | null;
  /** KST 'YYYY-MM-DD HH:mm:ss' */
  collectedAt: string | null;
  collectedByName: string | null;
  collectedByEmail: string | null;
}

export type CollectionSearchKey = 'collectedBy';

export interface CollectionAccountFilters {
  mallCode: ShoppingMalls | 'ALL';
  mallId: string;
  searchType: CollectionSearchKey;
  /** 빈 값이면 거르지 않는다. 있으면 수집한 적 없는 계정(수집자 없음)은 빠진다. */
  searchValue: string;
}

export interface RunCollectionBody {
  accountIds: string[];
  startDate: string;
  endDate: string;
}

export interface CollectionAccountResult {
  accountId: string;
  status: CollectionResultStatus;
  newCount: number;
  duplicateCount: number;
  errorMessage: string | null;
}

export interface RunCollectionResponse {
  results: CollectionAccountResult[];
}
