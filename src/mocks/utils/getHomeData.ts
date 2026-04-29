import dayjs from 'dayjs';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { HomeStats, RecentProduct } from '@/features/home/types/home.types';

export const getMockHomeStats = (): HomeStats => {
  const total = MOCK_PRODUCT_DATA.length;
  const onSale = MOCK_PRODUCT_DATA.filter((p) => p.state === 'ON_SALE').length;
  const soldOut = MOCK_PRODUCT_DATA.filter((p) => p.state === 'SOLD_OUT').length;
  const saleDis = MOCK_PRODUCT_DATA.filter((p) => p.state === 'SALE_DIS').length;
  const waitSale = MOCK_PRODUCT_DATA.filter((p) => p.state === 'WAIT_SALE').length;

  return { total, onSale, soldOut, saleDis, waitSale };
};

export const getMockRecentProducts = (): RecentProduct[] => {
  return [...MOCK_PRODUCT_DATA]
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
