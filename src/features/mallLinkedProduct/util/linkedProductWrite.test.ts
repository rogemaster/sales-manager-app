import { describe, it, expect } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import {
  buildBulkUpdate,
  buildHistoryEntry,
  buildNewLinkedRow,
  buildResendUpdate,
  buildSnapshotUpdate,
  isBulkSettingMismatch,
  resolveSendAction,
  tallySendResults,
} from './linkedProductWrite';

const ACTOR = { ownerId: 'usr_001', email: 'a@b.c' };
const NOW = new Date('2026-09-24T00:00:00.000Z');

const makeSetting = () =>
  ({
    id: 'ss_003',
    ownerId: 'usr_001',
    mallAccountId: 'sa_002',
    mallCode: 'NSST',
    mallId: 'naver_store_002',
    nickname: '네이버 기본 설정',
    isActive: true,
    mallSettings: { purchaseReviewExposure: true },
    createdAt: new Date('2025-05-15T00:00:00.000Z'),
    updatedAt: new Date('2025-05-16T00:00:00.000Z'),
  }) as ShoppingSetting;

const makeProduct = () => ({ productId: 'prod_1', name: '이어폰', keyWords: ['무선'] }) as Product;

describe('buildNewLinkedRow', () => {
  const outcome = { status: 'success' as const, externalProductId: '77', source: 'simulator' as const };

  it('몰·계정 3컬럼은 조회된 설정에서 가져온다', () => {
    const row = buildNewLinkedRow({
      id: 'mlp_1',
      actor: ACTOR,
      product: makeProduct(),
      setting: makeSetting(),
      outcome,
      now: NOW,
    });
    expect(row).toMatchObject({ mallCode: 'NSST', mallAccountId: 'sa_002', mallId: 'naver_store_002' });
    expect(row).toMatchObject({ sourceProductId: 'prod_1', sourceShoppingSettingId: 'ss_003', ownerId: 'usr_001' });
  });

  it('상품 스냅샷은 깊은 복사다 — 원본을 고쳐도 스냅샷은 그대로', () => {
    const product = makeProduct();
    const row = buildNewLinkedRow({ id: 'mlp_1', actor: ACTOR, product, setting: makeSetting(), outcome, now: NOW });
    product.keyWords!.push('변경');
    expect(row.productSnapshot.keyWords).toEqual(['무선']);
  });

  it('설정 스냅샷에는 식별 필드 5개가 없다', () => {
    const row = buildNewLinkedRow({
      id: 'mlp_1',
      actor: ACTOR,
      product: makeProduct(),
      setting: makeSetting(),
      outcome,
      now: NOW,
    });
    ['id', 'ownerId', 'mallCode', 'mallAccountId', 'mallId'].forEach((key) =>
      expect(key in (row.settingSnapshot as object)).toBe(false),
    );
  });

  it('생성·최종전송·수정 시각은 같은 now, 작성자는 actor', () => {
    const row = buildNewLinkedRow({
      id: 'mlp_1',
      actor: ACTOR,
      product: makeProduct(),
      setting: makeSetting(),
      outcome,
      now: NOW,
    });
    expect(row).toMatchObject({ createdAt: NOW, lastSentAt: NOW, updatedAt: NOW, createdByEmail: 'a@b.c' });
  });

  it('실패 결과는 코드 없이 사유를 남긴다', () => {
    const row = buildNewLinkedRow({
      id: 'mlp_1',
      actor: ACTOR,
      product: makeProduct(),
      setting: makeSetting(),
      outcome: { status: 'failed', errorMessage: '중복', source: 'random' },
      now: NOW,
    });
    expect(row).toMatchObject({ status: 'failed', externalProductId: null, errorMessage: '중복' });
  });
});

describe('resolveSendAction', () => {
  it('외부몰 상품번호가 있으면 update, 없으면 register', () => {
    expect(resolveSendAction('77')).toBe('update');
    expect(resolveSendAction(undefined)).toBe('register');
  });
});

describe('buildResendUpdate', () => {
  it('재전송이 실패해도 기존 externalProductId를 지우지 않는다', () => {
    const update = buildResendUpdate('77', { status: 'failed', errorMessage: '거절', source: 'simulator' }, NOW);
    expect(update).toEqual({ status: 'failed', externalProductId: '77', errorMessage: '거절', lastSentAt: NOW });
  });

  it('성공하면 새 코드를 쓰고 errorMessage를 비운다', () => {
    const update = buildResendUpdate(undefined, { status: 'success', externalProductId: '88', source: 'random' }, NOW);
    expect(update).toEqual({ status: 'success', externalProductId: '88', errorMessage: null, lastSentAt: NOW });
  });

  it('성공 응답에 코드가 없으면 기존 코드를 유지한다', () => {
    expect(buildResendUpdate('77', { status: 'success', source: 'simulator' }, NOW).externalProductId).toBe('77');
  });

  it('스냅샷·updatedAt·식별 컬럼은 건드리지 않는다 — 재전송은 값을 고치는 행위가 아니다', () => {
    const update = buildResendUpdate('77', { status: 'success', source: 'simulator' }, NOW);
    expect(Object.keys(update).sort()).toEqual(['errorMessage', 'externalProductId', 'lastSentAt', 'status']);
  });
});

