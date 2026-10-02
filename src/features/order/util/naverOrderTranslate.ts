import { z } from 'zod';
import type { orders } from '@/db/schema';
import { DeliveryTypeId } from '@/shared/constant/delivery.constant';
import { ShoppingMalls } from '@/types/common.type';
import { OrderStatusTypes } from '../types/order.types';

/**
 * 네이버(시뮬레이터) 변경 주문 조회 응답. HTTP로 받은 외부 데이터라 모양부터 검증한다.
 * 시뮬레이터 타입을 import하지 않는다 — import가 막혀 있는 것이 곧 네트워크 경계다.
 * 상태 값은 문자열로 받는다. 모르는 상태(클레임 등)는 모양 오류가 아니라 번역 실패로 다룬다.
 */
const isoTime = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), '시각 형식이 아닙니다.');
const party = z.object({ name: z.string(), tel: z.string() });

const naverProductOrderSchema = z.object({
  productOrderId: z.string().min(1),
  orderId: z.string(),
  productOrderStatus: z.string(),
  placeOrderStatus: z.string(),
  paymentDate: isoTime,
  lastChangedDate: isoTime,
  productNo: z.number(),
  productName: z.string(),
  optionValues: z.record(z.string()).nullable(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  totalPaymentAmount: z.number(),
  deliveryFeeType: z.string(),
  deliveryFeeAmount: z.number(),
  orderer: party,
  shippingAddress: party.extend({ zipCode: z.string(), baseAddress: z.string(), detailAddress: z.string() }),
  shippingMemo: z.string().nullable(),
  delivery: z.object({ deliveryCompany: z.string(), trackingNumber: z.string(), dispatchedDate: isoTime }).nullable(),
  claim: z.null(),
});

export const naverProductOrderPageSchema = z.object({
  productOrders: z.array(naverProductOrderSchema),
  nextCursor: z.string().nullable(),
});

export type NaverProductOrder = z.infer<typeof naverProductOrderSchema>;
export type NaverProductOrderPage = z.infer<typeof naverProductOrderPageSchema>;
export type OrderInsert = typeof orders.$inferInsert;

export interface CollectingAccount {
  id: string;
  ownerId: string;
  mallCode: ShoppingMalls;
  mallId: string;
  apiKey: string;
}

export type TranslateResult = { ok: true; order: OrderInsert } | { ok: false; message: string };

export const UNKNOWN_ORDER_STATUS_MESSAGE = '알 수 없는 주문 상태입니다.';
export const UNKNOWN_DELIVERY_FEE_TYPE_MESSAGE = '알 수 없는 배송비 유형입니다.';

const DELIVERY_TYPE_FROM_NAVER: Record<string, DeliveryTypeId> = {
  FREE: 'FREE',
  PAID: 'NOT_FREE',
  CONDITIONAL_FREE: 'CONDITIONAL_FREE',
  CHARGE_RECEIVED: 'CHARGE_RECEIVED',
};

export const formatOptionValues = (values: Record<string, string> | null): string | null => {
  const entries = Object.entries(values ?? {});
  return entries.length > 0 ? entries.map(([key, value]) => `${key}: ${value}`).join(' / ') : null;
};

type ResolvedStatus = {
  orderStatus: OrderStatusTypes;
  deliveryCompany: string | null;
  invoiceNumber: string | null;
  invoiceSentAt: Date | null;
};

const NO_INVOICE = { deliveryCompany: null, invoiceNumber: null, invoiceSentAt: null };

const resolveStatus = (order: NaverProductOrder): ResolvedStatus | null => {
  if (order.productOrderStatus === 'PAYED' && order.placeOrderStatus === 'NOT_YET') {
    return { orderStatus: 'NEW_ORDER', ...NO_INVOICE };
  }
  if (order.productOrderStatus === 'PAYED' && order.placeOrderStatus === 'OK') {
    return { orderStatus: 'CONFIRMED_ORDER', ...NO_INVOICE };
  }
  if (order.productOrderStatus === 'DELIVERING' && order.delivery) {
    return {
      orderStatus: 'INVOICE_COMPLETE',
      deliveryCompany: order.delivery.deliveryCompany,
      invoiceNumber: order.delivery.trackingNumber,
      invoiceSentAt: new Date(order.delivery.dispatchedDate),
    };
  }
  return null;
};

const toNullable = (value: string | null): string | null => (value ? value : null);

/**
 * 네이버 상품주문 1건 → 우리 주문 1행. 쇼핑몰주문번호는 productOrderId다 — 중복 판정 키이고
 * 라운드 4 발송처리도 이 번호를 쓴다. 네이버 응답에 주문자 주소가 없어 배송지로 채운다(우리 컬럼이 필수).
 */
export const toOrderFromNaver = (
  order: NaverProductOrder,
  account: Pick<CollectingAccount, 'id' | 'ownerId' | 'mallCode' | 'mallId'>,
  orderNumber: string,
  now: Date,
): TranslateResult => {
  const status = resolveStatus(order);
  if (!status) return { ok: false, message: UNKNOWN_ORDER_STATUS_MESSAGE };
  const deliveryType = DELIVERY_TYPE_FROM_NAVER[order.deliveryFeeType];
  if (!deliveryType) return { ok: false, message: UNKNOWN_DELIVERY_FEE_TYPE_MESSAGE };

  const { shippingAddress: to } = order;
  return {
    ok: true,
    order: {
      orderNumber,
      ownerId: account.ownerId,
      shopOrderNumber: order.productOrderId,
      mallCode: account.mallCode,
      mallId: account.mallId,
      // 라운드 4 — 발주확인·송장전송이 이 계정으로 몰을 부른다.
      shoppingAccountId: account.id,
      shopProductId: String(order.productNo),
      orderProductName: order.productName,
      // 라벨 "총주문금액(실결제가)" — 배송비를 포함한 결제 금액이다.
      orderPrice: order.totalPaymentAmount,
      orderTotalQuantity: order.quantity,
      orderOption: formatOptionValues(order.optionValues),
      orderSubOption: null,
      orderSubTotalQuantity: null,
      orderDeliveryType: deliveryType,
      orderDeliveryPrice: order.deliveryFeeAmount,
      paymentDate: new Date(order.paymentDate),
      collectedAt: now,
      orderName: order.orderer.name,
      orderPhoneNumber: order.orderer.tel,
      orderZipCode: to.zipCode,
      orderAddress: to.baseAddress,
      orderDetailAddress: toNullable(to.detailAddress),
      payeeName: to.name,
      payeePhoneNumber: to.tel,
      payeeZipCode: to.zipCode,
      payeeAddress: to.baseAddress,
      payeeDetailAddress: toNullable(to.detailAddress),
      deliveryMessage: toNullable(order.shippingMemo),
      ...status,
    },
  };
};
