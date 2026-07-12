import dayjs from 'dayjs';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { HomeStats, RecentProduct } from '@/features/home/types/home.types';

export const getMockHomeStats = (ownerId: string): HomeStats => {
  const owned = MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId);
  const total = owned.length;
  const onSale = owned.filter((p) => p.state === 'ON_SALE').length;
  const soldOut = owned.filter((p) => p.state === 'SOLD_OUT').length;
  const saleDis = owned.filter((p) => p.state === 'SALE_DIS').length;
  const waitSale = owned.filter((p) => p.state === 'WAIT_SALE').length;

  return { total, onSale, soldOut, saleDis, waitSale };
};

export const getMockRecentProducts = (ownerId: string): RecentProduct[] => {
  return MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId)
    .sort((a, b) => dayjs(b.createDate).valueOf() - dayjs(a.createDate).valueOf())
    .slice(0, 5)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      price: p.price,
      state: p.state,
      createDate: dayjs(p.createDate).format('YYYY-MM-DD'),
    }));
};
