import { HomeLinkedProductStats, HomeOrderStats, HomeStats } from '@/features/home/types/home.types';
import { ProductStateType } from '@/features/products/types/product.types';
import { MallLinkStatus } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { OrderStatusTypes } from '@/features/order/types/order.types';

export interface StateCountRow {
  state: string;
  count: number;
}

const STATE_TO_KEY: Record<ProductStateType, Exclude<keyof HomeStats, 'total'>> = {
  ON_SALE: 'onSale',
  SOLD_OUT: 'soldOut',
  SALE_DIS: 'saleDis',
  WAIT_SALE: 'waitSale',
};

// state 컬럼은 text라 코드 밖의 값이 있을 수 있다. 그런 행은 칸에 담지 않지만 total에는 센다 —
// total은 "등록된 상품 수"다.
export const toHomeStats = (rows: StateCountRow[]): HomeStats => {
  const stats: HomeStats = { total: 0, onSale: 0, soldOut: 0, saleDis: 0, waitSale: 0 };
  for (const { state, count } of rows) {
    stats.total += count;
    if (Object.hasOwn(STATE_TO_KEY, state)) stats[STATE_TO_KEY[state as ProductStateType]] += count;
  }
  return stats;
};

export interface StatusCountRow {
  status: string;
  count: number;
}

const STATUS_TO_KEY: Record<MallLinkStatus, Exclude<keyof HomeLinkedProductStats, 'total'>> = {
  success: 'success',
  failed: 'failed',
};

// toHomeStats와 같은 규칙 — 알 수 없는 status는 칸에 담지 않지만 total에는 센다.
export const toLinkedProductStats = (rows: StatusCountRow[]): HomeLinkedProductStats => {
  const stats: HomeLinkedProductStats = { total: 0, success: 0, failed: 0 };
  for (const { status, count } of rows) {
    stats.total += count;
    if (Object.hasOwn(STATUS_TO_KEY, status)) stats[STATUS_TO_KEY[status as MallLinkStatus]] += count;
  }
  return stats;
};

// 완료 상태(취소·교환·반품 완료)는 처리할 일이 아니라 카드에 담지 않는다 — 옛 MSW 집계와 같은 매핑이다.
const ORDER_STATUS_TO_KEY: Partial<Record<OrderStatusTypes, keyof HomeOrderStats>> = {
  NEW_ORDER: 'newOrder',
  CONFIRMED_ORDER: 'confirmedOrder',
  INVOICE_REGISTER: 'invoice',
  INVOICE_COMPLETE: 'invoice',
  REQUEST_CANCEL: 'cancelClaim',
  PROGRESS_CANCEL: 'cancelClaim',
  REQUEST_RETURN: 'returnClaim',
  PROGRESS_RETURN: 'returnClaim',
  REQUEST_EXCHANGE: 'exchangeClaim',
  PROGRESS_EXCHANGE: 'exchangeClaim',
};

export const toHomeOrderStats = (rows: StatusCountRow[]): HomeOrderStats => {
  const stats: HomeOrderStats = {
    newOrder: 0,
    confirmedOrder: 0,
    invoice: 0,
    cancelClaim: 0,
    returnClaim: 0,
    exchangeClaim: 0,
  };
  for (const { status, count } of rows) {
    const key = Object.hasOwn(ORDER_STATUS_TO_KEY, status)
      ? ORDER_STATUS_TO_KEY[status as OrderStatusTypes]
      : undefined;
    if (key) stats[key] += count;
  }
  return stats;
};
