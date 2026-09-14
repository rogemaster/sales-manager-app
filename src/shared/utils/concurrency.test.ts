import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './concurrency';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('mapWithConcurrency', () => {
  it('동시에 실행되는 작업 수가 limit을 넘지 않는다', async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await wait(5);
      active -= 1;
    });

    expect(maxActive).toBe(3);
  });

  it('결과를 끝난 순서가 아니라 입력 순서대로 돌려준다', async () => {
    const results = await mapWithConcurrency([30, 10, 20], 3, async (ms) => {
      await wait(ms);
      return ms;
    });

    expect(results).toEqual([
      { status: 'fulfilled', value: 30 },
      { status: 'fulfilled', value: 10 },
      { status: 'fulfilled', value: 20 },
    ]);
  });

  it('실패한 작업이 있어도 나머지를 끝까지 실행한다', async () => {
    const called: number[] = [];

    const results = await mapWithConcurrency([1, 2, 3], 1, async (n) => {
      called.push(n);
      if (n === 1) throw new Error('boom');
      return n;
    });

    expect(called).toEqual([1, 2, 3]);
    expect(results[0].status).toBe('rejected');
    expect(results[1]).toEqual({ status: 'fulfilled', value: 2 });
  });

  it('진행률은 시작 시 0을 한 번 알리고 작업이 끝날 때마다 알린다', async () => {
    const progress: [number, number][] = [];

    await mapWithConcurrency([1, 2, 3], 2, async (n) => n, (done, total) => progress.push([done, total]));

    expect(progress[0]).toEqual([0, 3]);
    expect(progress).toHaveLength(4);
    expect(progress[progress.length - 1]).toEqual([3, 3]);
  });

  it('빈 배열이면 작업도 진행률 알림도 없다', async () => {
    const progress: number[] = [];

    const results = await mapWithConcurrency([], 4, async () => 1, (done) => progress.push(done));

    expect(results).toEqual([]);
    expect(progress).toEqual([]);
  });

  it('limit이 0 이하여도 최소 1개씩은 실행한다', async () => {
    const results = await mapWithConcurrency([1, 2], 0, async (n) => n);

    expect(results).toEqual([
      { status: 'fulfilled', value: 1 },
      { status: 'fulfilled', value: 2 },
    ]);
  });
});
