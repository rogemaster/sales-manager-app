import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { OptionCombination, Product } from '@/features/products/types/product.types';
import { DELIVERY_TYPE_OPTION, DeliveryTypeId } from '@/shared/constant/delivery.constant';
import { ORDER_SAMPLE_ADDRESSES, ORDER_SAMPLE_MEMOS, ORDER_SAMPLE_NAMES } from '../constant/orderSamples.constant';
import { CollectingAccount, formatOptionValues, OrderInsert } from './naverOrderTranslate';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 시뮬레이터가 없는 몰(네이버 외)의 "그사이 들어온 주문". 그 계정으로 연동에 성공한 판매중 상품에서만 만든다(스펙 결정 4).
 * now와 난수를 주입받는 순수 함수다.
 */
export type Random = () => number;

export const RANDOM_ORDER_INTERVAL_MINUTES = 30;
export const RANDOM_ORDER_MAX = 5;

const MINUTE_MS = 60_000;
const FIRST_WINDOW_MS = 24 * 60 * MINUTE_MS;
const DELIVERY_TYPE_IDS = DELIVERY_TYPE_OPTION.map(({ id }) => id);

export const countRandomOrders = (generatedAt: Date | null, now: Date): number => {
  if (generatedAt === null) return RANDOM_ORDER_MAX;
  const elapsedMinutes = (now.getTime() - generatedAt.getTime()) / MINUTE_MS;
  return Math.max(0, Math.min(RANDOM_ORDER_MAX, Math.floor(elapsedMinutes / RANDOM_ORDER_INTERVAL_MINUTES)));
};

export interface RandomOrderSource {
  /** 몰 상품코드(연동 건의 externalProductId), 없으면 우리 상품ID */
  shopProductId: string;
  name: string;
  price: number;
  deliveryType: DeliveryTypeId;
  deliveryPrice: number;
  options: OptionCombination[];
}

/** 연동 건 스냅샷 → 생성 재료. 배송 유형이 코드값이 아니면(옛 데이터) 쓰지 않는다. */
export const toRandomOrderSource = (product: Product, externalProductId: string | null): RandomOrderSource | null => {
  if (!DELIVERY_TYPE_IDS.includes(product.deliveryType)) return null;
  return {
    shopProductId: externalProductId || product.productId,
    name: product.name,
    price: product.price,
    deliveryType: product.deliveryType as DeliveryTypeId,
    deliveryPrice: product.deliveryPrice,
    options: product.option ?? [],
  };
};

/** 수집 기간 [start, endExclusive)과 [마지막 생성(처음이면 지금−24h), 지금]의 교집합. 비면 null — 고른 기간 밖 주문을 만들지 않는다. */
export const resolvePaymentWindow = (
  period: { start: Date; endExclusive: Date },
  generatedAt: Date | null,
  now: Date,
): { from: Date; to: Date } | null => {
  const from = Math.max(period.start.getTime(), (generatedAt ?? new Date(now.getTime() - FIRST_WINDOW_MS)).getTime());
  const to = Math.min(period.endExclusive.getTime(), now.getTime());
  return from < to ? { from: new Date(from), to: new Date(to) } : null;
};

const pick = <T>(items: readonly T[], random: Random): T => items[Math.floor(random() * items.length)];
const randomInt = (min: number, max: number, random: Random): number => min + Math.floor(random() * (max - min + 1));
const randomTel = (random: Random): string =>
  `010-${String(randomInt(0, 9999, random)).padStart(4, '0')}-${String(randomInt(0, 9999, random)).padStart(4, '0')}`;

export const createShopOrderNumber = (now: Date, random: Random): string =>
  `${dayjs(now).tz('Asia/Seoul').format('YYYYMMDD')}${String(randomInt(0, 99_999_999, random)).padStart(8, '0')}`;

export const buildRandomOrders = (input: {
  sources: RandomOrderSource[];
  account: Pick<CollectingAccount, 'id' | 'ownerId' | 'mallCode' | 'mallId'>;
  generatedAt: Date | null;
  period: { start: Date; endExclusive: Date };
  now: Date;
  random: Random;
  newOrderNumber: () => string;
}): OrderInsert[] => {
  const { sources, account, generatedAt, period, now, random, newOrderNumber } = input;
  if (sources.length === 0) return [];
  const window = resolvePaymentWindow(period, generatedAt, now);
  if (!window) return [];

  return Array.from({ length: countRandomOrders(generatedAt, now) }, (): OrderInsert => {
    const source = pick(sources, random);
    const option = source.options.length > 0 ? pick(source.options, random) : null;
    const quantity = randomInt(1, 3, random);
    const unitPrice = source.price + (option?.optionPrice ?? 0);
    const deliveryPrice = source.deliveryType === 'FREE' ? 0 : source.deliveryPrice;
    const orderer = { name: pick(ORDER_SAMPLE_NAMES, random), tel: randomTel(random) };
    const payee = random() < 0.5 ? orderer : { name: pick(ORDER_SAMPLE_NAMES, random), tel: randomTel(random) };
    const address = pick(ORDER_SAMPLE_ADDRESSES, random);
    const span = window.to.getTime() - window.from.getTime();

    return {
      orderNumber: newOrderNumber(),
      ownerId: account.ownerId,
      shopOrderNumber: createShopOrderNumber(now, random),
      mallCode: account.mallCode,
      mallId: account.mallId,
      shoppingAccountId: account.id,
      shopProductId: source.shopProductId,
      orderProductName: source.name,
      orderPrice: unitPrice * quantity + deliveryPrice,
      orderTotalQuantity: quantity,
      orderOption: option ? formatOptionValues(option.values) : null,
      orderSubOption: null,
      orderSubTotalQuantity: null,
      orderDeliveryType: source.deliveryType,
      orderDeliveryPrice: deliveryPrice,
      paymentDate: new Date(window.from.getTime() + Math.floor(random() * span)),
      collectedAt: now,
      orderName: orderer.name,
      orderPhoneNumber: orderer.tel,
      orderZipCode: address.zipCode,
      orderAddress: address.baseAddress,
      orderDetailAddress: address.detailAddress,
      payeeName: payee.name,
      payeePhoneNumber: payee.tel,
      payeeZipCode: address.zipCode,
      payeeAddress: address.baseAddress,
      payeeDetailAddress: address.detailAddress,
      deliveryMessage: pick(ORDER_SAMPLE_MEMOS, random),
      orderStatus: 'NEW_ORDER',
      deliveryCompany: null,
      invoiceNumber: null,
      invoiceSentAt: null,
    };
  });
};
