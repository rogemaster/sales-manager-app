import { describe, expect, it } from 'vitest';
import { pendingCollectionAccountIds } from './collectionPending';

const body = (accountIds: string[]) => ({ accountIds, startDate: '2026-09-24', endDate: '2026-10-01' });

describe('pendingCollectionAccountIds', () => {
  it('진행 중인 수집 요청들의 계정 ID를 모은다 — 화면을 다시 열어도 mutation 캐시에서 다시 얻는다', () => {
    expect(pendingCollectionAccountIds([body(['sa_1', 'sa_2']), body(['sa_3'])])).toEqual(['sa_1', 'sa_2', 'sa_3']);
  });

  it('겹치는 ID는 한 번만, 변수가 없는 항목은 건너뛴다', () => {
    expect(pendingCollectionAccountIds([body(['sa_1']), undefined, body(['sa_1', 'sa_2'])])).toEqual(['sa_1', 'sa_2']);
  });

  it('진행 중인 요청이 없으면 빈 배열', () => {
    expect(pendingCollectionAccountIds([])).toEqual([]);
  });
});
