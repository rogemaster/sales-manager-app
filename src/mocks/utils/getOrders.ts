import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Order, OrderSearchType } from '@/features/order/types/order.types';
import { MOCK_ORDERS_DATA } from '../data/MockOrdersData';

dayjs.extend(isBetween);

const filterByDate = (dateType: string, startDate: string, endDate: string, data: Order[]) => {
  const field = dateType === 'paymentDate' ? 'paymentDate' : 'orderCollectionDate';
  return data.filter((item) => dayjs(item[field]).isBetween(startDate, endDate, 'day', '[]'));
};

const filterByShoppingMall = (shoppingMall: string, data: Order[]) => {
  if (!shoppingMall || shoppingMall === 'ALL') return data;
  return data.filter((item) => item.shoppingMallName === shoppingMall);
};

const filterByMallAccountId = (mallAccountId: string, data: Order[]) => {
  if (!mallAccountId || mallAccountId === 'ALL') return data;
  return data.filter((item) => item.shoppingMallId === mallAccountId);
};

const filterByOrderStatus = (orderStatus: string, data: Order[]) => {
  if (!orderStatus || orderStatus === 'ALL') return data;
  return data.filter((item) => item.orderStatus === orderStatus);
};

const filterBySearchValue = (searchType: string, searchValue: string, data: Order[]) => {
  if (!searchValue) return data;
  const searchMap: Record<string, (item: Order) => string> = {
    orderName: (item) => item.orderName,
    payeeName: (item) => item.payeeName,
    orderProductName: (item) => item.orderProductName,
    orderNumber: (item) => item.orderNumber,
    shopOrderNumber: (item) => item.shopOrderNumber,
  };
  const getter = searchMap[searchType];
  if (!getter) return data;
  return data.filter((item) => getter(item).includes(searchValue));
};

export const getMockOrders = (filters: OrderSearchType, page: number, pageSize: number) => {
  const { dateType, startDate, endDate, shoppingMall, mallAccountId, orderStatus, searchType, searchValue } = filters;

  const byDate = filterByDate(dateType, startDate, endDate, MOCK_ORDERS_DATA);
  const byMall = filterByShoppingMall(shoppingMall, byDate);
  const byAccountId = filterByMallAccountId(mallAccountId, byMall);
  const byStatus = filterByOrderStatus(orderStatus, byAccountId);
  const filtered = filterBySearchValue(searchType, searchValue, byStatus);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const orders = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { orders, total, page, pageSize, totalPages };
};
