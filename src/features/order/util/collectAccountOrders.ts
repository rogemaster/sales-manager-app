import { CollectionResultStatus } from '../types/collection.types';
import type { NaverProductOrder, NaverProductOrderPage, OrderInsert, TranslateResult } from './naverOrderTranslate';

/** 계정당 읽는 페이지 상한(시뮬레이터 페이지 크기 50 × 10 = 500건). 제품 정책이다. */
export const COLLECTION_MAX_PAGES = 10;
export const COLLECTION_PAGE_LIMIT_MESSAGE = '1회 수집 한도(500건)를 넘었습니다. 기간을 나눠 다시 수집하세요.';
export const ORDER_SAVE_FAILED_MESSAGE = '주문 저장 중 오류가 발생했습니다.';

export type PageFetch = { ok: true; page: NaverProductOrderPage } | { ok: false; message: string };

export interface CollectOutcome {
  status: CollectionResultStatus;
  newCount: number;
  duplicateCount: number;
  errorMessage: string | null;
}

/** 삽입 1회. 예외는 실패 사유로 바꾼다 — 한 계정의 저장 오류가 다른 계정 수집을 멈추면 안 된다. */
const insertCounting = async (
  orders: OrderInsert[],
  insertOrders: (orders: OrderInsert[]) => Promise<number>,
): Promise<{ ok: true; inserted: number } | { ok: false }> => {
  if (orders.length === 0) return { ok: true, inserted: 0 };
  try {
    return { ok: true, inserted: await insertOrders(orders) };
  } catch (error) {
    console.error('수집 주문 저장 실패:', error);
    return { ok: false };
  }
};

/**
 * 네이버 변경 주문을 nextCursor가 null이 될 때까지 읽어 넣는다(라운드 2 커서 계약 — 페이지 사이 상태 변경에도 누락 없음).
 * 실패해도 앞 페이지에서 넣은 주문은 남는다 — 다시 수집하면 쇼핑몰주문번호 유니크 인덱스가 중복으로 건너뛴다.
 * 번역 실패가 섞인 페이지는 통째로 넣지 않는다(어디까지 넣었는지 사용자가 추적할 수 없게 되므로).
 */
export const collectPagedOrders = async (deps: {
  fetchPage: (cursor: string | null) => Promise<PageFetch>;
  translate: (order: NaverProductOrder) => TranslateResult;
  insertOrders: (orders: OrderInsert[]) => Promise<number>;
  maxPages?: number;
}): Promise<CollectOutcome> => {
  const maxPages = deps.maxPages ?? COLLECTION_MAX_PAGES;
  let newCount = 0;
  let duplicateCount = 0;
  const failed = (errorMessage: string): CollectOutcome => ({
    status: 'FAILED',
    newCount,
    duplicateCount,
    errorMessage,
  });

  let cursor: string | null = null;
  for (let read = 0; read < maxPages; read += 1) {
    const fetched = await deps.fetchPage(cursor);
    if (!fetched.ok) return failed(fetched.message);

    const orders: OrderInsert[] = [];
    for (const productOrder of fetched.page.productOrders) {
      const translated = deps.translate(productOrder);
      if (!translated.ok) return failed(translated.message);
      orders.push(translated.order);
    }

    const result = await insertCounting(orders, deps.insertOrders);
    if (!result.ok) return failed(ORDER_SAVE_FAILED_MESSAGE);
    newCount += result.inserted;
    duplicateCount += orders.length - result.inserted;

    cursor = fetched.page.nextCursor;
    if (cursor === null) return { status: 'COMPLETED', newCount, duplicateCount, errorMessage: null };
  }
  return failed(COLLECTION_PAGE_LIMIT_MESSAGE);
};

/** 무작위로 만든 주문(네이버 외 몰)을 넣는다. */
export const insertGeneratedOrders = async (
  orders: OrderInsert[],
  insertOrders: (orders: OrderInsert[]) => Promise<number>,
): Promise<CollectOutcome> => {
  const result = await insertCounting(orders, insertOrders);
  if (!result.ok) return { status: 'FAILED', newCount: 0, duplicateCount: 0, errorMessage: ORDER_SAVE_FAILED_MESSAGE };
  return {
    status: 'COMPLETED',
    newCount: result.inserted,
    duplicateCount: orders.length - result.inserted,
    errorMessage: null,
  };
};
