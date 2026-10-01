import { describe, expect, it } from 'vitest';
import {
  COLLECTION_ACCOUNT_LIMIT_MESSAGE,
  COLLECTION_PERIOD_TOO_LONG_MESSAGE,
  collectionListRequestSchema,
  findCollectionPeriodProblem,
  INVALID_COLLECTION_PERIOD_MESSAGE,
  runCollectionRequestSchema,
} from './collectionRequest';

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : result.error?.issues[0]?.message;

describe('findCollectionPeriodProblem', () => {
  it('31일은 통과, 32일은 거절 — 30일 버튼은 오늘 포함 31일이다', () => {
    expect(findCollectionPeriodProblem('2026-09-01', '2026-10-01')).toBeNull();
    expect(findCollectionPeriodProblem('2026-09-01', '2026-10-02')).toBe(COLLECTION_PERIOD_TOO_LONG_MESSAGE);
  });

  it('같은 날은 통과한다', () => {
    expect(findCollectionPeriodProblem('2026-10-01', '2026-10-01')).toBeNull();
  });

  it('형식이 틀리거나 시작이 종료보다 늦으면 거절한다', () => {
    expect(findCollectionPeriodProblem('2026-10-02', '2026-10-01')).toBe(INVALID_COLLECTION_PERIOD_MESSAGE);
    expect(findCollectionPeriodProblem('2026-02-31', '2026-03-01')).toBe(INVALID_COLLECTION_PERIOD_MESSAGE);
    expect(findCollectionPeriodProblem('20261001', '2026-10-01')).toBe(INVALID_COLLECTION_PERIOD_MESSAGE);
  });
});

describe('runCollectionRequestSchema', () => {
  const body = (overrides: Record<string, unknown> = {}) => ({
    accountIds: ['sa_1'],
    startDate: '2026-09-24',
    endDate: '2026-10-01',
    ...overrides,
  });

  it('통과하면 그대로 돌려준다', () => {
    expect(runCollectionRequestSchema.parse(body())).toEqual(body());
  });

  it('중복 ID는 한 번만', () => {
    expect(runCollectionRequestSchema.parse(body({ accountIds: ['sa_1', 'sa_2', 'sa_1'] })).accountIds).toEqual([
      'sa_1',
      'sa_2',
    ]);
  });

  it('계정이 없거나 0건이면 거절한다', () => {
    expect(runCollectionRequestSchema.safeParse(body({ accountIds: undefined })).success).toBe(false);
    expect(runCollectionRequestSchema.safeParse(body({ accountIds: [] })).success).toBe(false);
    expect(runCollectionRequestSchema.safeParse(body({ accountIds: 'sa_1' })).success).toBe(false);
  });

  it('11개 계정은 거절한다', () => {
    const accountIds = Array.from({ length: 11 }, (_, i) => `sa_${i}`);
    expect(firstMessage(runCollectionRequestSchema.safeParse(body({ accountIds })))).toBe(
      COLLECTION_ACCOUNT_LIMIT_MESSAGE,
    );
  });

  it('기간 규칙을 같이 검사한다', () => {
    expect(firstMessage(runCollectionRequestSchema.safeParse(body({ startDate: '2026-08-01' })))).toBe(
      COLLECTION_PERIOD_TOO_LONG_MESSAGE,
    );
    expect(firstMessage(runCollectionRequestSchema.safeParse(body({ endDate: 'x' })))).toBe(
      INVALID_COLLECTION_PERIOD_MESSAGE,
    );
  });
});

describe('collectionListRequestSchema', () => {
  const filters = (overrides: Record<string, unknown> = {}) => ({
    filters: { mallCode: 'ALL', mallId: 'ALL', searchType: 'collectedBy', searchValue: '', ...overrides },
  });

  it('목록 밖 몰 코드는 거절한다', () => {
    expect(collectionListRequestSchema.safeParse(filters()).success).toBe(true);
    expect(collectionListRequestSchema.safeParse(filters({ mallCode: 'NOPE' })).success).toBe(false);
  });

  it('검색 유형은 수집자만 받는다', () => {
    expect(collectionListRequestSchema.safeParse(filters({ searchValue: '김민준' })).success).toBe(true);
    expect(collectionListRequestSchema.safeParse(filters({ searchType: 'orderName' })).success).toBe(false);
    expect(collectionListRequestSchema.safeParse(filters({ searchType: undefined })).success).toBe(false);
  });

  it('검색어는 문자열이고 100자를 넘으면 거절한다', () => {
    expect(collectionListRequestSchema.safeParse(filters({ searchValue: 'a'.repeat(100) })).success).toBe(true);
    expect(collectionListRequestSchema.safeParse(filters({ searchValue: 'a'.repeat(101) })).success).toBe(false);
    expect(collectionListRequestSchema.safeParse(filters({ searchValue: 1 })).success).toBe(false);
  });
});