describe('buildHistoryEntry', () => {
  it('회차 결과를 그대로 남긴다', () => {
    const entry = buildHistoryEntry({
      linkedProductId: 'mlp_1',
      actor: ACTOR,
      action: 'update',
      outcome: { status: 'failed', externalProductId: '77', errorMessage: '거절', source: 'simulator' },
      now: NOW,
    });
    expect(entry).toEqual({
      linkedProductId: 'mlp_1',
      ownerId: 'usr_001',
      action: 'update',
      status: 'failed',
      externalProductId: '77',
      errorMessage: '거절',
      source: 'simulator',
      sentByEmail: 'a@b.c',
      sentAt: NOW,
    });
  });
});

describe('tallySendResults', () => {
  it('건너뛴 건(null)은 빼고, 예외는 실패로 센다', () => {
    const results: PromiseSettledResult<boolean | null>[] = [
      { status: 'fulfilled', value: true },
      { status: 'fulfilled', value: false },
      { status: 'fulfilled', value: null },
      { status: 'rejected', reason: new Error('x') },
    ];
    expect(tallySendResults(results)).toEqual({ totalCount: 3, successCount: 1, failCount: 2 });
  });
});

// 연동 건에서 수정으로 바뀌면 안 되는 컬럼. 저장 SET에 이 키가 나타나면 규칙 위반이다.
const IMMUTABLE_OR_SEND_KEYS = ['mallCode', 'mallAccountId', 'mallId', 'status', 'lastSentAt', 'externalProductId'];

describe('buildSnapshotUpdate', () => {
  it('SET은 스냅샷 2개 + 수정자 + 수정시각뿐이다 — 불변 3컬럼과 전송 필드가 없다', () => {
    const update = buildSnapshotUpdate(
      { productSnapshot: makeProduct(), settingSnapshot: makeSetting() },
      'e@f.g',
      NOW,
    );
    expect(Object.keys(update).sort()).toEqual(['productSnapshot', 'settingSnapshot', 'updatedAt', 'updatedByEmail']);
    IMMUTABLE_OR_SEND_KEYS.forEach((key) => expect(key in update).toBe(false));
  });

  it('클라이언트가 다른 계정 설정을 보내도 설정 스냅샷에 식별 필드가 남지 않는다', () => {
    const other = { ...makeSetting(), mallAccountId: 'sa_999', mallId: 'other' } as ShoppingSetting;
    const update = buildSnapshotUpdate({ productSnapshot: makeProduct(), settingSnapshot: other }, 'e@f.g', NOW);
    ['id', 'ownerId', 'mallCode', 'mallAccountId', 'mallId'].forEach((key) =>
      expect(key in (update.settingSnapshot as object)).toBe(false),
    );
  });

  it('상품 스냅샷은 요청 본문과 공유되지 않는다', () => {
    const product = makeProduct();
    const update = buildSnapshotUpdate({ productSnapshot: product, settingSnapshot: makeSetting() }, 'e@f.g', NOW);
    product.keyWords!.push('변경');
    expect(update.productSnapshot.keyWords).toEqual(['무선']);
  });
});

describe('isBulkSettingMismatch', () => {
  const row = { mallCode: 'NSST', mallAccountId: 'sa_002', mallId: 'naver_store_002' };

  it('설정을 찾지 못하면(남의 것·없는 것) 불일치', () => {
    expect(isBulkSettingMismatch(row, undefined)).toBe(true);
  });

  it('몰·계정 3컬럼이 모두 같으면 일치', () => {
    expect(isBulkSettingMismatch(row, makeSetting())).toBe(false);
  });

  it.each([
    ['mallCode', 'KAKAOS'],
    ['mallAccountId', 'sa_999'],
    ['mallId', 'other'],
  ])('%s가 다르면 불일치 — 계정이 바뀌면 다른 상품이다', (key, value) => {
    expect(isBulkSettingMismatch(row, { ...makeSetting(), [key]: value } as ShoppingSetting)).toBe(true);
  });
});

describe('buildBulkUpdate', () => {
  const row = { productSnapshot: makeProduct() };

  it('상품 값만 오면 병합 스냅샷만 넣는다', () => {
    const update = buildBulkUpdate(row, { productSnapshot: { name: '새이름' } }, 'e@f.g', NOW);
    expect(update.productSnapshot).toMatchObject({ productId: 'prod_1', name: '새이름' });
    expect('settingSnapshot' in update).toBe(false);
    expect('sourceShoppingSettingId' in update).toBe(false);
  });

  it('clearKeys만 와도 상품 스냅샷을 다시 쓴다 — 비우기도 요청이다', () => {
    const update = buildBulkUpdate(row, { clearKeys: ['keyWords'] }, 'e@f.g', NOW);
    expect(update.productSnapshot && 'keyWords' in update.productSnapshot).toBe(false);
  });

  it('설정이 오면 설정 스냅샷과 sourceShoppingSettingId를 함께 바꾼다', () => {
    const update = buildBulkUpdate(row, { setting: makeSetting() }, 'e@f.g', NOW);
    expect(update.sourceShoppingSettingId).toBe('ss_003');
    expect('productSnapshot' in update).toBe(false);
    expect('mallAccountId' in (update.settingSnapshot as object)).toBe(false);
  });

  it('어떤 경우에도 불변 3컬럼과 전송 필드를 넣지 않는다', () => {
    const update = buildBulkUpdate(
      row,
      { productSnapshot: { name: 'x' }, clearKeys: ['keyWords'], setting: makeSetting() },
      'e@f.g',
      NOW,
    );
    IMMUTABLE_OR_SEND_KEYS.forEach((key) => expect(key in update).toBe(false));
    expect(update).toMatchObject({ updatedByEmail: 'e@f.g', updatedAt: NOW });
  });
});
