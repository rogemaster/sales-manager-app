import { describe, expect, it } from 'vitest';
import { toHomeStats, toLinkedProductStats } from './homeStats';

describe('toHomeStats', () => {
  it('상태별 건수를 각 칸에 담고 total은 합계다', () => {
    expect(
      toHomeStats([
        { state: 'ON_SALE', count: 3 },
        { state: 'SOLD_OUT', count: 2 },
        { state: 'SALE_DIS', count: 1 },
        { state: 'WAIT_SALE', count: 4 },
      ]),
    ).toEqual({ total: 10, onSale: 3, soldOut: 2, saleDis: 1, waitSale: 4 });
  });

  it('GROUP BY에 없는 상태는 0이다', () => {
    expect(toHomeStats([{ state: 'ON_SALE', count: 5 }])).toEqual({
      total: 5,
      onSale: 5,
      soldOut: 0,
      saleDis: 0,
      waitSale: 0,
    });
  });

  it('상품이 없으면 전부 0이다', () => {
    expect(toHomeStats([])).toEqual({ total: 0, onSale: 0, soldOut: 0, saleDis: 0, waitSale: 0 });
  });

  it('알 수 없는 상태는 칸에 담지 않지만 total에는 센다', () => {
    // total은 "등록된 상품 수"다
    expect(
      toHomeStats([
        { state: 'ON_SALE', count: 1 },
        { state: '판매중', count: 2 },
      ]),
    ).toEqual({ total: 3, onSale: 1, soldOut: 0, saleDis: 0, waitSale: 0 });
  });

  it('프로토타입 속성 이름의 상태도 칸에 담지 않는다', () => {
    expect(toHomeStats([{ state: 'constructor', count: 1 }])).toEqual({
      total: 1,
      onSale: 0,
      soldOut: 0,
      saleDis: 0,
      waitSale: 0,
    });
  });
});

describe('toLinkedProductStats', () => {
  it('성공·실패 건수를 담고 total은 합계다', () => {
    expect(
      toLinkedProductStats([
        { status: 'success', count: 4 },
        { status: 'failed', count: 2 },
      ]),
    ).toEqual({ total: 6, success: 4, failed: 2 });
  });

  it('한쪽만 있으면 나머지는 0이다', () => {
    expect(toLinkedProductStats([{ status: 'failed', count: 3 }])).toEqual({ total: 3, success: 0, failed: 3 });
  });

  it('연동 건이 없으면 전부 0이다', () => {
    expect(toLinkedProductStats([])).toEqual({ total: 0, success: 0, failed: 0 });
  });

  it('알 수 없는 status는 칸에 담지 않지만 total에는 센다', () => {
    expect(
      toLinkedProductStats([
        { status: 'success', count: 1 },
        { status: 'pending', count: 2 },
        { status: 'constructor', count: 1 },
      ]),
    ).toEqual({ total: 4, success: 1, failed: 0 });
  });
});
