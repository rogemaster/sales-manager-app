import { describe, expect, it } from 'vitest';
import { CollectionAccountResult } from '../types/collection.types';
import { buildCollectionResultAlert } from './collectionResultAlert';

const ok = (accountId: string, newCount: number, duplicateCount = 0): CollectionAccountResult => ({
  accountId,
  status: 'COMPLETED',
  newCount,
  duplicateCount,
  errorMessage: null,
});
const fail = (accountId: string, errorMessage: string, newCount = 0): CollectionAccountResult => ({
  accountId,
  status: 'FAILED',
  newCount,
  duplicateCount: 0,
  errorMessage,
});

describe('buildCollectionResultAlert', () => {
  it('전부 성공이면 success와 합계', () => {
    expect(buildCollectionResultAlert([ok('a', 3, 1), ok('b', 2)])).toEqual({
      type: 'success',
      message: '2개 계정 수집 완료 — 신규 5건, 중복 1건',
    });
  });

  it('일부 실패면 warning, 첫 사유와 나머지 건수 — 실패 계정이 넣은 건수도 합계에 든다', () => {
    expect(buildCollectionResultAlert([ok('a', 3), fail('b', '응답 없음', 2), fail('c', '한도 초과')])).toEqual({
      type: 'warning',
      message: '1개 계정 수집 완료 — 신규 5건, 중복 0건. 응답 없음 (외 1건 오류)',
    });
  });

  it('전부 실패면 error', () => {
    expect(buildCollectionResultAlert([fail('a', '응답 없음')])).toEqual({ type: 'error', message: '응답 없음' });
  });
});
