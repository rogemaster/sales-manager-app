import { describe, expect, it } from 'vitest';
import {
  collectPagedOrders,
  COLLECTION_PAGE_LIMIT_MESSAGE,
  insertGeneratedOrders,
  ORDER_SAVE_FAILED_MESSAGE,
  PageFetch,
} from './collectAccountOrders';
import type { NaverProductOrder, OrderInsert, TranslateResult } from './naverOrderTranslate';

const naver = (id: string) => ({ productOrderId: id }) as NaverProductOrder;
const page = (ids: string[], nextCursor: string | null): PageFetch => ({
  ok: true,
  page: { productOrders: ids.map(naver), nextCursor },
});
const translateOk = (order: NaverProductOrder): TranslateResult => ({
  ok: true,
  order: { shopOrderNumber: order.productOrderId } as OrderInsert,
});

/** 받은 주문 중 이미 있는 번호를 뺀 수를 돌려주는 가짜 삽입 */
const fakeInsert = (existing: string[] = []) => {
  const saved = new Set(existing);
  const calls: string[][] = [];
  const insertOrders = async (orders: OrderInsert[]) => {
    calls.push(orders.map((o) => o.shopOrderNumber));
    let inserted = 0;
    for (const o of orders) {
      if (!saved.has(o.shopOrderNumber)) {
        saved.add(o.shopOrderNumber);
        inserted += 1;
      }
    }
    return inserted;
  };
  return { insertOrders, calls };
};

describe('collectPagedOrders', () => {
  it('커서가 null이 될 때까지 따라가고 신규·중복을 센다', async () => {
    const cursors: (string | null)[] = [];
    const pages = [page(['A', 'B'], 'c1'), page(['C'], null)];
    const { insertOrders } = fakeInsert(['B']);
    const outcome = await collectPagedOrders({
      fetchPage: async (cursor) => {
        cursors.push(cursor);
        return pages.shift()!;
      },
      translate: translateOk,
      insertOrders,
    });
    expect(cursors).toEqual([null, 'c1']);
    expect(outcome).toEqual({ status: 'COMPLETED', newCount: 2, duplicateCount: 1, errorMessage: null });
  });

  it('최대 페이지에서 멈추고 실패로 남긴다 — 읽은 만큼은 저장한다', async () => {
    const { insertOrders, calls } = fakeInsert();
    let n = 0;
    const outcome = await collectPagedOrders({
      fetchPage: async () => page([`P${++n}`], `c${n}`),
      translate: translateOk,
      insertOrders,
      maxPages: 3,
    });
    expect(calls).toHaveLength(3);
    expect(outcome).toEqual({
      status: 'FAILED',
      newCount: 3,
      duplicateCount: 0,
      errorMessage: COLLECTION_PAGE_LIMIT_MESSAGE,
    });
  });

  it('도중에 조회가 실패하면 앞 페이지 집계를 유지한 채 실패', async () => {
    const pages: PageFetch[] = [page(['A'], 'c1'), { ok: false, message: '외부 쇼핑몰 응답 없음' }];
    const outcome = await collectPagedOrders({
      fetchPage: async () => pages.shift()!,
      translate: translateOk,
      insertOrders: fakeInsert().insertOrders,
    });
    expect(outcome).toEqual({
      status: 'FAILED',
      newCount: 1,
      duplicateCount: 0,
      errorMessage: '외부 쇼핑몰 응답 없음',
    });
  });

  it('번역 실패 페이지 앞까지의 집계를 유지한다 — 그 페이지는 넣지 않는다', async () => {
    const pages = [page(['A'], 'c1'), page(['B', 'X'], null)];
    const { insertOrders, calls } = fakeInsert();
    const outcome = await collectPagedOrders({
      fetchPage: async () => pages.shift()!,
      translate: (order) =>
        order.productOrderId === 'X' ? { ok: false, message: '알 수 없는 주문 상태입니다.' } : translateOk(order),
      insertOrders,
    });
    expect(calls).toEqual([['A']]);
    expect(outcome).toEqual({
      status: 'FAILED',
      newCount: 1,
      duplicateCount: 0,
      errorMessage: '알 수 없는 주문 상태입니다.',
    });
  });

  it('삽입이 예외를 던지면 그 계정만 실패', async () => {
    const outcome = await collectPagedOrders({
      fetchPage: async () => page(['A'], null),
      translate: translateOk,
      insertOrders: async () => {
        throw new Error('db down');
      },
    });
    expect(outcome).toEqual({
      status: 'FAILED',
      newCount: 0,
      duplicateCount: 0,
      errorMessage: ORDER_SAVE_FAILED_MESSAGE,
    });
  });

  it('빈 페이지는 삽입을 부르지 않는다', async () => {
    const { insertOrders, calls } = fakeInsert();
    const outcome = await collectPagedOrders({
      fetchPage: async () => page([], null),
      translate: translateOk,
      insertOrders,
    });
    expect(calls).toEqual([]);
    expect(outcome.status).toBe('COMPLETED');
  });
});

describe('insertGeneratedOrders', () => {
  it('만든 주문을 넣고 신규·중복을 센다', async () => {
    const orders = [{ shopOrderNumber: 'A' }, { shopOrderNumber: 'B' }] as OrderInsert[];
    expect(await insertGeneratedOrders(orders, fakeInsert(['B']).insertOrders)).toEqual({
      status: 'COMPLETED',
      newCount: 1,
      duplicateCount: 1,
      errorMessage: null,
    });
  });

  it('0건이면 삽입 없이 완료', async () => {
    const { insertOrders, calls } = fakeInsert();
    expect(await insertGeneratedOrders([], insertOrders)).toEqual({
      status: 'COMPLETED',
      newCount: 0,
      duplicateCount: 0,
      errorMessage: null,
    });
    expect(calls).toEqual([]);
  });

  it('삽입이 예외를 던지면 실패', async () => {
    const outcome = await insertGeneratedOrders([{ shopOrderNumber: 'A' }] as OrderInsert[], async () => {
      throw new Error('db down');
    });
    expect(outcome.status).toBe('FAILED');
  });
});
