/**
 * 최대 `limit`개씩 동시에 실행하고, 결과를 입력 순서대로 `PromiseSettledResult`로 돌려준다.
 * 하나가 실패해도 멈추지 않는다 — 엑셀의 행별 이미지 처리는 실패한 행만 따로 보여줘야 하기 때문이다.
 * 진행률은 시작 시 (0, total)을 한 번 알린다. 첫 작업이 끝나기 전에도 전체 개수를 보여주기 위해서다.
 */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<PromiseSettledResult<R>[]> => {
  const total = items.length;
  const results: PromiseSettledResult<R>[] = new Array(total);
  if (total === 0) return results;

  let nextIndex = 0;
  let done = 0;
  onProgress?.(0, total);

  const worker = async () => {
    while (nextIndex < total) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: 'fulfilled', value: await fn(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
      done += 1;
      onProgress?.(done, total);
    }
  };

  const workerCount = Math.min(Math.max(limit, 1), total);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
};
