import type { NaverOrderParty, NaverProductOrderDraft, NaverStoredProduct } from './types';
import { SAMPLE_ADDRESSES, SAMPLE_MEMOS, SAMPLE_NAMES } from './orderSamples';

/**
 * 시뮬레이터의 "그사이 구매자가 넣은 주문". 조회 1페이지 요청 때 orderService가 부른다.
 * now와 난수를 주입받는 순수 함수다 — 경과 시간·상한·금액 계산을 DB 없이 테스트한다.
 */
export type Random = () => number;

export const ORDER_GENERATION_INTERVAL_MINUTES = 30;
export const ORDER_GENERATION_MAX = 5;

const MINUTE_MS = 60_000;
const FIRST_WINDOW_MS = 24 * 60 * MINUTE_MS;
// 우리 공용 날짜 유틸을 import하지 않는다(시뮬레이터 경계). KST는 서머타임이 없어 고정 오프셋으로 충분하다.
const KST_OFFSET_MS = 9 * 60 * MINUTE_MS;

/** 30분마다 1건, 1회 최대 5건. 처음이면 5건. 수집을 연타해도 주문이 쏟아지지 않는다. */
export const countOrdersToGenerate = (generatedAt: Date | null, now: Date): number => {
  if (generatedAt === null) return ORDER_GENERATION_MAX;
  const elapsedMinutes = (now.getTime() - generatedAt.getTime()) / MINUTE_MS;
  const count = Math.floor(elapsedMinutes / ORDER_GENERATION_INTERVAL_MINUTES);
  return Math.max(0, Math.min(ORDER_GENERATION_MAX, count));
};

const pick = <T>(items: readonly T[], random: Random): T => items[Math.floor(random() * items.length)];

const randomInt = (min: number, max: number, random: Random): number => min + Math.floor(random() * (max - min + 1));

const randomTel = (random: Random): string =>
  `010-${String(randomInt(0, 9999, random)).padStart(4, '0')}-${String(randomInt(0, 9999, random)).padStart(4, '0')}`;

const randomParty = (random: Random): NaverOrderParty => ({ name: pick(SAMPLE_NAMES, random), tel: randomTel(random) });

export const buildOrderDraft = (
  product: NaverStoredProduct,
  windowStart: Date,
  now: Date,
  random: Random,
): NaverProductOrderDraft => {
  const { payload } = product;
  const option =
    payload.optionCombinations && payload.optionCombinations.length > 0
      ? pick(payload.optionCombinations, random)
      : null;
  const quantity = randomInt(1, 3, random);
  const unitPrice = payload.salePrice + (option?.optionPrice ?? 0);
  const { deliveryFeeType, baseFee } = payload.deliveryInfo;
  const deliveryFeeAmount = deliveryFeeType === 'FREE' ? 0 : baseFee;
  const orderer = randomParty(random);
  const receiver = random() < 0.5 ? orderer : randomParty(random);
  const address = pick(SAMPLE_ADDRESSES, random);
  const windowMs = now.getTime() - windowStart.getTime();

  return {
    productNo: product.productNo,
    paymentDate: new Date(windowStart.getTime() + Math.floor(random() * windowMs)),
    payload: {
      productName: product.name,
      optionValues: option ? { ...option.values } : null,
      quantity,
      unitPrice,
      totalPaymentAmount: unitPrice * quantity + deliveryFeeAmount,
      deliveryFeeType,
      deliveryFeeAmount,
      orderer,
      shippingAddress: { name: receiver.name, tel: receiver.tel, ...address },
      shippingMemo: pick(SAMPLE_MEMOS, random),
    },
  };
};

/** 결제일은 지난 생성 시각 ~ 지금 사이에 흩는다(처음이면 지금 − 24시간부터). */
export const buildOrderDrafts = (
  products: NaverStoredProduct[],
  generatedAt: Date | null,
  now: Date,
  random: Random,
): NaverProductOrderDraft[] => {
  if (products.length === 0) return [];
  const windowStart = generatedAt ?? new Date(now.getTime() - FIRST_WINDOW_MS);
  return Array.from({ length: countOrdersToGenerate(generatedAt, now) }, () =>
    buildOrderDraft(pick(products, random), windowStart, now, random),
  );
};

/** 상품주문번호·주문번호. 겹치면 서비스가 1회 다시 만든다. */
export const createOrderNumber = (now: Date, random: Random): string => {
  const kstYmd = new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, '');
  return `${kstYmd}${String(randomInt(0, 99_999_999, random)).padStart(8, '0')}`;
};
