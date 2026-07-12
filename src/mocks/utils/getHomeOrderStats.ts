import { HomeOrderStats } from '@/features/home/types/home.types';
import { OrderStatusTypes } from '@/features/order/types/order.types';
import { MOCK_ORDERS_DATA } from '../data/MockOrdersData';

export const getMockHomeOrderStats = (ownerId: string, startDate: string, endDate: string): HomeOrderStats => {
  const owned = MOCK_ORDERS_DATA.filter((o) => o.ownerId === ownerId);
  const filtered = owned.filter((o) => {
    const date = o.orderCollectionDate.split(' ')[0];
    return date >= startDate && date <= endDate;
  });

  const count = (...statuses: OrderStatusTypes[]) =>
    filtered.filter((o) => statuses.includes(o.orderStatus)).length;

  return {
    newOrder: count('NEW_ORDER'),
    confirmedOrder: count('CONFIRMED_ORDER'),
    invoice: count('INVOICE_REGISTER', 'INVOICE_COMPLETE'),
    cancelClaim: count('REQUEST_CANCEL', 'PROGRESS_CANCEL'),
    returnClaim: count('REQUEST_RETURN', 'PROGRESS_RETURN'),
    exchangeClaim: count('REQUEST_EXCHANGE', 'PROGRESS_EXCHANGE'),
  };
};
