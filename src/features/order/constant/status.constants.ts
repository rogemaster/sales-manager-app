import { OrderStatus } from '../types/order.types';

export const ALL_ORDER_STATUS = {
  id: 'ALL',
  name: '전체',
} as const;

// 주문처리: 신규주문 -> 발주확인 -> 송장등록 -> 송장전송완료
// 취소처리: 취소요청 -> 취소처리중 -> 취소완료
// 교환처리: 교환요청 -> 교환처리중 -> 교환완료
// 반품처리: 반품요청 -> 반품처리중 -> 반품완료

// 주문처리상태
export const ORDER_STATUS_TYPE: OrderStatus[] = [
  {
    id: 'NEW_ORDER',
    name: '신규주문',
  },
  {
    id: 'CONFIRMED_ORDER',
    name: '발주확인',
  },
  {
    id: 'INVOICE_REGISTER',
    name: '송장등록',
  },
  {
    id: 'INVOICE_COMPLETE',
    name: '송장전송완료',
  },
];

// 주문취소상태
export const ORDER_CANCEL_STATUS_TYPE: OrderStatus[] = [
  {
    id: 'REQUEST_CANCEL',
    name: '취소요청',
  },
  {
    id: 'PROGRESS_CANCEL',
    name: '취소처리중',
  },
  {
    id: 'COMPLETE_CANCEL',
    name: '취소완료',
  },
];

// 교환처리상태
export const ORDER_EXCHANGE_STATUS_TYPE: OrderStatus[] = [
  {
    id: 'REQUEST_EXCHANGE',
    name: '교환요청',
  },
  {
    id: 'PROGRESS_EXCHANGE',
    name: '교환처리중',
  },
  {
    id: 'COMPLETE_EXCHANGE',
    name: '교환완료',
  },
];

// 반품처리상태
export const ORDER_RETURN_STATUS_TYPE: OrderStatus[] = [
  {
    id: 'REQUEST_RETURN',
    name: '반품요청',
  },
  {
    id: 'PROGRESS_RETURN',
    name: '반품처리중',
  },
  {
    id: 'COMPLETE_RETURN',
    name: '반품완료',
  },
];

export const ORDER_STATUS: OrderStatus[] = [
  ...ORDER_STATUS_TYPE,
  ...ORDER_CANCEL_STATUS_TYPE,
  ...ORDER_EXCHANGE_STATUS_TYPE,
  ...ORDER_RETURN_STATUS_TYPE,
];
