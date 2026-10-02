import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { foldNaverError, MALL_NO_RESPONSE_MESSAGE } from '@/features/mallLinkedProduct/util/foldNaverError';
import { MallSyncAction } from '../types/order.types';
import {
  failAll,
  MallSyncOutcome,
  MallSyncTarget,
  NaverSyncCall,
  naverSyncResultSchema,
  splitByAccount,
  syncAccountTargets,
} from '../util/orderMallSync';
import { NAVER_RESPONSE_SHAPE_MESSAGE } from './orderCollection';

const SIMULATOR_TIMEOUT_MS = 10_000;

/** 시뮬레이터는 HTTP로만 부른다 — src/simulators를 import하면 네트워크 경계가 사라진다. */
const callNaver = async (action: MallSyncAction, apiKey: string, part: MallSyncTarget[]): Promise<NaverSyncCall> => {
  const path = action === 'CONFIRM' ? 'confirm' : 'dispatch';
  const payload =
    action === 'CONFIRM'
      ? { productOrderIds: part.map((target) => target.shopOrderNumber) }
      : {
          // 택배사 코드는 우리 DELIVERY_COMPANY와 시뮬레이터 목록이 같은 값이다(번역 없음).
          dispatchProductOrders: part.map((target) => ({
            productOrderId: target.shopOrderNumber,
            deliveryCompanyCode: target.deliveryCompany ?? '',
            trackingNumber: target.invoiceNumber ?? '',
          })),
        };
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/external/naver/product-orders/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SIMULATOR_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) return { ok: false, message: foldNaverError(response.status, body) };
    const parsed = naverSyncResultSchema.safeParse(body);
    return parsed.success ? { ok: true, result: parsed.data } : { ok: false, message: NAVER_RESPONSE_SHAPE_MESSAGE };
  } catch (error) {
    console.error(`네이버 시뮬레이터 ${path} 호출 실패:`, error);
    return { ok: false, message: MALL_NO_RESPONSE_MESSAGE };
  }
};

/**
 * 대상 주문을 계정별로 몰에 보낸다. 계정마다 차례로(수집과 같은 이유 — 부하 예측). 한 계정의 예외는 그 계정 주문만 실패시킨다.
 * 계정은 사용 여부와 무관하게 읽는다 — 사용 안 함으로 돌려도 이미 수집한 주문의 발송은 끝내야 한다(2026-10-02 사용자 확인).
 */
export const syncOrdersToMall = async (input: {
  action: MallSyncAction;
  targets: MallSyncTarget[];
  ownerId: string;
  random?: () => number;
}): Promise<MallSyncOutcome[]> => {
  const { action, targets, ownerId, random = Math.random } = input;
  const { local, byAccount } = splitByAccount(targets);
  if (byAccount.size === 0) return local;

  const accounts = await db
    .select({ id: shoppingAccounts.id, mallCode: shoppingAccounts.mallCode, apiKey: shoppingAccounts.apiKey })
    .from(shoppingAccounts)
    .where(and(eq(shoppingAccounts.ownerId, ownerId), inArray(shoppingAccounts.id, [...byAccount.keys()])));
  const byId = new Map(accounts.map((account) => [account.id, account]));

  const outcomes = [...local];
  for (const [accountId, group] of byAccount) {
    try {
      outcomes.push(
        ...(await syncAccountTargets({
          account: byId.get(accountId),
          targets: group,
          callNaver: (apiKey, part) => callNaver(action, apiKey, part),
          random,
        })),
      );
    } catch (error) {
      console.error('주문 몰 연동 중 에러:', error);
      outcomes.push(...failAll(group, MALL_NO_RESPONSE_MESSAGE));
    }
  }
  return outcomes;
};
