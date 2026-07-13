import { OrderDetail, OrderEditHistory } from '@/features/order/types/order.types';
import { MOCK_ORDERS_DATA } from '../data/MockOrdersData';
import { MOCK_ORDER_CLAIMS, MOCK_ORDER_HISTORIES, MOCK_ORDER_DETAIL_EXTRAS } from '../data/MockOrderExtrasData';

export const updateMockOrder = (orderId: string, update: Partial<OrderDetail>): OrderDetail | null => {
  const index = MOCK_ORDERS_DATA.findIndex((item) => item.orderNumber === orderId);
  if (index === -1) return null;

  const { claim: claimUpdate, orderDetailAddress, payeeDetailAddress, ...orderUpdate } = update;

  const changedFields = Object.keys(orderUpdate).filter(
    (key) =>
      JSON.stringify(orderUpdate[key as keyof typeof orderUpdate]) !==
      JSON.stringify(MOCK_ORDERS_DATA[index][key as keyof typeof orderUpdate]),
  );

  if (claimUpdate?.handlerNote !== undefined && MOCK_ORDER_CLAIMS[orderId]) {
    MOCK_ORDER_CLAIMS[orderId].handlerNote = claimUpdate.handlerNote;
    changedFields.push('claim.handlerNote');
  }

  if (orderDetailAddress !== undefined || payeeDetailAddress !== undefined) {
    MOCK_ORDER_DETAIL_EXTRAS[orderId] = {
      ...(MOCK_ORDER_DETAIL_EXTRAS[orderId] ?? {}),
      ...(orderDetailAddress !== undefined ? { orderDetailAddress } : {}),
      ...(payeeDetailAddress !== undefined ? { payeeDetailAddress } : {}),
    };
  }

  MOCK_ORDERS_DATA[index] = { ...MOCK_ORDERS_DATA[index], ...orderUpdate, ownerId: MOCK_ORDERS_DATA[index].ownerId };

  if (changedFields.length > 0) {
    if (!MOCK_ORDER_HISTORIES[orderId]) {
      MOCK_ORDER_HISTORIES[orderId] = [];
    }
    const newHistory: OrderEditHistory = {
      id: `history_${Date.now()}`,
      modifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      modifiedBy: '담당자',
      changedFields,
    };
    MOCK_ORDER_HISTORIES[orderId].push(newHistory);
  }

  return { ...MOCK_ORDERS_DATA[index], ...(MOCK_ORDER_DETAIL_EXTRAS[orderId] ?? {}) };
};
