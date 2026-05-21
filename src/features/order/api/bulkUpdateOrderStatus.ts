import { OrderStatusTypes } from '../types/order.types';
import { updateOrder } from './updateOrder';

export const bulkUpdateOrderStatus = async (orderNumbers: string[], orderStatus: OrderStatusTypes): Promise<void> => {
  await Promise.all(orderNumbers.map((orderNumber) => updateOrder(orderNumber, { orderStatus })));
};
