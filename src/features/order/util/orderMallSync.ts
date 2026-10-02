import { z } from 'zod';
import { RANDOM_MALL_FAILURE_RATE } from '@/features/mallLinkedProduct/util/randomMallSend';
import { MALL_ACCOUNT_MISSING_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';
import { MallSyncAction } from '../types/order.types';

/**
 * 발주확인·송장전송의 몰 연동 판정. DB·HTTP는 server/orderMallSync.ts가 하고, 여기는 호출을 주입받는 순수 로직이다.
 * 계정 없는 주문(시드·엑셀 — API 없는 몰)은 몰을 부르지 않고 성공이다(스펙 결정 3).
 */

export const MALL_SYNC_ACTION_LABEL: Record<MallSyncAction, string> = { CONFIRM: '발주확인', INVOICE: '송장전송' };

/** 목록 일괄 결과·상세 저장 거절·수정이력이 같은 문구를 쓴다. */
export const formatMallSyncFailure = (action: MallSyncAction, message: string): string =>
  `${MALL_SYNC_ACTION_LABEL[action]} 실패: ${message}`;

/** 상세 저장에서 몰이 발주확인을 거절하면 이번 수정은 저장하지 않는다 — 무엇이 저장됐는지 헷갈리지 않게(스펙 §4②). */
export const formatDetailConfirmRejection = (message: string): string =>
  `${formatMallSyncFailure('CONFIRM', message)}. 변경 내용은 저장되지 않았습니다.`;

export interface MallSyncTarget {
  orderNumber: string;
  shoppingAccountId: string | null;
  /** 네이버 상품주문번호(productOrderId) — 수집이 이 번호로 저장했다 */
  shopOrderNumber: string;
  deliveryCompany: string | null;
  invoiceNumber: string | null;
}

/** viaMall=false: 계정 없는 주문이라 몰을 부르지 않았다 — 이력에 mall_action을 남기지 않는다. */
export type MallSyncOutcome =
  | { orderNumber: string; ok: true; viaMall: boolean }
  | { orderNumber: string; ok: false; message: string };

export interface SyncAccount {
  id: string;
  mallCode: string;
  apiKey: string;
}

export const NAVER_SYNC_CHUNK_SIZE = 50;
export const MALL_SYNC_NO_RESULT_MESSAGE = '쇼핑몰 응답을 해석할 수 없습니다.';
export const MALL_SYNC_RANDOM_FAILED_MESSAGE = '쇼핑몰이 요청을 처리하지 못했습니다.';

/** 시뮬레이터 건별 실패 코드(라운드 2 계약) → 화면 문구. 모르는 코드는 응답의 message를 그대로 쓴다. */
export const NAVER_SYNC_FAIL_MESSAGES: Record<string, string> = {
  NOT_CONFIRMED: '쇼핑몰에서 발주확인되지 않은 주문입니다. 발주확인 일괄변경으로 쇼핑몰에 다시 보낼 수 있습니다.',
  NOT_FOUND: '쇼핑몰에서 주문을 찾을 수 없습니다.',
  INVALID_STATUS: '쇼핑몰의 주문 상태에서 처리할 수 없습니다.',
  INVALID_INPUT: '택배사 또는 송장번호를 쇼핑몰이 받지 않았습니다.',
};

/** 발주확인·발송처리 공통 응답. HTTP로 받은 외부 데이터라 모양부터 검증한다(시뮬레이터 타입 import 금지). */
export const naverSyncResultSchema = z.object({
  successProductOrderIds: z.array(z.string()),
  failProductOrderInfos: z.array(z.object({ productOrderId: z.string(), code: z.string(), message: z.string() })),
});

export type NaverSyncResult = z.infer<typeof naverSyncResultSchema>;
export type NaverSyncCall = { ok: true; result: NaverSyncResult } | { ok: false; message: string };

export const splitByAccount = (
  targets: MallSyncTarget[],
): { local: MallSyncOutcome[]; byAccount: Map<string, MallSyncTarget[]> } => {
  const local: MallSyncOutcome[] = [];
  const byAccount = new Map<string, MallSyncTarget[]>();
  for (const target of targets) {
    if (target.shoppingAccountId === null) {
      local.push({ orderNumber: target.orderNumber, ok: true, viaMall: false });
      continue;
    }
    const group = byAccount.get(target.shoppingAccountId) ?? [];
    group.push(target);
    byAccount.set(target.shoppingAccountId, group);
  }
  return { local, byAccount };
};

export const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

export const failAll = (targets: MallSyncTarget[], message: string): MallSyncOutcome[] =>
  targets.map(({ orderNumber }) => ({ orderNumber, ok: false, message }));

/** 요청한 번호가 성공·실패 어디에도 없으면 그 건만 실패 — 성공으로 추정하면 몰에 없는 송장전송완료가 생긴다. */
export const toOutcomesFromNaver = (targets: MallSyncTarget[], result: NaverSyncResult): MallSyncOutcome[] => {
  const succeeded = new Set(result.successProductOrderIds);
  const failed = new Map(result.failProductOrderInfos.map((info) => [info.productOrderId, info]));
  return targets.map(({ orderNumber, shopOrderNumber }): MallSyncOutcome => {
    if (succeeded.has(shopOrderNumber)) return { orderNumber, ok: true, viaMall: true };
    const info = failed.get(shopOrderNumber);
    if (info) return { orderNumber, ok: false, message: NAVER_SYNC_FAIL_MESSAGES[info.code] ?? info.message };
    return { orderNumber, ok: false, message: MALL_SYNC_NO_RESULT_MESSAGE };
  });
};

/** 시뮬레이터가 없는 몰(네이버 외)의 흉내낸 판정. 연동상품 전송과 같은 실패율. */
export const judgeRandomOrderSync = (targets: MallSyncTarget[], random: () => number): MallSyncOutcome[] =>
  targets.map(
    ({ orderNumber }): MallSyncOutcome =>
      random() < RANDOM_MALL_FAILURE_RATE
        ? { orderNumber, ok: false, message: MALL_SYNC_RANDOM_FAILED_MESSAGE }
        : { orderNumber, ok: true, viaMall: true },
  );

/**
 * 계정 1개의 주문들을 몰로 보낸다. account가 undefined면 shopping_account_id는 있는데 계정이 사라진 것 —
 * API로 들어온 주문을 몰에 알리지 않고 완료시키지 않도록 실패다.
 */
export const syncAccountTargets = async (input: {
  account: SyncAccount | undefined;
  targets: MallSyncTarget[];
  callNaver: (apiKey: string, chunk: MallSyncTarget[]) => Promise<NaverSyncCall>;
  random: () => number;
}): Promise<MallSyncOutcome[]> => {
  const { account, targets, callNaver, random } = input;
  if (!account) return failAll(targets, MALL_ACCOUNT_MISSING_MESSAGE);
  if (account.mallCode !== 'NSST') return judgeRandomOrderSync(targets, random);
  if (!account.apiKey) return failAll(targets, MALL_ACCOUNT_MISSING_MESSAGE);

  const outcomes: MallSyncOutcome[] = [];
  for (const part of chunk(targets, NAVER_SYNC_CHUNK_SIZE)) {
    const called = await callNaver(account.apiKey, part);
    outcomes.push(...(called.ok ? toOutcomesFromNaver(part, called.result) : failAll(part, called.message)));
  }
  return outcomes;
};
