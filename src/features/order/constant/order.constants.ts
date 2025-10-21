import { OrderStatus } from '../types/order.types';

export const ALL_ORDER_STATUS = {
  id: 'ALL',
  name: '전체',
} as const;

export const ORDER_STATUS: OrderStatus[] = [
  {
    id: 'NEW_ORDER',
    name: '신규주문',
  },
  {
    id: 'CONFIRMED_ORDER',
    name: '발주확인',
  },
  {
    id: 'INVOICE_REGISTERED',
    name: '송장등록',
  },
  {
    id: 'INVOICE_SENT',
    name: '송장전송완료',
  },
];
