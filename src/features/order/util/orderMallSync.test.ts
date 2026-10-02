import { describe, expect, it, vi } from 'vitest';
import { MALL_ACCOUNT_MISSING_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';
import {
  chunk,
  formatDetailConfirmRejection,
  formatMallSyncFailure,
  judgeRandomOrderSync,
  MALL_SYNC_NO_RESULT_MESSAGE,
  MALL_SYNC_RANDOM_FAILED_MESSAGE,
  MallSyncTarget,
  NAVER_SYNC_FAIL_MESSAGES,
  naverSyncResultSchema,
  splitByAccount,
  syncAccountTargets,
  toOutcomesFromNaver,
} from './orderMallSync';

const target = (
  orderNumber: string,
  shoppingAccountId: string | null,
  shopOrderNumber = `shop_${orderNumber}`,
): MallSyncTarget => ({
  orderNumber,
  shoppingAccountId,
  shopOrderNumber,
  deliveryCompany: 'CJ',
  invoiceNumber: '1234',
});

describe('formatMallSyncFailure', () => {
  it('동작 이름을 앞에 붙인다', () => {
    expect(formatMallSyncFailure('CONFIRM', '사유')).toBe('발주확인 실패: 사유');
    expect(formatMallSyncFailure('INVOICE', '사유')).toBe('송장전송 실패: 사유');
  });
});

describe('splitByAccount', () => {
  it('계정 없는 주문은 몰 호출 없는 성공, 나머지는 계정별로 묶는다', () => {
    const { local, byAccount } = splitByAccount([
      target('a', null),
      target('b', 'acc1'),
      target('c', 'acc1'),
      target('d', 'acc2'),
    ]);
    expect(local).toEqual([{ orderNumber: 'a', ok: true, viaMall: false }]);
    expect([...byAccount.keys()]).toEqual(['acc1', 'acc2']);
    expect(byAccount.get('acc1')!.map((t) => t.orderNumber)).toEqual(['b', 'c']);
  });
});

describe('chunk', () => {
  it('크기대로 나눈다', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 50)).toEqual([]);
  });
});

describe('naverSyncResultSchema', () => {
  it('정상 응답은 통과, 모양이 틀리면 거절', () => {
    expect(naverSyncResultSchema.safeParse({ successProductOrderIds: ['1'], failProductOrderInfos: [] }).success).toBe(
      true,
    );
    expect(naverSyncResultSchema.safeParse({ successProductOrderIds: '1' }).success).toBe(false);
  });
});

describe('toOutcomesFromNaver', () => {
  it('성공·실패 코드를 주문번호로 되돌리고, 응답에 없는 번호는 실패로 둔다', () => {
    const outcomes = toOutcomesFromNaver(
      [target('a', 'acc'), target('b', 'acc'), target('c', 'acc'), target('d', 'acc')],
      {
        successProductOrderIds: ['shop_a'],
        failProductOrderInfos: [
          { productOrderId: 'shop_b', code: 'NOT_CONFIRMED', message: 'raw' },
          { productOrderId: 'shop_c', code: 'UNKNOWN_CODE', message: '몰 원문' },
        ],
      },
    );
    expect(outcomes).toEqual([
      { orderNumber: 'a', ok: true, viaMall: true },
      { orderNumber: 'b', ok: false, message: NAVER_SYNC_FAIL_MESSAGES.NOT_CONFIRMED },
      { orderNumber: 'c', ok: false, message: '몰 원문' },
      { orderNumber: 'd', ok: false, message: MALL_SYNC_NO_RESULT_MESSAGE },
    ]);
  });
});

describe('judgeRandomOrderSync', () => {
  it('실패율 미만이면 실패, 이상이면 성공', () => {
    const values = [0.05, 0.5];
    const random = () => values.shift()!;
    expect(judgeRandomOrderSync([target('a', 'acc'), target('b', 'acc')], random)).toEqual([
      { orderNumber: 'a', ok: false, message: MALL_SYNC_RANDOM_FAILED_MESSAGE },
      { orderNumber: 'b', ok: true, viaMall: true },
    ]);
  });
});

describe('syncAccountTargets', () => {
  const okCall = async (_apiKey: string, part: MallSyncTarget[]) => ({
    ok: true as const,
    result: { successProductOrderIds: part.map((t) => t.shopOrderNumber), failProductOrderInfos: [] },
  });

  it('계정이 사라졌으면 전부 실패 — 로컬 성공으로 처리하지 않는다', async () => {
    const outcomes = await syncAccountTargets({
      account: undefined,
      targets: [target('a', 'gone')],
      callNaver: vi.fn(okCall),
      random: () => 0.9,
    });
    expect(outcomes).toEqual([{ orderNumber: 'a', ok: false, message: MALL_ACCOUNT_MISSING_MESSAGE }]);
  });

  it('네이버 계정에 API Key가 없으면 전부 실패하고 호출하지 않는다', async () => {
    const call = vi.fn(okCall);
    const outcomes = await syncAccountTargets({
      account: { id: 'acc', mallCode: 'NSST', apiKey: '' },
      targets: [target('a', 'acc')],
      callNaver: call,
      random: () => 0.9,
    });
    expect(outcomes).toEqual([{ orderNumber: 'a', ok: false, message: MALL_ACCOUNT_MISSING_MESSAGE }]);
    expect(call).not.toHaveBeenCalled();
  });

  it('네이버는 50건씩 나눠 부르고, 한 묶음의 호출 실패는 그 묶음만 실패시킨다', async () => {
    const targets = Array.from({ length: 51 }, (_, i) => target(`o${i}`, 'acc'));
    const call = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: '외부 쇼핑몰 응답 없음' })
      .mockImplementationOnce(okCall);
    const outcomes = await syncAccountTargets({
      account: { id: 'acc', mallCode: 'NSST', apiKey: 'key' },
      targets,
      callNaver: call,
      random: () => 0.9,
    });
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[0][1]).toHaveLength(50);
    expect(outcomes.slice(0, 50).every((o) => !o.ok && o.message === '외부 쇼핑몰 응답 없음')).toBe(true);
    expect(outcomes[50]).toEqual({ orderNumber: 'o50', ok: true, viaMall: true });
  });

  it('네이버 외 몰은 무작위 판정이고 호출하지 않는다', async () => {
    const call = vi.fn(okCall);
    const outcomes = await syncAccountTargets({
      account: { id: 'acc', mallCode: 'COUP', apiKey: '' },
      targets: [target('a', 'acc')],
      callNaver: call,
      random: () => 0.9,
    });
    expect(outcomes).toEqual([{ orderNumber: 'a', ok: true, viaMall: true }]);
    expect(call).not.toHaveBeenCalled();
  });
});

describe('formatDetailConfirmRejection', () => {
  it('저장하지 않았다는 안내를 붙인다', () => {
    expect(formatDetailConfirmRejection('사유')).toBe('발주확인 실패: 사유. 변경 내용은 저장되지 않았습니다.');
  });
});
