import 'server-only';
import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';
import { toNaverProductRequest } from '../util/naverProductRequest';
import { foldNaverError, MALL_NO_RESPONSE_MESSAGE } from '../util/foldNaverError';
import { judgeRandomSend, MallSendOutcome } from '../util/randomMallSend';
import { hasPriorSuccess } from './linkedProductStore';
import { MALL_ACCOUNT_MISSING_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';

const SIMULATOR_TIMEOUT_MS = 10_000;

export interface SendTarget {
  ownerId: string;
  mallCode: ShoppingMalls;
  product: Product;
  setting: ShoppingSetting;
  /** 있으면 기존 외부몰 상품의 수정, 없으면 신규 등록 */
  externalProductId?: string;
  /** 계정의 API Key. 계정이 사라졌으면 undefined */
  apiKey?: string;
  /** 재전송일 때 자기 자신 — 중복 판정에서 뺀다 */
  linkedProductId?: string;
}

const sendToNaver = async (target: SendTarget): Promise<MallSendOutcome> => {
  const { externalProductId, apiKey } = target;
  const failed = (errorMessage: string): MallSendOutcome => ({
    status: 'failed',
    externalProductId,
    errorMessage,
    source: 'simulator',
  });

  if (!apiKey) return failed(MALL_ACCOUNT_MISSING_MESSAGE);

  // 시뮬레이터는 HTTP로만 부른다. src/simulators를 import하면 네트워크 경계가 사라진다(import-ban-as-network-boundary).
  const base = `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/naver/products`;
  const url = externalProductId ? `${base}/${externalProductId}` : base;

  try {
    const response = await fetch(url, {
      method: externalProductId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(toNaverProductRequest(target.product, target.setting)),
      signal: AbortSignal.timeout(SIMULATOR_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) return failed(foldNaverError(response.status, body));

    const productNo = (body as { originProductNo?: unknown } | null)?.originProductNo;
    // 등록 응답의 번호는 number다. 수정 응답도 같은 번호를 돌려주지만, 없으면 기존 코드를 유지한다.
    return {
      status: 'success',
      externalProductId: productNo === undefined || productNo === null ? externalProductId : String(productNo),
      source: 'simulator',
    };
  } catch (error) {
    // 시뮬레이터가 꺼져 있거나 타임아웃이면 fetch가 throw한다.
    console.error('네이버 시뮬레이터 전송 실패:', error);
    return failed(MALL_NO_RESPONSE_MESSAGE);
  }
};

/** 몰별 전송 분기. 네이버는 시뮬레이터로 실제 전송하고, 나머지 몰은 랜덤 판정을 유지한다(스펙 D4). */
export const sendToMall = async (target: SendTarget): Promise<MallSendOutcome> => {
  if (target.mallCode === 'NSST') return sendToNaver(target);

  // 수정(코드 있음)은 중복 판정을 하지 않으므로 조회도 하지 않는다.
  const prior = target.externalProductId
    ? false
    : await hasPriorSuccess(target.ownerId, target.product.productId, target.mallCode, target.linkedProductId);
  return judgeRandomSend({
    mallCode: target.mallCode,
    externalProductId: target.externalProductId,
    hasPriorSuccess: prior,
  });
};
